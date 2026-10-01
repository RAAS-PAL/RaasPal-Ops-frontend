'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { AlertTriangle, CalendarClock, CheckCircle2, Loader2, Undo2 } from 'lucide-react';
import { StatusBadge } from '@/components/ui/status-badge';
import type { UndoNotice } from '@/components/pm/PmPlanHistoryDialog';
import { pmApi } from '@/lib/api';
import { flash } from '@/lib/pm/focus';
import { sendWithCompletedCheck } from '@/lib/pm/move';
import { isNearDue, PM_STATUS_LABEL_KEY, PM_STATUS_TONE, rowStatus } from '@/lib/pm/status';
import type { PmMonthResponse, PmMonthRow } from '@/lib/pm/types';

/**
 * The month list (spec section 7): every visit in the selected range, one row each.
 *
 * Sorted by the backend on plan date then geography, so the reading order is also
 * the order a week would be driven.
 *
 * Also where a visit is moved. Each row's Move opens a date picker in the table;
 * the date goes to monday first, with the checks every planner write has. A moved
 * row stays where it is, showing its new date and an Undo, rather than vanishing
 * from under the pointer.
 *
 * Arriving from a grid square, the list is told which site was clicked: its rows
 * are scrolled to the middle of the screen and lit up briefly, so the one visit the
 * person came for stands out among the whole week.
 */

const COLUMNS = 8;

export function PmMonthView({
  data,
  locale,
  focus,
  onFocused,
  askCompleted,
  onMoved,
  onUndo,
}: {
  data: PmMonthResponse;
  locale: string;
  /** The site whose rows to point at. A new token points again. */
  focus?: { contractId: string; token: number } | null;
  onFocused?: () => void;
  /** The extra step before changing a visit monday shows as completed. */
  askCompleted: (visitName: string) => Promise<boolean>;
  /** monday took a new date (a move, or an undo of one). */
  onMoved: (visit: PmMonthRow, planDate: string | null) => void;
  onUndo: (changeId: string, visitName: string | null) => Promise<UndoNotice | null>;
}) {
  const t = useTranslations('pmPlanning');
  const tableRef = useRef<HTMLTableElement>(null);
  const today = new Date();
  const dateFormat = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', weekday: 'short' });

  useEffect(() => {
    if (!focus) return;
    const rows = tableRef.current?.querySelectorAll<HTMLElement>(`tr[data-contract="${focus.contractId}"]`);
    if (rows && rows.length > 0) {
      rows[0].scrollIntoView({ block: 'center' });
      rows.forEach((row) => flash(row, 'pm-focus-row'));
    }
    onFocused?.();
  }, [focus, onFocused]);

  if (data.rows.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-[var(--app-border)] p-8 text-center text-sm text-[var(--app-muted)]">
        {t('empty')}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--app-border)]">
      <table ref={tableRef} className="w-full min-w-[68rem] border-collapse text-sm">
        <thead>
          <tr className="bg-[var(--app-panel-soft)] text-left text-xs uppercase text-[var(--app-muted)]">
            <th scope="col" className="px-3 py-2 font-semibold">{t('table.date')}</th>
            <th scope="col" className="px-3 py-2 font-semibold">{t('table.visit')}</th>
            <th scope="col" className="px-3 py-2 font-semibold">{t('table.site')}</th>
            <th scope="col" className="px-3 py-2 font-semibold">{t('table.geography')}</th>
            <th scope="col" className="px-3 py-2 font-semibold">{t('table.robot')}</th>
            <th scope="col" className="px-3 py-2 font-semibold">{t('table.engineer')}</th>
            <th scope="col" className="px-3 py-2 font-semibold">{t('table.status')}</th>
            <th scope="col" className="px-3 py-2">
              <span className="sr-only">{t('move.save')}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row) => (
            <VisitRow
              key={row.visitId}
              row={row}
              range={data.from && data.to ? { from: data.from, to: data.to } : null}
              today={today}
              dateFormat={dateFormat}
              locale={locale}
              askCompleted={askCompleted}
              onMoved={onMoved}
              onUndo={onUndo}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

type Mode =
  | { kind: 'view' }
  | { kind: 'editing' }
  | { kind: 'moved'; date: string | null; changeId: string | null }
  | { kind: 'changedOnMonday'; date: string | null };

function VisitRow({
  row,
  range,
  today,
  dateFormat,
  locale,
  askCompleted,
  onMoved,
  onUndo,
}: {
  row: PmMonthRow;
  range: { from: string; to: string } | null;
  today: Date;
  dateFormat: Intl.DateTimeFormat;
  locale: string;
  askCompleted: (visitName: string) => Promise<boolean>;
  onMoved: (visit: PmMonthRow, planDate: string | null) => void;
  onUndo: (changeId: string, visitName: string | null) => Promise<UndoNotice | null>;
}) {
  const t = useTranslations('pmPlanning');
  const tc = useTranslations('common');
  const [mode, setMode] = useState<Mode>({ kind: 'view' });
  const [date, setDate] = useState(row.planDate ?? '');
  const [notice, setNotice] = useState<UndoNotice | null>(null);
  const [undoing, setUndoing] = useState(false);
  const status = rowStatus(row);
  const nearDue = isNearDue(row, today);
  const completed = row.statusBucket === 'COMPLETED';
  const visitName = row.visitName ?? '—';

  const formatDay = (value: string | null) =>
    value
      ? new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(
          new Date(`${value}T00:00:00`),
        )
      : t('table.noPlanDate');

  const move = useMutation({
    mutationFn: () =>
      sendWithCompletedCheck(
        (confirmCompleted) =>
          pmApi.movePlanDate(row.visitId, date, row.planDate, confirmCompleted).then((response) => response.data.data),
        () => askCompleted(visitName),
        completed,
      ),
    onMutate: () => setNotice(null),
    onSuccess: (result) => {
      if (!result) return; // said no to changing a completed visit
      if (result.outcome === 'MOVED') {
        setMode({ kind: 'moved', date: result.planDate, changeId: result.changeId });
        onMoved(row, result.planDate);
      } else if (result.outcome === 'CHANGED_ON_MONDAY') {
        setMode({ kind: 'changedOnMonday', date: result.planDate });
        onMoved(row, result.planDate);
      } else {
        setNotice({ tone: 'info', text: t('move.unchanged') });
      }
    },
    onError: (error) => {
      const reason = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setNotice({ tone: 'error', text: reason ? t('move.failedBecause', { reason }) : t('move.failed') });
    },
  });

  const undo = async () => {
    if (mode.kind !== 'moved' || !mode.changeId) return;
    setUndoing(true);
    try {
      const result = await onUndo(mode.changeId, row.visitName);
      if (!result) return;
      if (result.done) {
        setMode({ kind: 'view' });
        setDate(result.planDate ?? row.planDate ?? '');
        setNotice({ tone: 'info', text: result.text });
        onMoved(row, result.planDate ?? null);
      } else {
        setNotice(result);
      }
    } finally {
      setUndoing(false);
    }
  };

  // Moved out of the range on screen: still listed, but quieter, so it reads as gone.
  const movedAway =
    mode.kind === 'moved' && range != null && (mode.date == null || mode.date < range.from || mode.date > range.to);
  const showDetail = mode.kind !== 'view' || notice != null;

  return (
    <Fragment>
      <tr
        data-contract={row.contractId}
        data-keep-anchor={`visit-${row.visitId}`}
        className={`border-t border-[var(--app-border)] align-top hover:bg-[var(--app-panel-alt)] ${movedAway ? 'opacity-50' : ''}`}
      >
        <td className="whitespace-nowrap px-3 py-2">
          {row.planDate ? (
            <>
              <span className="font-semibold">{dateFormat.format(new Date(`${row.planDate}T00:00:00`))}</span>
              {row.timeText && <span className="block text-xs text-[var(--app-muted)]">{row.timeText}</span>}
            </>
          ) : (
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">{t('table.noPlanDate')}</span>
          )}
        </td>

        <td className="px-3 py-2">
          <span className="block max-w-[18rem] truncate" title={row.visitName ?? undefined}>
            {visitName}
          </span>
          <span className="text-xs text-[var(--app-muted)]">{row.serviceLine}</span>
        </td>

        <td className="px-3 py-2">
          <span className="block max-w-[18rem] truncate font-semibold" title={row.contractName ?? undefined}>
            {row.contractName ?? row.customerName ?? '—'}
          </span>
          {row.project && (
            <span className="block max-w-[18rem] truncate text-xs text-[var(--app-muted)]">{row.project}</span>
          )}
        </td>

        <td className="px-3 py-2 text-xs">
          <span className="block">{row.province ?? '—'}</span>
          <span className="block text-[var(--app-muted)]">{row.region ?? '—'}</span>
        </td>

        <td className="px-3 py-2 text-xs">
          <span className="block">{row.robotModel ?? '—'}</span>
          {row.robotCount != null && <span className="block text-[var(--app-muted)]">×{row.robotCount}</span>}
        </td>

        <td className="px-3 py-2 text-xs">{row.ownerNames ?? '—'}</td>

        <td className="whitespace-nowrap px-3 py-2">
          <StatusBadge tone={PM_STATUS_TONE[status]}>{t(`status.${PM_STATUS_LABEL_KEY[status]}`)}</StatusBadge>
          {row.daysOverdue != null && (
            <span className="mt-1 block text-xs font-semibold text-red-600 dark:text-red-400">
              {t('table.daysLate', { days: row.daysOverdue })}
            </span>
          )}
          {nearDue && (
            <span className="mt-1 block text-xs font-semibold text-orange-600 dark:text-orange-400">
              {t('table.dueSoon')}
            </span>
          )}
        </td>

        <td className="whitespace-nowrap px-3 py-2 text-right">
          {mode.kind === 'view' && (
            <button
              type="button"
              onClick={() => {
                setDate(row.planDate ?? '');
                setNotice(null);
                setMode({ kind: 'editing' });
              }}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--app-border)] px-2.5 text-xs font-semibold text-[var(--app-text)] transition hover:border-[var(--app-brand)]"
            >
              <CalendarClock className="h-3.5 w-3.5" />
              {t('move.save')}
            </button>
          )}
        </td>
      </tr>

      {showDetail && (
        <tr data-contract={row.contractId} className={movedAway ? 'opacity-50' : ''}>
          <td colSpan={COLUMNS} className="bg-[var(--app-panel-alt)] px-3 py-2.5">
            {mode.kind === 'editing' && (
              <form
                className="flex flex-wrap items-end gap-x-3 gap-y-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (date && date !== row.planDate) move.mutate();
                }}
              >
                <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--app-muted)]">
                  {t('move.newDate')}
                  <input
                    type="date"
                    value={date}
                    required
                    autoFocus
                    onChange={(e) => setDate(e.target.value)}
                    className="h-9 rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)] px-2 text-sm font-normal text-[var(--app-text)] outline-none focus:border-[var(--app-brand)]"
                  />
                </label>
                <button
                  type="submit"
                  disabled={move.isPending || !date || date === row.planDate}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--app-brand)] px-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                >
                  {move.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  {move.isPending ? t('move.saving') : t('move.save')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode({ kind: 'view' });
                    setNotice(null);
                  }}
                  disabled={move.isPending}
                  className="h-9 rounded-lg border border-[var(--app-border)] px-3 text-sm font-semibold text-[var(--app-text)] transition hover:bg-[var(--app-faint)] disabled:opacity-50"
                >
                  {tc('cancel')}
                </button>
                <span className="text-xs text-[var(--app-muted)]">
                  {completed ? t('move.completedHint') : t('move.writesMonday')}
                </span>
              </form>
            )}

            {mode.kind === 'moved' && (
              <p className="flex flex-wrap items-center gap-3 text-sm">
                <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  {t('move.movedTo', { date: formatDay(mode.date) })}
                </span>
                {mode.changeId && (
                  <button
                    type="button"
                    onClick={() => void undo()}
                    disabled={undoing}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--app-brand-dark)] hover:underline disabled:opacity-50"
                  >
                    {undoing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Undo2 className="h-3.5 w-3.5" />}
                    {undoing ? t('move.undoing') : t('move.undo')}
                  </button>
                )}
              </p>
            )}

            {mode.kind === 'changedOnMonday' && (
              <p className="flex items-center gap-1.5 text-sm text-amber-800 dark:text-amber-300">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {t('move.changedOnMonday', { visit: visitName, date: formatDay(mode.date) })}
              </p>
            )}

            {notice && (
              <p
                className={`mt-1 text-xs ${
                  notice.tone === 'error'
                    ? 'text-red-600 dark:text-red-400'
                    : notice.tone === 'warn'
                      ? 'text-amber-700 dark:text-amber-400'
                      : 'text-[var(--app-muted)]'
                }`}
              >
                {notice.text}
              </p>
            )}
          </td>
        </tr>
      )}
    </Fragment>
  );
}
