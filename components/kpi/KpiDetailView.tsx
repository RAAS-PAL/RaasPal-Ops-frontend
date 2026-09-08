'use client';

/**
 * One KPI on its own: the chart at full width, the headline, and how the
 * number was reached — the backend's definition in words, the arithmetic, the
 * windows, and the caveats that qualify it. Then a per-month table by segment.
 *
 * For a placeholder KPI the same frame states the deck's basis and that nothing
 * was computed; the badge and dashed styling carry over from the panel.
 */
import { useTranslations } from 'next-intl';
import { ArrowLeft, Calculator, Info } from 'lucide-react';
import type { KpiDetail, DetailCell } from '@/lib/kpi/detail';
import { KpiBarChart } from './KpiBarChart';

type Props = {
  detail: KpiDetail;
  onBack: () => void;
  badge?: string;
};

const pct = (v: number | null) => (v === null ? '—' : `${v.toFixed(1)}%`);

function Cell({ cell }: { cell: DetailCell }) {
  if (cell.denominator === null) {
    return <span className="tabular-nums">{cell.numerator?.toLocaleString() ?? '—'}</span>;
  }
  return (
    <span className="tabular-nums">
      <span className="font-semibold">{pct(cell.rate)}</span>
      <span className="ml-1 text-[var(--app-muted)]">
        {cell.numerator?.toLocaleString()}/{cell.denominator.toLocaleString()}
      </span>
    </span>
  );
}

export function KpiDetailView({ detail, onBack, badge }: Props) {
  const t = useTranslations('kpi');
  const placeholder = !detail.computed;

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)] px-3 py-1.5 text-xs font-semibold text-[var(--app-text)] transition hover:border-[var(--app-brand)] hover:text-[var(--app-brand-dark)]"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {t('detail.back')}
      </button>

      {/* Title + headline */}
      <section
        className={`flex overflow-hidden rounded-xl border bg-[var(--app-panel)] shadow-sm ${
          placeholder ? 'border-dashed border-[var(--app-border-strong)]' : 'border-[var(--app-border)]'
        }`}
      >
        <div aria-hidden className="w-2 shrink-0" style={{ background: detail.accent }} />
        <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-4 p-4">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-lg font-bold text-[var(--app-text)]">
              <span className="text-[var(--app-muted)]">{detail.index}</span>
              {t(detail.titleKey)}
              {badge && (
                <span className="rounded border border-[var(--app-border-strong)] bg-[var(--app-panel-soft)] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[var(--app-muted)]">
                  {badge}
                </span>
              )}
            </h2>
            <p className="mt-0.5 text-xs text-[var(--app-muted)]">{detail.headline.detail}</p>
          </div>
          <div
            className="rounded-xl px-5 py-2.5 text-center text-white shadow-sm"
            style={{ background: detail.accent }}
          >
            <p className="text-3xl font-bold leading-none tracking-tight">{detail.headline.value}</p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        {/* Chart + side stats, larger than on the grid */}
        <section className="rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-4 shadow-sm xl:col-span-2">
          <div className="flex min-w-0 flex-col gap-4 sm:flex-row">
            <div className="flex min-w-0 flex-1">
              <KpiBarChart
                {...detail.chart}
                heightClass="min-h-[320px]"
                series={detail.chart.series.map((s) => ({ ...s, label: t(s.labelKey) }))}
              />
            </div>
            <div className="flex shrink-0 flex-row flex-wrap gap-1.5 sm:w-[120px] sm:flex-col">
              {detail.sideStats.map((stat) => (
                <div
                  key={stat.labelKey}
                  className={`min-w-[96px] flex-1 rounded-lg px-2 py-1.5 text-center sm:flex-none ${
                    stat.emphasis ? '' : 'border border-[var(--app-border)] bg-[var(--app-panel-soft)]'
                  }`}
                  style={stat.emphasis ? { background: detail.accent, color: '#fff' } : undefined}
                >
                  <p className={`truncate text-[10px] ${stat.emphasis ? 'opacity-90' : 'text-[var(--app-muted)]'}`}>
                    {t(stat.labelKey)}
                  </p>
                  <p className={`text-base font-bold ${stat.emphasis ? '' : 'text-[var(--app-text)]'}`}>{stat.value}</p>
                  {stat.detail && (
                    <p className={`text-[10px] ${stat.emphasis ? 'opacity-85' : 'text-[var(--app-muted)]'}`}>{stat.detail}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it's calculated */}
        <section className="rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-4 shadow-sm">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-[var(--app-text)]">
            <Calculator className="h-4 w-4 text-[var(--app-muted)]" />
            {t('detail.howCalculated')}
          </h3>

          {placeholder ? (
            <div className="space-y-2 text-xs leading-relaxed text-[var(--app-muted)]">
              <p className="rounded-lg border border-dashed border-[var(--app-border-strong)] bg-[var(--app-panel-soft)] p-2.5 font-medium text-[var(--app-text)]">
                {t('detail.notComputed')}
              </p>
              <p>
                <span className="font-semibold text-[var(--app-text)]">{t('detail.deckBasis')}: </span>
                {detail.formula.key ? t(detail.formula.key) : ''}
              </p>
            </div>
          ) : (
            <div className="space-y-3 text-xs leading-relaxed">
              <div>
                <p className="mb-1 font-semibold text-[var(--app-text)]">{t('detail.formula')}</p>
                <p className="text-[var(--app-muted)]">{detail.formula.text ?? '—'}</p>
              </div>

              {detail.arithmetic && (
                <div>
                  <p className="mb-1 font-semibold text-[var(--app-text)]">{t('detail.arithmetic')}</p>
                  <p className="rounded-lg bg-[var(--app-panel-soft)] p-2.5 font-mono text-[11px] text-[var(--app-text)]">
                    {detail.arithmetic.numerator.toLocaleString()} {t(detail.arithmetic.numeratorKey)} ÷{' '}
                    {detail.arithmetic.denominator.toLocaleString()} {t(detail.arithmetic.denominatorKey)} ={' '}
                    <span className="font-bold">{detail.arithmetic.result}</span>
                  </p>
                </div>
              )}

              {detail.windows.length > 0 && (
                <div>
                  <p className="mb-1 font-semibold text-[var(--app-text)]">{t('detail.windows')}</p>
                  <ul className="space-y-0.5 text-[var(--app-muted)]">
                    {detail.windows.map((w) => (
                      <li key={w.key}>{t(w.key, { days: w.days })}</li>
                    ))}
                  </ul>
                </div>
              )}

              {detail.caveats.length > 0 && (
                <div>
                  <p className="mb-1 font-semibold text-[var(--app-text)]">{t('detail.caveats')}</p>
                  <dl className="space-y-1">
                    {detail.caveats.map((c) => (
                      <div key={c.key} className="flex justify-between gap-3">
                        <dt className="text-[var(--app-muted)]">{t(c.key)}</dt>
                        <dd className="shrink-0 font-semibold tabular-nums text-[var(--app-text)]">
                          {c.value.toLocaleString()}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}

              {detail.notes.length > 0 && (
                <div>
                  <p className="mb-1 flex items-center gap-1 font-semibold text-[var(--app-text)]">
                    <Info className="h-3.5 w-3.5 text-[var(--app-muted)]" />
                    {t('detail.notes')}
                  </p>
                  <ul className="space-y-1 text-[var(--app-muted)]">
                    {detail.notes.map((n) => (
                      <li key={n}>{n}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      {/* Monthly table */}
      {detail.monthly.length > 0 && (
        <section className="rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-bold text-[var(--app-text)]">{t('detail.monthly')}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[var(--app-border)] text-left text-[var(--app-muted)]">
                  <th className="pb-2 font-medium">{t('detail.colMonth')}</th>
                  <th className="pb-2 font-medium">{t('detail.colAll')}</th>
                  <th className="pb-2 font-medium">{t('segments.cleaning')}</th>
                  <th className="pb-2 font-medium">{t('segments.delivery')}</th>
                </tr>
              </thead>
              <tbody>
                {detail.monthly.map((row) => (
                  <tr key={row.month} className="border-b border-[var(--app-border)] last:border-0">
                    <td className="py-1.5 font-medium text-[var(--app-text)]">{row.month}</td>
                    <td className="py-1.5 text-[var(--app-text)]"><Cell cell={row.all} /></td>
                    <td className="py-1.5 text-[var(--app-text)]"><Cell cell={row.cleaning} /></td>
                    <td className="py-1.5 text-[var(--app-text)]"><Cell cell={row.delivery} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
