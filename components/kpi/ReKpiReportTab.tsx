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
 *
 * Clicking a panel opens that KPI alone with its formula and arithmetic
 * (KpiDetailView). The selection lives in the URL (`?kpi=`) so a specific
 * number can be linked to.
 */
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Info, Loader2 } from 'lucide-react';
import { kpiApi } from '@/lib/api';
import { toLiveReport } from '@/lib/kpi/from-api';
import { kpiDetail } from '@/lib/kpi/detail';
import { RE_KPI_REPORT_JAN_JUN_2026 } from '@/lib/kpi/fixtures';
import { placeholderKpis, PLACEHOLDER_KPIS } from '@/lib/kpi/placeholders';
import { dateLocale, formatPeriod, hasPlaceholderData, type Period } from '@/lib/kpi/period';
import type { KpiHeadline, KpiId, KpiPanelData, Translate } from '@/lib/kpi/types';
import { KpiDetailView } from './KpiDetailView';
import { KpiHeadlineTile } from './KpiHeadlineTile';
import { KpiPanel } from './KpiPanel';

type Props = {
  period: Period;
  selectedKpi: KpiId | null;
  onSelectKpi: (id: KpiId | null) => void;
};

export function ReKpiReportTab({ period, selectedKpi, onSelectKpi }: Props) {
  const t = useTranslations('kpi');
  // The lib layer builds display strings (counts, footnotes, averages) and needs
  // to localise them, so it takes the translator rather than importing a hook.
  const tr = t as unknown as Translate;
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
  const report = toLiveReport(data, locale, tr);
  const syncedAt = data.lastSyncedAt
    ? new Date(data.lastSyncedAt).toLocaleString(dateLocale(locale))
    : null;
  const badge = t('live.placeholderBadge');
  const placeholderIds = new Set<string>(PLACEHOLDER_KPIS);

  // Detail view: one KPI, its formula and arithmetic.
  if (selectedKpi) {
    const detail = kpiDetail(data, selectedKpi, period, locale, tr);
    if (detail) {
      return (
        <KpiDetailView
          detail={detail}
          onBack={() => onSelectKpi(null)}
          badge={placeholderIds.has(selectedKpi) ? badge : undefined}
        />
      );
    }
  }

  // Slot the two unsourced KPIs into the deck's order. Live panels carry the
  // deck's own indices (1, 3, 4, 5), so sorting by index restores the slide.
  const placeholders = placeholderKpis(period, tr, locale);
  const tileOrder: KpiHeadline['id'][] = ['firstTimeInstall', 'pmComplete', 'totalCmCases', 'firstTimeFix', 'sla', 'csat'];
  const headlines: KpiHeadline[] = tileOrder
    .map((id) => report.headlines.find((h) => h.id === id) ?? placeholders.find((p) => p.headline.id === id)?.headline)
    .filter((h): h is KpiHeadline => Boolean(h));
  const panels: KpiPanelData[] = [...report.panels, ...placeholders.map((p) => p.panel)].sort(
    (a, b) => a.index - b.index,
  );
  const deckFiguresShown = placeholders.some((p) => p.hasDeckFigures);

  // Board takeaways are written prose, not a computation; only the deck's own
  // period has any, and they are marked as copied from it.
  const takeaways = hasPlaceholderData(period) ? RE_KPI_REPORT_JAN_JUN_2026.takeaways : [];

  return (
    <div className="space-y-4">
      {/* Report header band, as on the slide */}
      <div className="flex flex-wrap items-end justify-between gap-3 rounded-xl bg-[#1d3a6e] px-5 py-4 text-white shadow-sm">
        <div className="min-w-0">
          <h2 className="text-xl font-bold leading-tight">
            {t('title')}
            <span className="mx-2 font-normal opacity-60">|</span>
            <span className="font-semibold">{formatPeriod(period, locale)}</span>
          </h2>
          <p className="mt-1 text-xs opacity-80">{t('header.kpiList')}</p>
        </div>
        <p className="text-[11px] opacity-70">
          {t('live.syncedShort', { synced: syncedAt ?? t('live.neverSynced') })}
        </p>
      </div>

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
          <p className="mt-1">{t('detail.hint')}</p>
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

      {/* Panels — the deck's six, numbered as on the slide; click for detail */}
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
              onSelect={() => onSelectKpi(panel.id)}
              selectLabel={t('detail.viewDetails')}
              chart={{
                ...panel.chart,
                series: panel.chart.series.map((s) => ({ ...s, label: t(s.labelKey) })),
              }}
              sideStats={panel.sideStats.map((s) => ({ ...s, label: t(s.labelKey) }))}
            />
          );
        })}
      </div>

      {/* Board takeaways */}
      <section className="flex overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] shadow-sm">
        <div aria-hidden className="w-2 shrink-0 bg-[#1d3a6e]" />
        <div className="min-w-0 flex-1 p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-[#1d3a6e] dark:text-[var(--app-text)]">
            {t('boardTakeaways')}
            {takeaways.length > 0 && (
              <span className="rounded border border-[var(--app-border-strong)] bg-[var(--app-panel-soft)] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[var(--app-muted)]">
                {t('takeawaysPlaceholder.badge')}
              </span>
            )}
          </h3>
          {takeaways.length === 0 ? (
            <p className="text-xs text-[var(--app-muted)]">{t('takeawaysPlaceholder.empty')}</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {takeaways.map((item) => (
                <div key={item.index} className="flex gap-2.5">
                  <span
                    aria-hidden
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{ background: item.color }}
                  >
                    {item.index}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--app-text)]">{t(item.titleKey)}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-[var(--app-muted)]">{t(item.bodyKey)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
