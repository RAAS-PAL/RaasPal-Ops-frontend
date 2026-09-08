'use client';

/**
 * RE Team KPI Report — the board view (slide 2 of the source deck).
 *
 * Live: the four KPIs the monday ticket mirror can produce — 1st Time Install,
 * Total CM Cases, First Time Fix and SLA — are fetched from
 * `GET /api/v1/kpi/cm-cases` for the selected period.
 *
 * PM Complete and CSAT are not computed — nothing in the backend sources them.
 * They are scaffolded into the deck's positions as badged placeholders
 * (lib/kpi/placeholders.ts): the deck's figures for its own period, an
 * "awaiting source" frame for any other. A tile that looked like the other four
 * but was secretly a constant would be worse than an absent one on a board
 * slide, so the badge is not optional.
 */
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Info, Loader2 } from 'lucide-react';
import { kpiApi } from '@/lib/api';
import { toLiveReport } from '@/lib/kpi/from-api';
import { placeholderKpis, PLACEHOLDER_KPIS } from '@/lib/kpi/placeholders';
import type { Period } from '@/lib/kpi/period';
import type { KpiHeadline, KpiPanelData } from '@/lib/kpi/types';
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

  // Slot the two unsourced KPIs into the deck's order. Live panels carry the
  // deck's own indices (1, 3, 4, 5), so sorting by index restores the slide.
  const placeholders = placeholderKpis(period);
  const placeholderIds = new Set<string>(PLACEHOLDER_KPIS);
  const badge = t('live.placeholderBadge');

  const tileOrder: KpiHeadline['id'][] = ['firstTimeInstall', 'pmComplete', 'totalCmCases', 'firstTimeFix', 'sla', 'csat'];
  const headlines: KpiHeadline[] = tileOrder
    .map((id) => report.headlines.find((h) => h.id === id) ?? placeholders.find((p) => p.headline.id === id)?.headline)
    .filter((h): h is KpiHeadline => Boolean(h));

  const panels: KpiPanelData[] = [...report.panels, ...placeholders.map((p) => p.panel)].sort(
    (a, b) => a.index - b.index,
  );
  const deckFiguresShown = placeholders.some((p) => p.hasDeckFigures);

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
            {t(deckFiguresShown ? 'live.placeholderNotice' : 'live.awaitingSourceNotice', {
              kpis: PLACEHOLDER_KPIS.map((id) => t(`kpis.${id}`)).join(', '),
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

      {/* Headline tiles — the deck's six, in its order */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-6">
        {headlines.map((h) => (
          <KpiHeadlineTile
            key={h.id}
            label={t(h.labelKey)}
            value={h.value}
            detail={h.detail}
            color={h.color}
            badge={placeholderIds.has(h.id) ? badge : undefined}
          />
        ))}
      </div>

      {/* Panels — the deck's six, numbered as on the slide */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 2xl:grid-cols-3">
        {panels.map((panel) => {
          const isPlaceholder = placeholderIds.has(panel.id);
          return (
            <KpiPanel
              key={panel.id}
              index={panel.index}
              title={t(panel.titleKey)}
              accent={panel.accent}
              badge={isPlaceholder ? badge : undefined}
              emptyMessage={isPlaceholder && !deckFiguresShown ? t('live.awaitingSourceBody') : undefined}
              chart={{
                ...panel.chart,
                series: panel.chart.series.map((s) => ({ ...s, label: t(s.labelKey) })),
              }}
              sideStats={panel.sideStats.map((s) => ({ ...s, label: t(s.labelKey) }))}
            />
          );
        })}
      </div>
    </div>
  );
}
