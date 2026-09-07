'use client';

/**
 * RE Team KPI Report — the six-KPI board view (slide 2 of the source deck).
 *
 * Scaffold: the figures come from lib/kpi/fixtures.ts, which holds the Jan–Jun
 * 2026 deck numbers as typed constants. No backend endpoint produces these yet
 * and the formulas are still to be defined, so the page renders a standing
 * notice rather than implying the numbers are computed. Swapping in the API
 * means replacing the `report` constant with a query — nothing below changes.
 */
import { useTranslations } from 'next-intl';
import { Info } from 'lucide-react';
import { RE_KPI_REPORT_JAN_JUN_2026 } from '@/lib/kpi/fixtures';
import { KpiHeadlineTile } from './KpiHeadlineTile';
import { KpiPanel } from './KpiPanel';

export function ReKpiReportTab() {
  const t = useTranslations('kpi');
  const report = RE_KPI_REPORT_JAN_JUN_2026;

  return (
    <div className="space-y-4">
      {/* Placeholder banner — remove once the data source is wired. */}
      <div className="flex items-start gap-2 rounded-lg border border-dashed border-[var(--app-border-strong)] bg-[var(--app-panel-soft)] px-3 py-2">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--app-muted)]" />
        <p className="text-xs text-[var(--app-muted)]">{t('placeholderNotice')}</p>
      </div>

      {/* Headline tiles */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-6">
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

      {/* Six panels */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 2xl:grid-cols-3">
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

      {/* Board takeaways */}
      <section className="rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-[var(--app-text)]">
          {t('boardTakeaways')}
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {report.takeaways.map((item) => (
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
      </section>
    </div>
  );
}
