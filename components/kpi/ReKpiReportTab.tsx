'use client';

/**
 * RE Team KPI Report — the board view (slide 2 of the source deck).
 *
 * Live: the four KPIs the monday ticket mirror can produce — 1st Time Install,
 * Total CM Cases, First Time Fix and SLA — are fetched from
 * `GET /api/v1/kpi/cm-cases` for the selected period.
 *
 * PM Complete and CSAT are NOT shown. Nothing in the backend sources them (they
 * come from the RE team's spreadsheets), and a tile that looks like the other
 * four but is secretly a constant is worse than an absent one on a board slide.
 * They are named in a notice instead.
 */
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Info, Loader2 } from 'lucide-react';
import { kpiApi } from '@/lib/api';
import { toLiveReport, UNSOURCED_KPIS } from '@/lib/kpi/from-api';
import type { Period } from '@/lib/kpi/period';
import { KpiHeadlineTile } from './KpiHeadlineTile';
import { KpiPanel } from './KpiPanel';

type Props = { period: Period };

export function ReKpiReportTab({ period }: Props) {
  const t = useTranslations('kpi');
  const locale = useLocale();

  const query = useQuery({
    queryKey: ['kpi', 'cm-cases', period.from, period.to],
    queryFn: async () => (await kpiApi.cmCases(period.from, period.to)).data.data,
  });

  if (query.isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)] py-16 text-sm text-[var(--app-muted)]">
        <Loader2 className="h-4 w-4 animate-spin" />
        {t('live.loading')}
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-[var(--app-danger-border,#fca5a5)] bg-[var(--app-panel)] px-3 py-4">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
        <div className="text-sm">
          <p className="font-medium text-[var(--app-text)]">{t('live.errorTitle')}</p>
          <p className="mt-0.5 text-xs text-[var(--app-muted)]">
            {query.error instanceof Error ? query.error.message : t('live.errorBody')}
          </p>
        </div>
      </div>
    );
  }

  const data = query.data;
  const report = toLiveReport(data, locale);
  const syncedAt = data.lastSyncedAt ? new Date(data.lastSyncedAt).toLocaleString(locale) : null;

  return (
    <div className="space-y-4">
      {/* What these numbers are, and what they are not. */}
      <div className="flex items-start gap-2 rounded-lg border border-dashed border-[var(--app-border-strong)] bg-[var(--app-panel-soft)] px-3 py-2">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--app-muted)]" />
        <div className="text-xs text-[var(--app-muted)]">
          <p>
            {t('live.sourceNotice', {
              tickets: data.ticketCount.toLocaleString(),
              synced: syncedAt ?? t('live.neverSynced'),
            })}
          </p>
          {(data.excludedByCategory > 0 || data.unclassifiedTickets > 0) && (
            <p className="mt-1">
              {t('live.scopeNotice', {
                excluded: data.excludedByCategory.toLocaleString(),
                unclassified: data.unclassifiedTickets.toLocaleString(),
              })}
            </p>
          )}
          <p className="mt-1">
            {t('live.unsourcedNotice', {
              kpis: UNSOURCED_KPIS.map((id) => t(`kpis.${id}`)).join(', '),
            })}
          </p>
          {data.provisional && <p className="mt-1">{t('live.provisionalNotice')}</p>}
        </div>
      </div>

      {report.empty && (
        <div className="rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)] px-3 py-6 text-center text-sm text-[var(--app-muted)]">
          {t('live.emptyRange')}
        </div>
      )}

      {/* Headline tiles */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {report.headlines.map((h) => (
          <KpiHeadlineTile
            key={h.id}
            label={t(h.labelKey)}
            value={h.value}
            detail={h.detail}
            color={h.color}
          />
        ))}
      </div>

      {/* Panels */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {report.panels.map((panel) => (
          <KpiPanel
            key={panel.id}
            index={panel.index}
            title={t(panel.titleKey)}
            accent={panel.accent}
            chart={{
              ...panel.chart,
              series: panel.chart.series.map((s) => ({ ...s, label: t(s.labelKey) })),
            }}
            sideStats={panel.sideStats.map((s) => ({ ...s, label: t(s.labelKey) }))}
          />
        ))}
      </div>
    </div>
  );
}
