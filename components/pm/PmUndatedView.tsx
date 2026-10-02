'use client';

import { useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { AlertTriangle, CalendarPlus, CheckCircle2, Loader2, Undo2 } from 'lucide-react';
import { InfiniteScroll } from '@/components/ui/infinite-scroll';
import { StatusBadge } from '@/components/ui/status-badge';
import type { UndoNotice } from '@/components/pm/PmPlanHistoryDialog';
import { pmApi } from '@/lib/api';
import { sendWithCompletedCheck } from '@/lib/pm/move';
import { PM_STATUS_LABEL_KEY, PM_STATUS_TONE, rowStatus } from '@/lib/pm/status';
import type { PmMonthResponse, PmMonthRow, PmPlanDateChange } from '@/lib/pm/types';

/**
 * The No-date list: every visit still owed that has no plan date, site by site in PM
 * order, each with a date picker. Setting a date is a move from "no date" - it goes to
 * monday first, is recorded in Recent moves, and can be undone - and the visit appears
 * on the 52-week grid.
 *
 * A visit that was just given a date stays in place, showing its new date and an Undo,
 * rather than vanishing from under the pointer: the list is long, and the result
 * belongs where the person is looking, not in a note at the top of the page.
 */

const SITES_PER_PAGE = 20;

type Site = { contractId: string; first: PmMonthRow; visits: PmMonthRow[] };

export function PmUndatedView({
  data,
  locale,
  askCompleted,
  onDated,
  onUndo,
}: {
  data: PmMonthResponse;
  locale: string;
  /** The extra step before dating a visit monday shows as completed. */
  askCompleted: (visitName: string) => Promise<boolean>;
  /** A date reached monday, or monday already had one: refresh the grid and the record. */
  onDated: () => void;
  onUndo: (changeId: string, visitName: string | null) => Promise<UndoNotice | null>;
}) {
  const t = useTranslations('pmPlanning');
  const [visibleSites, setVisibleSites] = useState(SITES_PER_PAGE);

  const sites = useMemo(() => {
    const byContract = new Map<string, Site>();
    for (const visit of data.rows) {
      const site = byContract.get(visit.contractId);
      if (site) site.visits.push(visit);
      else byContract.set(visit.contractId, { contractId: visit.contractId, first: visit, visits: [visit] });
    }
    return [...byContract.values()];
  }, [data.rows]);

  const formatDay = (value: string | null) =>
    value
      ? new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(
          new Date(`${value}T00:00:00`),
        )
      : t('table.noPlanDate');

  if (sites.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-[var(--app-border)] p-8 text-center text-sm text-[var(--app-muted)]">
        {t('undated.empty')}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
        <p className="font-semibold">
          {t('undated.title', { visits: data.rows.length, sites: sites.length })}
        </p>
        <p className="mt-0.5 text-xs">{t('undated.help')}</p>
      </div>

      {sites.slice(0, visibleSites).map((site) => (
        <section
          key={site.contractId}
          data-keep-anchor={`site-${site.contractId}`}
          className="overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)]"
        >
          <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-[var(--app-border)] bg-[var(--app-panel-soft)] px-4 py-2.5">
            <h3 className="min-w-0 truncate text-sm font-semibold text-[var(--app-text)]" title={site.first.contractName ?? undefined}>
              {site.first.contractName ?? site.first.customerName ?? '—'}
            </h3>
            <span className="text-xs text-[var(--app-muted)]">
              {[
                site.first.province,
                site.first.serviceLine,
                site.first.robotModel,
                site.first.robotCount != null ? `×${site.first.robotCount}` : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </span>
            {site.first.contractEnded && (
              <span
                title={site.first.contractGroup ?? undefined}
                className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-200"
              >
                {t('undated.contractEnded')}
              </span>
            )}
            <span className="ml-auto text-xs tabular-nums text-[var(--app-muted)]">
              {t('undated.siteCount', { count: site.visits.length })}
            </span>
          </header>
          <ul className="divide-y divide-[var(--app-border)]">
            {site.visits.map((visit) => (
              <UndatedVisit
                key={visit.visitId}
                visit={visit}
                formatDay={formatDay}
                askCompleted={() => askCompleted(visit.visitName ?? '—')}
                onDated={onDated}
                onUndo={onUndo}
              />
            ))}
          </ul>
        </section>
      ))}

      <InfiniteScroll
        hasMore={sites.length > visibleSites}
        onReach={() => setVisibleSites((count) => count + SITES_PER_PAGE)}
        label={t('undated.showing', { shown: Math.min(visibleSites, sites.length), total: sites.length })}
      />
    </div>
  );
}

type RowState =
  | { kind: 'idle' }
  | { kind: 'dated'; date: string | null; changeId: string | null }
  | { kind: 'alreadyDated'; date: string | null };

function UndatedVisit({
  visit,
  formatDay,
  askCompleted,
  onDated,
  onUndo,
}: {
  visit: PmMonthRow;
  formatDay: (value: string | null) => string;
  askCompleted: () => Promise<boolean>;
  onDated: () => void;
  onUndo: (changeId: string, visitName: string | null) => Promise<UndoNotice | null>;
}) {
  const t = useTranslations('pmPlanning');
  const [date, setDate] = useState('');
  const [state, setState] = useState<RowState>({ kind: 'idle' });
  const [notice, setNotice] = useState<UndoNotice | null>(null);
  const [undoing, setUndoing] = useState(false);
  const status = rowStatus(visit);

  const save = useMutation({
    mutationFn: () =>
      sendWithCompletedCheck(
        (confirmCompleted) =>
          pmApi.movePlanDate(visit.visitId, date, null, confirmCompleted).then((response) => response.data.data),
        askCompleted,
      ),
    onMutate: () => setNotice(null),
    onSuccess: (result: PmPlanDateChange | null) => {
      if (!result) return; // said no to dating a completed visit
      if (result.outcome === 'MOVED') {
        setState({ kind: 'dated', date: result.planDate, changeId: result.changeId });
      } else if (result.outcome === 'CHANGED_ON_MONDAY') {
        // Someone gave it a date on monday since the last sync.
        setState({ kind: 'alreadyDated', date: result.planDate });
      }
      onDated();
    },
    onError: (error) => {
      const reason = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setNotice({ tone: 'error', text: reason ? t('move.failedBecause', { reason }) : t('move.failed') });
    },
  });

  const undo = async () => {
    if (state.kind !== 'dated' || !state.changeId) return;
    setUndoing(true);
    try {
      const result = await onUndo(state.changeId, visit.visitName);
      if (!result) return;
      if (result.done) {
        setState({ kind: 'idle' });
        setNotice(null);
      } else {
        setNotice(result);
      }
    } finally {
      setUndoing(false);
    }
  };

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5">
      <div className="min-w-[12rem] flex-1">
        <p className="truncate text-sm text-[var(--app-text)]" title={visit.visitName ?? undefined}>
          {visit.visitName ?? '—'}
        </p>
        <p className="truncate text-xs text-[var(--app-muted)]">
          {[visit.itemId && t('table.itemIdValue', { id: visit.itemId }), visit.ownerNames].filter(Boolean).join(' · ')}
        </p>
      </div>
      <StatusBadge tone={PM_STATUS_TONE[status]}>{t(`status.${PM_STATUS_LABEL_KEY[status]}`)}</StatusBadge>

      {state.kind === 'idle' && (
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (date) save.mutate();
          }}
        >
          <input
            type="date"
            value={date}
            required
            aria-label={t('table.date')}
            onChange={(e) => setDate(e.target.value)}
            className="h-9 rounded-lg border border-[var(--app-border)] bg-[var(--app-panel-alt)] px-2 text-sm text-[var(--app-text)] outline-none focus:border-[var(--app-brand)]"
          />
          <button
            type="submit"
            disabled={save.isPending || !date}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--app-brand)] px-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarPlus className="h-4 w-4" />}
            {save.isPending ? t('move.saving') : t('undated.setDate')}
          </button>
        </form>
      )}

      {state.kind === 'dated' && (
        <p className="flex items-center gap-3 text-sm">
          <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            {t('undated.dated', { date: formatDay(state.date) })}
          </span>
          {state.changeId && (
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

      {state.kind === 'alreadyDated' && (
        <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-3.5 w-3.5" />
          {t('undated.alreadyDated', { date: formatDay(state.date) })}
        </p>
      )}

      {notice && (
        <p
          className={`basis-full text-xs ${
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
    </li>
  );
}
