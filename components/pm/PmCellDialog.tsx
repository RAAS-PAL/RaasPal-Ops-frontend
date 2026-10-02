'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { AlertTriangle, CalendarRange, CheckCircle2, Loader2, Undo2, X } from 'lucide-react';
import { StatusBadge } from '@/components/ui/status-badge';
import type { UndoNotice } from '@/components/pm/PmPlanHistoryDialog';
import { pmApi } from '@/lib/api';
import { sendWithCompletedCheck } from '@/lib/pm/move';
import { iso, isoWeekMonday, weekRangeLabel } from '@/lib/pm/params';
import { PM_STATUS_LABEL_KEY, PM_STATUS_TONE, rowStatus } from '@/lib/pm/status';
import type { PmMonthRow, PmYearRow } from '@/lib/pm/types';

/**
 * One square of the 52-week grid, opened in place: that site's visits in that week,
 * each of which can be moved without leaving the grid. "See all sites this week"
 * opens the week list instead, pointed at this site, with a way back to the grid.
 *
 * Moving writes the Plan date on the monday subitem, as every planner write does, and
 * a completed visit asks first. A moved visit stays listed with its new date and an
 * Undo; the list behind is left as it is while the panel is open, so the result does
 * not vanish from under the pointer. The visits come from the same range query the
 * week list uses, with the same filters, so the panel lists exactly what the square
 * counted.
 */

export function PmCellDialog({
  row,
  year,
  week,
  filters,
  locale,
  askCompleted,
  onClose,
  onSeeWeek,
  onMoved,
  onUndo,
}: {
  row: PmYearRow;
  year: number;
  week: number;
  filters: Record<string, string>;
  locale: string;
  /** The extra step before changing a visit monday shows as completed. */
  askCompleted: (visitName: string) => Promise<boolean>;
  onClose: () => void;
  onSeeWeek: () => void;
  /** monday took a new date (a move, or an undo of one). */
  onMoved: (visit: PmMonthRow, planDate: string | null) => void;
  onUndo: (changeId: string, visitName: string | null) => Promise<UndoNotice | null>;
}) {
  const t = useTranslations('pmPlanning');

  const monday = isoWeekMonday(year, week);
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  const from = iso(monday);
  const to = iso(sunday);

  const visits = useQuery({
    queryKey: ['pm-cell', row.contractId, from, to, filters],
    queryFn: () =>
      pmApi
        .range(from, to, filters)
        .then((response) => response.data.data.rows.filter((visit) => visit.contractId === row.contractId)),
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // A confirmation open on top closes first; it handles its own Escape.
      if (e.key === 'Escape' && !document.querySelector('[role=alertdialog]')) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const formatDate = (value: string | null) =>
    value
      ? new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(
          new Date(`${value}T00:00:00`),
        )
      : t('table.noPlanDate');

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pm-cell-title"
          className="flex max-h-[85vh] w-full max-w-xl flex-col rounded-2xl border border-[var(--app-border)] bg-[var(--app-panel)] shadow-2xl"
        >
          <div className="flex items-start gap-3 border-b border-[var(--app-border)] px-5 py-4">
            <div className="min-w-0 flex-1">
              <p id="pm-cell-title" className="truncate text-base font-bold text-[var(--app-text)]">
                {row.name ?? row.customerName ?? '—'}
              </p>
              <p className="text-xs text-[var(--app-muted)]">
                {t('move.cellSubtitle', { week, range: weekRangeLabel(year, week, locale) })}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={t('move.close')}
              className="rounded-lg p-1.5 text-[var(--app-muted)] transition hover:bg-[var(--app-faint)] hover:text-[var(--app-text)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
            {visits.isPending && (
              <p className="flex items-center gap-2 text-sm text-[var(--app-muted)]">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('move.loading')}
              </p>
            )}
            {visits.isError && <p className="text-sm text-red-600 dark:text-red-400">{t('loadFailed')}</p>}
            {visits.data?.length === 0 && <p className="text-sm text-[var(--app-muted)]">{t('move.noneThisWeek')}</p>}

            {visits.data?.map((visit) => (
              <CellVisit
                key={visit.visitId}
                visit={visit}
                formatDate={formatDate}
                askCompleted={askCompleted}
                onMoved={onMoved}
                onUndo={onUndo}
              />
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--app-border)] px-5 py-3">
            <p className="text-xs text-[var(--app-muted)]">{t('move.writesMonday')}</p>
            <button
              type="button"
              onClick={onSeeWeek}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--app-border)] px-3 text-sm font-semibold text-[var(--app-text)] transition hover:border-[var(--app-brand)]"
            >
              <CalendarRange className="h-4 w-4" />
              {t('move.seeWeek')}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

type Mode =
  | { kind: 'view' }
  | { kind: 'moved'; date: string | null; changeId: string | null }
  | { kind: 'changedOnMonday'; date: string | null };

function CellVisit({
  visit,
  formatDate,
  askCompleted,
  onMoved,
  onUndo,
}: {
  visit: PmMonthRow;
  formatDate: (value: string | null) => string;
  askCompleted: (visitName: string) => Promise<boolean>;
  onMoved: (visit: PmMonthRow, planDate: string | null) => void;
  onUndo: (changeId: string, visitName: string | null) => Promise<UndoNotice | null>;
}) {
  const t = useTranslations('pmPlanning');
  const [date, setDate] = useState(visit.planDate ?? '');
  const [mode, setMode] = useState<Mode>({ kind: 'view' });
  const [notice, setNotice] = useState<UndoNotice | null>(null);
  const [undoing, setUndoing] = useState(false);
  const status = rowStatus(visit);
  const completed = visit.statusBucket === 'COMPLETED';
  const visitName = visit.visitName ?? '—';

  const move = useMutation({
    mutationFn: () =>
      sendWithCompletedCheck(
        (confirmCompleted) =>
          pmApi
            .movePlanDate(visit.visitId, date, visit.planDate, confirmCompleted)
            .then((response) => response.data.data),
        () => askCompleted(visitName),
        completed,
      ),
    onMutate: () => setNotice(null),
    onSuccess: (result) => {
      if (!result) return; // said no to changing a completed visit
      if (result.outcome === 'MOVED') {
        setMode({ kind: 'moved', date: result.planDate, changeId: result.changeId });
        onMoved(visit, result.planDate);
      } else if (result.outcome === 'CHANGED_ON_MONDAY') {
        setMode({ kind: 'changedOnMonday', date: result.planDate });
        onMoved(visit, result.planDate);
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
      const result = await onUndo(mode.changeId, visit.visitName);
      if (!result) return;
      if (result.done) {
        setMode({ kind: 'view' });
        setDate(result.planDate ?? visit.planDate ?? '');
        onMoved(visit, result.planDate ?? null);
      }
      setNotice(result);
    } finally {
      setUndoing(false);
    }
  };

  return (
    <div className="rounded-xl border border-[var(--app-border)] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[var(--app-text)]" title={visit.visitName ?? undefined}>
            {visitName}
          </p>
          <p className="text-xs text-[var(--app-muted)]">
            {[formatDate(visit.planDate), visit.itemId && t('table.itemIdValue', { id: visit.itemId }), visit.ownerNames]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
        <StatusBadge tone={PM_STATUS_TONE[status]}>{t(`status.${PM_STATUS_LABEL_KEY[status]}`)}</StatusBadge>
      </div>

      {mode.kind === 'view' && (
        <>
          {completed && <p className="mt-2 text-xs text-[var(--app-muted)]">{t('move.completedHint')}</p>}
          <form
            className="mt-3 flex flex-wrap items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (date && date !== visit.planDate) move.mutate();
            }}
          >
            <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--app-muted)]">
              {t('move.newDate')}
              <input
                type="date"
                value={date}
                required
                onChange={(e) => setDate(e.target.value)}
                className="h-9 rounded-lg border border-[var(--app-border)] bg-[var(--app-panel-alt)] px-2 text-sm font-normal text-[var(--app-text)] outline-none focus:border-[var(--app-brand)]"
              />
            </label>
            <button
              type="submit"
              disabled={move.isPending || !date || date === visit.planDate}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--app-brand)] px-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {move.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {move.isPending ? t('move.saving') : t('move.save')}
            </button>
          </form>
        </>
      )}

      {mode.kind === 'moved' && (
        <p className="mt-3 flex flex-wrap items-center gap-3 text-sm">
          <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            {t('move.movedTo', { date: formatDate(mode.date) })}
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
        <p className="mt-3 flex items-start gap-1.5 text-sm text-amber-800 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {t('move.changedOnMonday', { visit: visitName, date: formatDate(mode.date) })}
        </p>
      )}

      {notice && (
        <p
          className={`mt-2 text-xs ${
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
    </div>
  );
}
