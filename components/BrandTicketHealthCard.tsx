'use client';

import { useQuery } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowRight, Wrench } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { brandTicketApi } from '@/lib/api';
import { resolveRange } from '@/lib/tickets/range';
import { DEFAULT_TICKET_BRAND } from '@/lib/tickets/types';

/**
 * The Team Dashboard's preview of the brand's service health: four numbers, a
 * twelve-month sparkline and the oldest open case. Everything here links to the
 * full page; nothing on this card is interactive beyond that.
 */
export function BrandTicketHealthCard({ brand = DEFAULT_TICKET_BRAND }: { brand?: string }) {
  const t = useTranslations('teamDashboard.tickets');
  const locale = useLocale();
  const range = resolveRange('year');

  const summary = useQuery({
    queryKey: ['brand-tickets', brand, 'summary', range.from, range.to],
    queryFn: () => brandTicketApi.summary(brand, range.from, range.to).then((r) => r.data.data),
    refetchInterval: 5 * 60_000,
  });

  const s = summary.data;
  const k = s?.kpis;
  const months = (s?.monthly ?? []).slice(-12);
  const max = Math.max(1, ...months.map((m) => m.opened));
  const stamp = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const oldest = (s?.repeatRobots ?? []).length; // used only to decide whether to show the robots line

  return (
    <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-panel)] p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--app-brand-soft)] text-[var(--app-brand-dark)]">
            <Wrench className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-[var(--app-text)]">{t('title', { brand: s?.label ?? 'AutoXing' })}</h3>
            <p className="text-xs text-[var(--app-muted)]">
              {s?.lastSyncedAt ? t('syncedAt', { at: stamp.format(new Date(s.lastSyncedAt)) }) : t('subtitle')}
            </p>
          </div>
        </div>
        <Link
          href={`/tickets?brand=${brand}&range=year`}
          className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-[var(--app-brand-dark)] hover:underline"
        >
          {t('viewAnalysis')} <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {summary.isError ? (
        <p className="mt-4 text-sm text-[var(--app-muted)]">{t('failedToLoad')}</p>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label={t('open')} value={k?.openNow} loading={summary.isLoading} tone={k && k.openNow > 0 ? 'danger' : 'default'} />
            <Stat
              label={t('thisMonth')}
              value={k?.thisMonth}
              loading={summary.isLoading}
              delta={k?.monthDeltaPct ?? null}
            />
            <Stat label={t('sla')} value={k?.slaWithin7Pct == null ? null : `${k.slaWithin7Pct}%`} loading={summary.isLoading} />
            <Stat label={t('repeat')} value={k?.repeatRatePct == null ? null : `${k.repeatRatePct}%`} loading={summary.isLoading} />
          </div>

          {/* Twelve-month sparkline: one series, so no legend; the title carries it. */}
          <div className="mt-4">
            <p className="mb-1 text-xs font-medium text-[var(--app-muted)]">{t('sparkline')}</p>
            {summary.isLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : months.length === 0 ? (
              <p className="text-xs text-[var(--app-muted)]">{t('noData')}</p>
            ) : (
              <div className="flex h-10 items-end gap-1" role="img" aria-label={t('sparkline')}>
                {months.map((m) => (
                  <div
                    key={m.month}
                    title={`${m.month}: ${m.opened}`}
                    className="flex-1 rounded-t-[3px] bg-[var(--viz-series-1)] transition-[height]"
                    style={{ height: `${Math.max(4, (m.opened / max) * 100)}%`, opacity: m.opened === 0 ? 0.25 : 1 }}
                  />
                ))}
              </div>
            )}
          </div>

          {k?.oldestOpenDays != null && (
            <p className="mt-3 text-xs text-[var(--app-muted)]">
              {t('oldestOpen', { n: k.oldestOpenDays })}
              {oldest > 0 && <> · {t('repeatRobots', { n: oldest })}</>}
            </p>
          )}
        </>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  loading,
  tone = 'default',
  delta,
}: {
  label: string;
  value: number | string | null | undefined;
  loading: boolean;
  tone?: 'default' | 'danger';
  delta?: number | null;
}) {
  return (
    <div className="rounded-xl bg-[var(--app-panel-soft)] px-3 py-2">
      <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-[var(--app-muted)]">{label}</p>
      {loading ? (
        <Skeleton className="mt-1 h-6 w-10" />
      ) : (
        <p className={`mt-0.5 flex items-baseline gap-1.5 text-xl font-bold tabular-nums ${tone === 'danger' ? 'text-red-600 dark:text-red-400' : 'text-[var(--app-text)]'}`}>
          {value ?? '—'}
          {delta != null && delta !== 0 && (
            <span className={`text-xs font-semibold ${delta > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
              {delta > 0 ? '▲' : '▼'} {Math.abs(delta)}%
            </span>
          )}
        </p>
      )}
    </div>
  );
}
