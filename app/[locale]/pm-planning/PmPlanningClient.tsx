'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { CalendarRange, LayoutGrid, RefreshCw, X } from 'lucide-react';
import { AppSidebar } from '@/components/AppSidebar';
import { AppTopBar } from '@/components/AppTopBar';
import { PmFilterBar } from '@/components/pm/PmFilterBar';
import { PmMonthView } from '@/components/pm/PmMonthView';
import { PmSummaryTiles } from '@/components/pm/PmSummaryTiles';
import { PmYearGrid } from '@/components/pm/PmYearGrid';
import { ListSkeleton } from '@/components/ui/skeleton';
import { pmApi } from '@/lib/api';
import {
  isoWeekMonday,
  iso,
  lookAheadRange,
  toQuery,
  weekRangeLabel,
  type PmLookAhead,
  type PmView,
} from '@/lib/pm/params';
import type { PmFilters } from '@/lib/pm/types';

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

  // Typing in the top bar should not fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setFilters((current) => ({ ...current, q: search })), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const query = useMemo(() => toQuery(filters), [filters]);

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

  /* ─── Data ──────────────────────────────────────────────────────────────── */

  const filterOptions = useQuery({
    queryKey: ['pm-filter-options'],
    queryFn: () => pmApi.filters().then((response) => response.data.data),
    staleTime: 10 * 60_000,
  });

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

  /** Clicking a week in the grid drills into exactly that week, not its month. */
  const selectWeek = useCallback(
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

  const runSync = useCallback(async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const response = await pmApi.sync();
      const result = response.data.data;
      setSyncMessage(
        result.failures > 0
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
    <main className="min-h-dvh bg-[var(--app-bg)] text-[var(--app-text)] transition-colors">
      <div className="flex min-h-dvh">
        <AppSidebar />
        <section className="flex min-w-0 flex-1 flex-col">
          <AppTopBar
            eyebrow={t('eyebrow')}
            title={t('title')}
            searchPlaceholder={t('searchPlaceholder')}
            searchValue={search}
            onSearchChange={setSearch}
          />

          <div className="mx-auto w-full max-w-[1600px] space-y-4 p-4 sm:p-6">
            {/* View switch and period controls */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-lg border border-[var(--app-border)] p-0.5">
                <ViewTab active={view === 'year'} onClick={() => setView('year')} icon={<LayoutGrid className="h-4 w-4" />}>
                  {t('view.year')}
                </ViewTab>
                <ViewTab active={view === 'month'} onClick={() => setView('month')} icon={<CalendarRange className="h-4 w-4" />}>
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
              ) : (
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
              )}

              <button
                type="button"
                onClick={runSync}
                disabled={syncing}
                title={t('sync.help')}
                className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--app-border)] px-3 text-xs font-semibold text-[var(--app-muted)] transition hover:border-[var(--app-brand)] hover:text-[var(--app-brand-dark)] disabled:opacity-60"
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

            <PmFilterBar filters={filters} options={filterOptions.data} onChange={setFilters} />

            {summary && <PmSummaryTiles summary={summary} />}

            {view === 'year' ? (
              yearQuery.isPending ? (
                <ListSkeleton />
              ) : yearQuery.isError ? (
                <ErrorNote message={t('loadFailed')} />
              ) : yearQuery.data ? (
                <PmYearGrid data={yearQuery.data} locale={locale} onSelectWeek={selectWeek} />
              ) : null
            ) : monthQuery.isPending ? (
              <ListSkeleton />
            ) : monthQuery.isError ? (
              <ErrorNote message={t('loadFailed')} />
            ) : monthQuery.data ? (
              <PmMonthView data={monthQuery.data} locale={locale} />
            ) : null}
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
