'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowLeft, CalendarRange, History, LayoutGrid, RefreshCw, X } from 'lucide-react';
import { AppSidebar } from '@/components/AppSidebar';
import { AppTopBar } from '@/components/AppTopBar';
import { PmCellDialog } from '@/components/pm/PmCellDialog';
import { PmFilterBar } from '@/components/pm/PmFilterBar';
import { PmPlanHistoryDialog, type UndoNotice } from '@/components/pm/PmPlanHistoryDialog';
import { PmMonthView } from '@/components/pm/PmMonthView';
import { PmSummaryTiles } from '@/components/pm/PmSummaryTiles';
import { PmYearGrid, type PmGridScroll } from '@/components/pm/PmYearGrid';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { ListSkeleton } from '@/components/ui/skeleton';
import { pmApi } from '@/lib/api';
import { sendWithCompletedCheck } from '@/lib/pm/move';
import {
  isoWeekMonday,
  isoWeekOf,
  iso,
  lookAheadRange,
  toQuery,
  weekRangeLabel,
  type PmLookAhead,
  type PmView,
} from '@/lib/pm/params';
import type { PmFilters, PmMonthRow, PmYearRow } from '@/lib/pm/types';

/**
 * PM 52-week planning.
 *
 * The whole point of the page is that it answers, in one place, what monday can
 * only answer board by board: what PM is coming, where it is, and how the year
 * bunches up. Two views over the same filtered data — the year as a grid, and a
 * date range as a list — with the view, period and every filter kept in the URL
 * so a planner can send a colleague exactly what they are looking at.
 */

type Props = {
  initialView: PmView;
  initialYear: number;
  initialMonth: string;
  initialFrom: string | null;
  initialTo: string | null;
  initialFilters: PmFilters;
};

/** Either a calendar month or an explicit range (a week drill-down, or a look-ahead chip). */
type Period = { kind: 'month'; month: string } | { kind: 'range'; from: string; to: string; label?: string };

export function PmPlanningClient({
  initialView,
  initialYear,
  initialMonth,
  initialFrom,
  initialTo,
  initialFilters,
}: Props) {
  const t = useTranslations('pmPlanning');
  const locale = useLocale();
  const queryClient = useQueryClient();

  const [view, setView] = useState<PmView>(initialView);
  const [year, setYear] = useState(initialYear);
  const [period, setPeriod] = useState<Period>(
    initialFrom && initialTo
      ? { kind: 'range', from: initialFrom, to: initialTo }
      : { kind: 'month', month: initialMonth },
  );
  const [filters, setFilters] = useState<PmFilters>(initialFilters);
  const [search, setSearch] = useState(initialFilters.q);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  // Where the grid was left for the week list, and which square, for "Back to the grid".
  const [returnTo, setReturnTo] = useState<{
    year: number;
    scroll: PmGridScroll;
    contractId?: string;
    week?: number;
  } | null>(null);
  // The grid square open in the pop-up, and where the grid was scrolled when it opened.
  const [openCell, setOpenCell] = useState<{ row: PmYearRow; week: number; scroll: PmGridScroll } | null>(null);
  // The last date monday took for the square that was opened, so the grid can point at
  // where the visit went: when the pop-up closes, or on Back from the week list.
  const [lastMove, setLastMove] = useState<{ contractId: string; planDate: string | null } | null>(null);
  // One-shot instructions for the views they are handed to; each clears itself once used.
  const [gridReturn, setGridReturn] = useState<PmGridScroll | null>(null);
  const [gridFocus, setGridFocus] = useState<{ contractId: string; week: number } | null>(null);
  const [listFocus, setListFocus] = useState<{ contractId: string; token: number } | null>(null);
  const { confirm, confirmDialog } = useConfirm();

  // Typing in the top bar should not fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setFilters((current) => ({ ...current, q: search })), 300);
    return () => clearTimeout(timer);
  }, [search]);

  /* ─── Data ──────────────────────────────────────────────────────────────── */

  const filterOptions = useQuery({
    queryKey: ['pm-filter-options'],
    queryFn: () => pmApi.filters().then((response) => response.data.data),
    staleTime: 10 * 60_000,
  });

  // A page opened from a `company=PCS` URL arrives with an include list. The filter
  // UI only knows exclusions, so once the company options are here the include list
  // is read as one - every other chain unticked. Derived rather than written back
  // into state: the bar's next onChange spreads these resolved filters, which is
  // what clears the include list. Until the options arrive, toQuery sends the list
  // as it came, so the first request is already correct.
  const companyNames = useMemo(
    () => filterOptions.data?.companies.map((company) => company.name),
    [filterOptions.data],
  );
  const resolvedFilters = useMemo<PmFilters>(() => {
    if (!companyNames || filters.includedCompanies.length === 0) return filters;
    const shown = new Set(filters.includedCompanies);
    return {
      ...filters,
      excludedCompanies: companyNames.filter((name) => !shown.has(name)),
      includedCompanies: [],
    };
  }, [filters, companyNames]);

  // Whichever company list is shorter goes on the wire and into the URL; see toQuery.
  const query = useMemo(() => toQuery(resolvedFilters, companyNames), [resolvedFilters, companyNames]);

  /* ─── URL sync ──────────────────────────────────────────────────────────── */

  useEffect(() => {
    const params = new URLSearchParams();
    params.set('view', view);
    if (view === 'year') {
      params.set('year', String(year));
    } else if (period.kind === 'month') {
      params.set('month', period.month);
    } else {
      params.set('from', period.from);
      params.set('to', period.to);
    }
    Object.entries(query).forEach(([key, value]) => params.set(key, value));
    // replaceState, not push: adjusting a filter is refining one view, not
    // navigating, and pushing would bury the previous page under every tweak.
    window.history.replaceState(null, '', `?${params.toString()}`);
  }, [view, year, period, query]);

  const yearQuery = useQuery({
    queryKey: ['pm-year', year, query],
    queryFn: () => pmApi.year(year, query).then((response) => response.data.data),
    enabled: view === 'year',
  });

  const monthQuery = useQuery({
    queryKey: ['pm-range', period, query],
    queryFn: () =>
      (period.kind === 'month'
        ? pmApi.month(period.month, query)
        : pmApi.range(period.from, period.to, query)
      ).then((response) => response.data.data),
    enabled: view === 'month',
  });

  const summary = view === 'year' ? yearQuery.data?.summary : monthQuery.data?.summary;

  /* ─── Actions ───────────────────────────────────────────────────────────── */

  /** Opens one ISO week of the grid as the week list: every site's visits that week. */
  const openWeek = useCallback(
    (week: number) => {
      const monday = isoWeekMonday(year, week);
      const sunday = new Date(monday);
      sunday.setDate(sunday.getDate() + 6);
      setPeriod({
        kind: 'range',
        from: iso(monday),
        to: iso(sunday),
        label: `${t('grid.week')} ${week} · ${weekRangeLabel(year, week, locale)}`,
      });
      setView('month');
    },
    [year, locale, t],
  );

  /** A week number in the grid's header: that week, not its month, with a way back. */
  const selectWeek = useCallback(
    (week: number, scroll: PmGridScroll) => {
      setReturnTo({ year, scroll });
      setListFocus(null);
      openWeek(week);
    },
    [year, openWeek],
  );

  /** A square opens its pop-up: that site's visits in that week, movable in place. */
  const selectCell = useCallback((row: PmYearRow, week: number, scroll: PmGridScroll) => {
    setLastMove(null);
    setOpenCell({ row, week, scroll });
  }, []);

  /**
   * "See all sites this week" from the pop-up: the week list, scrolled to the site that
   * was clicked and lit up, so its visit stands out among the whole week - with a way
   * back to this spot on the grid.
   */
  const seeCellWeek = useCallback(() => {
    if (!openCell) return;
    const { row, week, scroll } = openCell;
    setOpenCell(null);
    setReturnTo({ year, scroll, contractId: row.contractId, week });
    setListFocus({ contractId: row.contractId, token: Date.now() });
    openWeek(week);
  }, [openCell, year, openWeek]);

  /** Closing the pop-up after a move points at the square the visit went to. */
  const closeCell = useCallback(() => {
    if (openCell && lastMove?.contractId === openCell.row.contractId && lastMove.planDate) {
      const moved = isoWeekOf(lastMove.planDate);
      if (moved.year === year) setGridFocus({ contractId: openCell.row.contractId, week: moved.week });
    }
    setOpenCell(null);
  }, [openCell, lastMove, year]);

  /**
   * Back to the grid where it was left, pointing at the square the person came from -
   * or, if they moved that site's visit, at the week it went to. Only this button
   * points; the tabs are plain navigation.
   */
  const backToGrid = useCallback(() => {
    if (!returnTo) return;
    let target =
      returnTo.contractId && returnTo.week ? { contractId: returnTo.contractId, week: returnTo.week } : null;
    if (target && lastMove?.contractId === target.contractId && lastMove.planDate) {
      const moved = isoWeekOf(lastMove.planDate);
      // Moved into another year: that square is not on this grid, so point at nothing.
      target = moved.year === returnTo.year ? { contractId: target.contractId, week: moved.week } : null;
    }
    setYear(returnTo.year);
    setGridReturn(returnTo.scroll);
    setGridFocus(target);
    setReturnTo(null);
    setView('year');
  }, [returnTo, lastMove]);

  const switchView = useCallback((next: PmView) => {
    setReturnTo(null);
    setGridReturn(null);
    setGridFocus(null);
    setListFocus(null);
    setView(next);
  }, []);

  const clearGridReturn = useCallback(() => setGridReturn(null), []);
  const clearGridFocus = useCallback(() => setGridFocus(null), []);
  const clearListFocus = useCallback(() => setListFocus(null), []);

  const runSync = useCallback(async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const response = await pmApi.sync();
      const result = response.data.data;
      // The endpoint answers 200 even when it did nothing, so the body is the
      // only signal. Two of those cases carry failures: 0 and would otherwise
      // render as "Synced 0 sites and 0 visits" — indistinguishable from a real
      // but empty sync. The clearest is "A PM sync is already running", which
      // is exactly what someone sees when they press the button twice.
      const wroteNothing = result.contractsWritten === 0 && result.visitsWritten === 0;
      setSyncMessage(
        result.failures > 0 || (wroteNothing && result.messages?.length)
          ? result.messages.join(' · ')
          : t('sync.done', { contracts: result.contractsWritten, visits: result.visitsWritten }),
      );
      await queryClient.invalidateQueries({ queryKey: ['pm-year'] });
      await queryClient.invalidateQueries({ queryKey: ['pm-range'] });
      await queryClient.invalidateQueries({ queryKey: ['pm-filter-options'] });
    } catch (error) {
      setSyncMessage(error instanceof Error ? error.message : t('sync.failed'));
    } finally {
      setSyncing(false);
    }
  }, [queryClient, t]);

  /**
   * Everything that shows plan dates or the record of moves, after a date changed.
   * `keep` is the list the person is working in: it is left as it is, so a visit just
   * moved stays in place with its result and Undo, and refreshes when next opened.
   */
  const refreshPlan = useCallback(
    (keep?: 'range' | 'cell') => {
      void queryClient.invalidateQueries({ queryKey: ['pm-year'] });
      void queryClient.invalidateQueries({ queryKey: ['pm-cell'], refetchType: keep === 'cell' ? 'none' : 'active' });
      void queryClient.invalidateQueries({ queryKey: ['pm-range'], refetchType: keep === 'range' ? 'none' : 'active' });
      void queryClient.invalidateQueries({ queryKey: ['pm-plan-changes'] });
    },
    [queryClient],
  );

  const formatDay = useCallback(
    (value: string | null) =>
      value
        ? new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(
            new Date(`${value}T00:00:00`),
          )
        : t('table.noPlanDate'),
    [locale, t],
  );

  const closeHistory = useCallback(() => setHistoryOpen(false), []);

  /** monday took a new date, from the pop-up (`cell`) or the week list (`range`). */
  const visitMoved = useCallback(
    (visit: PmMonthRow, planDate: string | null, keep: 'range' | 'cell') => {
      setLastMove({ contractId: visit.contractId, planDate });
      refreshPlan(keep);
    },
    [refreshPlan],
  );

  /** The extra step before changing a visit monday shows as completed. */
  const askCompleted = useCallback(
    (visit: string) =>
      confirm({
        title: t('move.confirmCompletedTitle'),
        message: t('move.confirmCompletedBody', { visit }),
        confirmLabel: t('move.confirmCompletedAction'),
        tone: 'danger',
        kind: 'warn',
      }),
    [confirm, t],
  );

  /**
   * Undoes one move, asking first if monday shows the visit completed. Shared by the
   * pop-up, the week list and Recent moves, which each show the answer where it was
   * asked for; `keep` is the list it was asked from.
   */
  const undoMove = useCallback(
    async (
      changeId: string,
      visitName: string | null,
      keep?: 'range' | 'cell',
    ): Promise<UndoNotice | null> => {
      const visit = visitName ?? '—';
      try {
        const result = await sendWithCompletedCheck(
          (confirmCompleted) =>
            pmApi.undoPlanChange(changeId, confirmCompleted).then((response) => response.data.data),
          () => askCompleted(visit),
        );
        if (!result) return null;
        refreshPlan(keep);
        if (result.outcome === 'MOVED') {
          return {
            tone: 'info',
            done: true,
            planDate: result.planDate,
            text: result.planDate
              ? t('move.undone', { visit, date: formatDay(result.planDate) })
              : t('move.undoneNoDate', { visit }),
          };
        }
        if (result.outcome === 'CHANGED_ON_MONDAY') {
          return { tone: 'warn', text: t('move.undoChangedOnMonday', { visit, date: formatDay(result.planDate) }) };
        }
        return { tone: 'info', text: t('move.undoUnchanged', { visit }) };
      } catch (error) {
        // Someone may have undone or moved it meanwhile; show the record as it is now.
        refreshPlan();
        const reason = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
        return { tone: 'error', text: reason ? t('move.undoFailedBecause', { reason }) : t('move.undoFailed') };
      }
    },
    [askCompleted, t, formatDay, refreshPlan],
  );

  const periodLabel =
    period.kind === 'month'
      ? new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(
          new Date(`${period.month}-01T00:00:00`),
        )
      : (period.label ?? `${period.from} – ${period.to}`);

  return (
    // bg/text on the root, as every other page does it: body paints itself from
    // --canvas, which is dark even in the light theme, so a page that does not set
    // its own background renders light-mode text straight onto it.
    // The year grid is the one view that pins its own header rows, so it gets a shell
    // exactly the height of the viewport with the page scroll turned off: the grid then
    // owns the vertical scroll and its sticky Site/month/week/LOAD cells stay put. The
    // month view is an ordinary document and keeps normal page scrolling, hence the
    // conditional rather than a global change. Print undoes it - a fixed-height,
    // overflow-hidden shell prints as a single cropped page.
    <main
      className={`bg-[var(--app-bg)] text-[var(--app-text)] transition-colors ${
        view === 'year' ? 'h-dvh overflow-hidden print:h-auto print:overflow-visible' : 'min-h-dvh'
      }`}
    >
      <div className={`flex ${view === 'year' ? 'h-full print:h-auto' : 'min-h-dvh'}`}>
        <AppSidebar />
        <section className="flex min-h-0 min-w-0 flex-1 flex-col">
          <AppTopBar
            eyebrow={t('eyebrow')}
            title={t('title')}
            searchPlaceholder={t('searchPlaceholder')}
            searchValue={search}
            onSearchChange={setSearch}
          />

          <div
            className={`mx-auto w-full max-w-[1600px] space-y-4 p-4 sm:p-6 ${
              view === 'year' ? 'flex min-h-0 flex-1 flex-col print:block print:min-h-0' : ''
            }`}
          >
            {/* View switch and period controls */}
            <div className="flex flex-wrap items-center gap-2">
              {view === 'month' && returnTo && (
                <button
                  type="button"
                  onClick={backToGrid}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--app-brand)] px-3 text-sm font-semibold text-[var(--app-brand-dark)] transition hover:bg-[var(--app-brand-soft)]"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {t('backToGrid')}
                </button>
              )}

              <div className="inline-flex rounded-lg border border-[var(--app-border)] p-0.5">
                <ViewTab active={view === 'year'} onClick={() => switchView('year')} icon={<LayoutGrid className="h-4 w-4" />}>
                  {t('view.year')}
                </ViewTab>
                <ViewTab active={view === 'month'} onClick={() => switchView('month')} icon={<CalendarRange className="h-4 w-4" />}>
                  {t('view.month')}
                </ViewTab>
              </div>

              {view === 'year' ? (
                <label className="flex items-center gap-2 text-sm">
                  <span className="text-[var(--app-muted)]">{t('yearLabel')}</span>
                  <input
                    type="number"
                    min={2000}
                    max={2100}
                    value={year}
                    onChange={(event) => setYear(Number(event.target.value))}
                    className="h-9 w-24 rounded-lg border border-[var(--app-border)] bg-[var(--app-panel-alt)] px-2 text-sm outline-none focus:border-[var(--app-brand)]"
                  />
                </label>
              ) : view === 'month' ? (
                <label className="flex items-center gap-2 text-sm">
                  <span className="text-[var(--app-muted)]">{t('monthLabel')}</span>
                  {/* A month input bound to a range shows an empty "--------- ----",
                      which reads as broken. An explicit range gets its dates instead,
                      with a way back to picking a month. */}
                  {period.kind === 'month' ? (
                    <input
                      type="month"
                      value={period.month}
                      onChange={(event) =>
                        event.target.value && setPeriod({ kind: 'month', month: event.target.value })
                      }
                      className="h-9 rounded-lg border border-[var(--app-border)] bg-[var(--app-panel-alt)] px-2 text-sm outline-none focus:border-[var(--app-brand)]"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setPeriod({ kind: 'month', month: period.from.slice(0, 7) })}
                      title={t('backToMonth')}
                      className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--app-border)] bg-[var(--app-panel-alt)] px-3 text-sm transition hover:border-[var(--app-brand)]"
                    >
                      <span>{period.from} – {period.to}</span>
                      <X className="h-3.5 w-3.5 text-[var(--app-muted)]" />
                    </button>
                  )}
                </label>
              ) : null}

              <button
                type="button"
                onClick={() => setHistoryOpen(true)}
                className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--app-border)] px-3 text-xs font-semibold text-[var(--app-muted)] transition hover:border-[var(--app-brand)] hover:text-[var(--app-brand-dark)]"
              >
                <History className="h-3.5 w-3.5" />
                {t('history.open')}
              </button>

              <button
                type="button"
                onClick={runSync}
                disabled={syncing}
                title={t('sync.help')}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--app-border)] px-3 text-xs font-semibold text-[var(--app-muted)] transition hover:border-[var(--app-brand)] hover:text-[var(--app-brand-dark)] disabled:opacity-60"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? t('sync.running') : t('sync.action')}
              </button>
            </div>

            {/* Look-ahead chips (spec section 8) */}
            {view === 'month' && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase text-[var(--app-muted)]">
                  {t('lookAhead.label')}
                </span>
                {(['thisMonth', 'next30', 'next60', 'next90'] as PmLookAhead[]).map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => {
                      const range = lookAheadRange(kind);
                      setPeriod({ kind: 'range', from: range.from, to: range.to, label: t(`lookAhead.${kind}`) });
                    }}
                    className="h-8 rounded-full border border-[var(--app-border)] px-3 text-xs font-semibold text-[var(--app-muted)] transition hover:border-[var(--app-brand)] hover:text-[var(--app-brand-dark)]"
                  >
                    {t(`lookAhead.${kind}`)}
                  </button>
                ))}
                <span className="text-xs text-[var(--app-muted)]">· {periodLabel}</span>
              </div>
            )}

            {syncMessage && (
              <p className="rounded-lg border border-[var(--app-border)] bg-[var(--app-panel-alt)] px-3 py-2 text-xs text-[var(--app-muted)]">
                {syncMessage}
              </p>
            )}

            <PmFilterBar filters={resolvedFilters} options={filterOptions.data} onChange={setFilters} />

            {summary && <PmSummaryTiles summary={summary} />}

            {view === 'year' ? (
              yearQuery.isPending ? (
                <ListSkeleton />
              ) : yearQuery.isError ? (
                <ErrorNote message={t('loadFailed')} />
              ) : yearQuery.data ? (
                <PmYearGrid
                  data={yearQuery.data}
                  locale={locale}
                  onSelectWeek={selectWeek}
                  onSelectCell={selectCell}
                  returnTo={gridReturn}
                  onReturned={clearGridReturn}
                  // Pointed at once fresh data is in: a moved visit's new square only
                  // exists after the grid has refetched.
                  focus={yearQuery.isFetching ? null : gridFocus}
                  onFocused={clearGridFocus}
                />
              ) : null
            ) : monthQuery.isPending ? (
              <ListSkeleton />
            ) : monthQuery.isError ? (
              <ErrorNote message={t('loadFailed')} />
            ) : monthQuery.data ? (
              <PmMonthView
                data={monthQuery.data}
                locale={locale}
                focus={monthQuery.isFetching ? null : listFocus}
                onFocused={clearListFocus}
                askCompleted={askCompleted}
                onMoved={(visit, planDate) => visitMoved(visit, planDate, 'range')}
                onUndo={(changeId, visitName) => undoMove(changeId, visitName, 'range')}
              />
            ) : null}

            {openCell && (
              <PmCellDialog
                row={openCell.row}
                year={year}
                week={openCell.week}
                filters={query}
                locale={locale}
                askCompleted={askCompleted}
                onClose={closeCell}
                onSeeWeek={seeCellWeek}
                onMoved={(visit, planDate) => visitMoved(visit, planDate, 'cell')}
                onUndo={(changeId, visitName) => undoMove(changeId, visitName, 'cell')}
              />
            )}

            {historyOpen && (
              <PmPlanHistoryDialog
                locale={locale}
                onClose={closeHistory}
                onUndo={(change) => undoMove(change.id, change.visitName)}
              />
            )}
            {confirmDialog}
          </div>
        </section>
      </div>
    </main>
  );
}

function ViewTab({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-semibold transition ${
        active
          ? 'bg-[var(--app-brand-soft)] text-[var(--app-brand-dark)]'
          : 'text-[var(--app-muted)] hover:text-[var(--app-brand-dark)]'
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function ErrorNote({ message }: { message: string }) {
  return (
    <p className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-400">
      {message}
    </p>
  );
}
