'use client';

/**
 * Repeat cost (deck slides 4–5).
 *
 * The deck's governing rule is reproduced at the bottom: repeat cost comes from
 * verifiable ticket events, not from multiplying a KPI denominator — which is
 * why KPI volume and cost events are shown as separate figures throughout
 * (9 cases but 12 tickets; 351 cases but 146 tickets).
 *
 * Baht rates are the deck's worked example, not actuals, and the page says so.
 */
import { useTranslations } from 'next-intl';
import { Info, TriangleAlert } from 'lucide-react';
import { RE_REPEAT_COST_JAN_JUN_2026 } from '@/lib/kpi/repeat-cost-fixtures';
import { KPI_COLORS } from '@/lib/kpi/fixtures';
import { SplitBar } from './SplitBar';

const baht = (n: number) => `฿${n.toLocaleString()}`;

export function RepeatCostTab() {
  const t = useTranslations('kpi');
  const report = RE_REPEAT_COST_JAN_JUN_2026;
  const linesTotal = report.costLines.reduce((sum, l) => sum + l.total, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-lg border border-dashed border-[var(--app-border-strong)] bg-[var(--app-panel-soft)] px-3 py-2">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--app-muted)]" />
        <p className="text-xs text-[var(--app-muted)]">{t('repeat.exampleNotice')}</p>
      </div>

      {/* Headline tiles */}
      <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
        {report.headlines.map((h) => (
          <div
            key={h.key}
            className="flex flex-col items-center justify-center rounded-xl px-3 py-3 text-center text-white shadow-sm"
            style={{ background: h.color }}
          >
            <p className="truncate text-[11px] font-medium leading-tight opacity-95">{t(h.labelKey)}</p>
            <p className="mt-1 text-2xl font-bold leading-none">{h.value}</p>
            <p className="mt-1 text-[10px] leading-tight opacity-90">{t(h.detailKey)}</p>
          </div>
        ))}
      </div>

      {/* Per-type breakdown */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {report.breakdowns.map((b) => (
          <section
            key={b.key}
            className="flex overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] shadow-sm"
          >
            <div aria-hidden className="w-1.5 shrink-0" style={{ background: b.accent }} />
            <div className="min-w-0 flex-1 p-4">
              <h3 className="mb-3 text-sm font-bold text-[var(--app-text)]">{t(b.titleKey)}</h3>

              {/* KPI volume vs cost events — deliberately separate figures. */}
              <div className="mb-3 grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-[var(--app-border)] bg-[var(--app-panel-soft)] p-2.5 text-center">
                  <p className="text-[10px] text-[var(--app-muted)]">{t(b.kpiVolumeLabelKey)}</p>
                  <p className="text-xl font-bold text-[var(--app-text)]">{b.kpiVolume}</p>
                </div>
                <div className="rounded-lg border border-[var(--app-border)] bg-[var(--app-panel-soft)] p-2.5 text-center">
                  <p className="text-[10px] text-[var(--app-muted)]">{t(b.costEventsLabelKey)}</p>
                  <p className="text-xl font-bold text-[var(--app-text)]">{b.costEvents}</p>
                </div>
              </div>

              {/* Channel mix */}
              <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1">
                {b.channels
                  .filter((c) => c.count > 0)
                  .map((c) => (
                    <span key={c.labelKey} className="text-[11px] text-[var(--app-muted)]">
                      {t(c.labelKey)}{' '}
                      <span className="font-semibold text-[var(--app-text)]">{c.count}</span>
                    </span>
                  ))}
              </div>

              <SplitBar
                left={{ label: t(b.split.localLabelKey), value: b.split.local, color: KPI_COLORS.ftf }}
                right={{ label: t(b.split.provinceLabelKey), value: b.split.province, color: KPI_COLORS.cmTotal }}
              />

              <dl className="mt-3 space-y-1 text-[11px]">
                <div className="flex justify-between gap-2">
                  <dt className="text-[var(--app-muted)]">{t('repeat.labels.avgKm')}</dt>
                  <dd className="font-semibold text-[var(--app-text)]">
                    {t('repeat.labels.local')} {b.avgKm.local} km · {t('repeat.labels.province')} {b.avgKm.province} km
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-[var(--app-muted)]">{t('repeat.labels.unitCost')}</dt>
                  <dd className="font-semibold text-[var(--app-text)]">
                    {baht(b.unitCost.localBaht)} · {baht(b.unitCost.provinceBaht)}
                  </dd>
                </div>
                <div className="flex justify-between gap-2 border-t border-[var(--app-border)] pt-1">
                  <dt className="text-[var(--app-muted)]">{t('repeat.labels.subtotal')}</dt>
                  <dd className="text-sm font-bold" style={{ color: b.accent }}>
                    ≈ {baht(b.totalBaht)}
                  </dd>
                </div>
              </dl>
            </div>
          </section>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {/* Cost summary table */}
        <section className="rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-4 shadow-sm lg:col-span-2">
          <h3 className="mb-3 text-sm font-bold text-[var(--app-text)]">{t('repeat.costSummary')}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[var(--app-border)] text-left text-[var(--app-muted)]">
                  <th className="pb-2 font-medium">{t('repeat.table.line')}</th>
                  <th className="pb-2 text-right font-medium">{t('repeat.table.qty')}</th>
                  <th className="pb-2 text-right font-medium">{t('repeat.table.unit')}</th>
                  <th className="pb-2 text-right font-medium">{t('repeat.table.total')}</th>
                </tr>
              </thead>
              <tbody>
                {report.costLines.map((line) => (
                  <tr key={line.key} className="border-b border-[var(--app-border)] last:border-0">
                    <td className="py-1.5 text-[var(--app-text)]">{t(line.labelKey)}</td>
                    <td className="py-1.5 text-right tabular-nums text-[var(--app-muted)]">{line.qty}</td>
                    <td className="py-1.5 text-right tabular-nums text-[var(--app-muted)]">{line.unit}</td>
                    <td className="py-1.5 text-right font-semibold tabular-nums text-[var(--app-text)]">
                      {baht(line.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-[var(--app-border-strong)]">
                  <td className="pt-2 font-bold text-[var(--app-text)]" colSpan={3}>
                    {t('repeat.table.grandTotal')}
                  </td>
                  <td className="pt-2 text-right font-bold tabular-nums text-[var(--app-text)]">
                    {baht(linesTotal)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        {/* Cost vs incentive */}
        <section className="rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-bold text-[var(--app-text)]">{t('repeat.vsIncentive')}</h3>
          <dl className="space-y-2.5">
            <div>
              <dt className="text-[11px] text-[var(--app-muted)]">{t('repeat.labels.repeatCostTotal')}</dt>
              <dd className="text-xl font-bold text-[var(--app-text)]">≈ {baht(report.totals.repeatCost)}</dd>
            </div>
            <div>
              <dt className="text-[11px] text-[var(--app-muted)]">{t('repeat.labels.incentive')}</dt>
              <dd className="text-xl font-bold text-[var(--app-text)]">{baht(report.totals.incentive)}</dd>
              <p className="text-[10px] text-[var(--app-muted)]">{t(report.totals.incentiveBasisKey)}</p>
            </div>
            <div className="border-t border-[var(--app-border)] pt-2">
              <dt className="text-[11px] text-[var(--app-muted)]">{t('repeat.labels.gap')}</dt>
              <dd className="text-2xl font-bold" style={{ color: KPI_COLORS.csat }}>
                ≈ {baht(report.totals.gap)}
              </dd>
            </div>
          </dl>
        </section>
      </div>

      {/* The deck's governing principle. */}
      <div className="flex items-start gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-panel-soft)] px-4 py-3">
        <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-[var(--app-muted)]" />
        <p className="text-xs leading-relaxed text-[var(--app-muted)]">{t('repeat.keyFactor')}</p>
      </div>
    </div>
  );
}
