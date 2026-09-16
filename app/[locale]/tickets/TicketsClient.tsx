'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { AlertTriangle, Download, Loader2, RefreshCw } from 'lucide-react';
import { AppSidebar } from '@/components/AppSidebar';
import { AppTopBar } from '@/components/AppTopBar';
import { TicketKpiTiles } from '@/components/tickets/TicketKpiTiles';
import { MonthlyVolumeChart, RootCauseChart } from '@/components/tickets/TicketCharts';
import { AgingList, RepeatRobotsList, TopSitesList } from '@/components/tickets/TicketBreakdowns';
import { TicketTable } from '@/components/tickets/TicketTable';
import { TicketPanel } from '@/components/tickets/TicketPanel';
import { Skeleton } from '@/components/ui/skeleton';
import { brandTicketApi } from '@/lib/api';
import { RANGE_KEYS, resolveRange, type RangeKey } from '@/lib/tickets/range';
import type { TicketScope } from '@/lib/tickets/types';

/**
 * The brand's service-ticket analysis: headline KPIs, volume over time, why
 * things break, where they break, which robots keep breaking, and the tickets
 * themselves. The Team Dashboard shows a preview of this page and links here.
 */
export function TicketsClient({
  brand,
  initialRange,
  initialScope,
}: {
  brand: string;
  initialRange: RangeKey;
  initialScope: TicketScope;
}) {
  const t = useTranslations('tickets');
  const locale = useLocale();
  const queryClient = useQueryClient();
  const [rangeKey, setRangeKey] = useState<RangeKey>(initialRange);
  const [scope, setScope] = useState<TicketScope>(initialScope);
  const range = useMemo(() => resolveRange(rangeKey), [rangeKey]);

  // replaceState, not push: changing a filter refines one view; it is not navigation.
  useEffect(() => {
    const params = new URLSearchParams({ brand, range: rangeKey, scope });
    window.history.replaceState(null, '', `?${params.toString()}`);
  }, [brand, rangeKey, scope]);

  const summary = useQuery({
    queryKey: ['brand-tickets', brand, 'summary', range.from, range.to],
    queryFn: () => brandTicketApi.summary(brand, range.from, range.to).then((r) => r.data.data),
  });
  const tickets = useQuery({
    queryKey: ['brand-tickets', brand, 'list', range.from, range.to, scope],
    queryFn: () => brandTicketApi.list(brand, range.from, range.to, scope).then((r) => r.data.data ?? []),
  });

  const sync = useMutation({
    mutationFn: () => brandTicketApi.sync(brand).then((r) => r.data.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['brand-tickets', brand] }),
  });

  // Download, not a link: the token lives in localStorage and only the axios
  // interceptor attaches it, so an <a href> to the endpoint would arrive anonymous.
  const exportExcel = useMutation({
    mutationFn: async () => {
      const res = await brandTicketApi.exportExcel(brand, range.from, range.to);
      const disposition = String(res.headers['content-disposition'] ?? '');
      const named = /filename="?([^";]+)"?/.exec(disposition)?.[1];
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = named ?? `${brand}-tickets.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    },
  });

  const label = summary.data?.label ?? brand;
  const syncedAt = summary.data?.lastSyncedAt;
  const stamp = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const notFound = summary.isError && (summary.error as { response?: { status?: number } })?.response?.status === 404;

  return (
    <main className="min-h-dvh bg-[var(--app-bg)] text-[var(--app-text)] transition-colors">
      <div className="flex min-h-dvh">
        <AppSidebar />
        <section className="flex min-w-0 flex-1 flex-col">
          <AppTopBar eyebrow={t('eyebrow')} title={t('title', { brand: label })} />

          <div className="mx-auto w-full max-w-[1500px] space-y-4 p-4 sm:p-6">
            {/* Controls: range on the left, data actions on the right */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)] p-0.5">
                {RANGE_KEYS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setRangeKey(key)}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                      rangeKey === key
                        ? 'bg-[var(--app-brand)] text-white shadow-sm'
                        : 'text-[var(--app-muted)] hover:text-[var(--app-text)]'
                    }`}
                  >
                    {t(`range.${key}`)}
                  </button>
                ))}
              </div>

              <span className="ml-auto text-xs text-[var(--app-muted)]">
                {syncedAt ? t('syncedAt', { at: stamp.format(new Date(syncedAt)) }) : summary.isSuccess ? t('neverSynced') : ''}
              </span>

              <button
                type="button"
                onClick={() => sync.mutate()}
                disabled={sync.isPending}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)] px-3 py-1.5 text-sm font-medium text-[var(--app-text)] transition hover:border-[var(--app-brand)] disabled:opacity-60"
              >
                {sync.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                {t('refresh')}
              </button>

              <button
                type="button"
                onClick={() => exportExcel.mutate()}
                disabled={exportExcel.isPending || !summary.data || summary.data.totals.tickets === 0}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--app-brand)] px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-px hover:shadow-md disabled:opacity-60 disabled:hover:translate-y-0"
              >
                {exportExcel.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {t('exportExcel')}
              </button>
            </div>

            {(sync.isError || exportExcel.isError || (summary.isError && !notFound)) && (
              <p className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {sync.isError ? t('syncFailed') : exportExcel.isError ? t('exportFailed') : t('loadFailed')}
              </p>
            )}

            {notFound ? (
              <TicketPanel title={t('unknownBrand', { brand })}>
                <p className="text-sm text-[var(--app-muted)]">{t('unknownBrandHint')}</p>
              </TicketPanel>
            ) : (
              <>
                <TicketKpiTiles summary={summary.data} loading={summary.isLoading} />

                {summary.isSuccess && summary.data.totals.tickets === 0 && !syncedAt && (
                  <p className="rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] px-4 py-3 text-sm text-[var(--app-muted)]">
                    {t('firstSyncHint')}
                  </p>
                )}

                <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
                  <TicketPanel title={t('panels.monthly')} hint={t('panels.monthlyHint')}>
                    {summary.isLoading ? <Skeleton className="h-56 w-full" /> : <MonthlyVolumeChart points={summary.data?.monthly ?? []} />}
                  </TicketPanel>
                  <TicketPanel title={t('panels.rootCause')} hint={t('panels.rootCauseHint')}>
                    {summary.isLoading ? <Skeleton className="h-56 w-full" /> : <RootCauseChart counts={summary.data?.rootCauses ?? []} />}
                  </TicketPanel>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <TicketPanel title={t('panels.aging')} hint={t('panels.agingHint')}>
                    {summary.isLoading ? <Skeleton className="h-40 w-full" /> : <AgingList buckets={summary.data?.aging ?? []} />}
                  </TicketPanel>
                  <TicketPanel title={t('panels.sites')} hint={t('panels.sitesHint')}>
                    {summary.isLoading ? <Skeleton className="h-40 w-full" /> : <TopSitesList sites={summary.data?.topSites ?? []} />}
                  </TicketPanel>
                  <TicketPanel title={t('panels.robots')} hint={t('panels.robotsHint')}>
                    {summary.isLoading ? <Skeleton className="h-40 w-full" /> : <RepeatRobotsList robots={summary.data?.repeatRobots ?? []} />}
                  </TicketPanel>
                </div>

                <TicketPanel
                  title={t('panels.tickets', { n: tickets.data?.length ?? 0 })}
                  hint={t('panels.ticketsHint')}
                  action={
                    <div className="inline-flex rounded-lg border border-[var(--app-border)] p-0.5 text-xs">
                      {(['open', 'all'] as TicketScope[]).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setScope(s)}
                          className={`rounded-md px-2.5 py-1 font-medium transition ${
                            scope === s ? 'bg-[var(--app-brand-soft)] text-[var(--app-brand-dark)]' : 'text-[var(--app-muted)] hover:text-[var(--app-text)]'
                          }`}
                        >
                          {t(`scope.${s}`)}
                        </button>
                      ))}
                    </div>
                  }
                >
                  {tickets.isLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-9 w-full" />
                      <Skeleton className="h-9 w-full" />
                      <Skeleton className="h-9 w-full" />
                    </div>
                  ) : (
                    <TicketTable tickets={tickets.data ?? []} loading={tickets.isLoading} />
                  )}
                </TicketPanel>
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
