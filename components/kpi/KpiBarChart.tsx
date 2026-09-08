/**
 * Bar chart for the KPI panels — single, grouped or stacked.
 *
 * Built from flex/CSS rather than SVG on purpose. The app has no chart library
 * (see docs/re-kpi-dashboard-plan.md), and these are plain bar charts: CSS keeps
 * the labels crisp at any width, themes through the existing --app-* tokens, and
 * avoids a viewBox scaling pass that would shrink the text on narrow screens.
 *
 * Series colours are fixed hex from the deck rather than theme tokens — they are
 * data encoding, not chrome, so they must stay stable in light and dark. A point
 * may override its series colour, which is how the deck flags a month (PM below
 * 100% is painted orange).
 *
 * Layout follows the deck: bars sit in a padded slot so there is air between
 * months, gridlines are solid and faint, and the period average is a dark rule
 * with its label on the right.
 */

export type ChartPoint = { month: string; value: number | null; color?: string };

export type ChartSeries = {
  key: string;
  /** Already-resolved legend label (the parent owns translation). */
  label: string;
  color: string;
  points: ChartPoint[];
};

type Props = {
  mode: 'single' | 'grouped' | 'stacked';
  unit: 'percent' | 'count';
  series: ChartSeries[];
  average?: { value: number; display: string };
  showValueLabels?: boolean;
  footnote?: string;
  /** Legend is hidden for single-series charts, where it says nothing. */
  showLegend?: boolean;
  /** Tailwind min-height class for the plot; the detail view asks for a taller one. */
  heightClass?: string;
};

/** Round a count axis up to a readable maximum divisible by 4. */
function niceMax(max: number): number {
  if (max <= 0) return 4;
  const step = Math.pow(10, Math.floor(Math.log10(max))) / 2;
  return Math.ceil(max / (step * 4)) * step * 4;
}

const fmt = (v: number, unit: 'percent' | 'count') =>
  unit === 'percent' ? `${Math.round(v)}%` : v.toLocaleString();

export function KpiBarChart({
  mode,
  unit,
  series,
  average,
  showValueLabels = true,
  footnote,
  showLegend,
  heightClass = 'min-h-[190px]',
}: Props) {
  const months = series[0]?.points.map((p) => p.month) ?? [];

  // Stacked columns are sized by their total; every other mode by its tallest bar.
  const columnTotals = months.map((_, i) =>
    mode === 'stacked'
      ? series.reduce((sum, s) => sum + (s.points[i]?.value ?? 0), 0)
      : Math.max(...series.map((s) => s.points[i]?.value ?? 0)),
  );
  const dataMax = Math.max(...columnTotals, 0);
  const axisMax = unit === 'percent' ? 100 : niceMax(dataMax);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * axisMax);

  const legendVisible = showLegend ?? series.length > 1;

  return (
    <div className={`flex min-w-0 flex-1 flex-col ${heightClass}`}>
      {legendVisible && (
        <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1">
          {series.map((s) => (
            <span key={s.key} className="inline-flex items-center gap-1.5 text-[11px] text-[var(--app-muted)]">
              <span aria-hidden className="h-2.5 w-2.5 rounded-[2px]" style={{ background: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
      )}

      <div className="flex min-h-0 min-w-0 flex-1 gap-1.5">
        {/* Y axis */}
        <div className="flex w-9 shrink-0 flex-col-reverse justify-between pb-5 text-right text-[10px] leading-none text-[var(--app-muted)]">
          {ticks.map((t) => (
            <span key={t}>{fmt(t, unit)}</span>
          ))}
        </div>

        <div className="relative min-w-0 flex-1 pb-5">
          {/* Gridlines — solid and faint, as on the slide */}
          <div className="absolute inset-x-0 bottom-5 top-0 flex flex-col justify-between" aria-hidden>
            {ticks.map((t, i) => (
              <div
                key={t}
                className={`border-t border-[var(--app-border)] ${i === ticks.length - 1 ? 'opacity-90' : 'opacity-50'}`}
              />
            ))}
          </div>

          {/* Period average reference line */}
          {average && (
            <div
              className="absolute inset-x-0 z-10 border-t-2 border-[var(--app-text)]"
              style={{ bottom: `calc(1.25rem + ${(average.value / axisMax) * 100}% - ${(average.value / axisMax) * 1.25}rem)` }}
              aria-hidden
            >
              <span className="absolute -top-4 right-0 rounded bg-[var(--app-panel)] px-1 text-[10px] font-semibold text-[var(--app-text)]">
                {average.display}
              </span>
            </div>
          )}

          {/* Bars — each month owns a slot; the slot's padding is the gap between months */}
          <div className="absolute inset-x-0 bottom-5 top-0 flex items-end">
            {months.map((month, i) => {
              const stackTotal = columnTotals[i];

              if (mode === 'stacked') {
                return (
                  <div key={month} className="flex h-full min-w-0 flex-1 flex-col justify-end px-[14%]">
                    {showValueLabels && unit === 'count' && stackTotal > 0 && (
                      <span className="mb-0.5 text-center text-[10px] font-bold text-[var(--app-text)]">
                        {fmt(stackTotal, unit)}
                      </span>
                    )}
                    <div className="flex min-h-0 flex-1 flex-col-reverse justify-start">
                      {series.map((s) => {
                        const point = s.points[i];
                        const value = point?.value;
                        if (value === null || value === undefined) return null;
                        const heightPct = axisMax === 0 ? 0 : (value / axisMax) * 100;
                        return (
                          <div
                            key={s.key}
                            className="flex w-full items-center justify-center"
                            style={{ background: point?.color ?? s.color, height: `${heightPct}%` }}
                            title={`${s.label} ${month}: ${fmt(value, unit)}`}
                          >
                            {showValueLabels && heightPct >= 12 && (
                              <span className="text-[10px] font-semibold text-white">{fmt(value, unit)}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              }

              // Single and grouped: each bar owns a full-height track so its value
              // label sits above it without stealing from its height.
              return (
                <div
                  key={month}
                  className={`flex h-full min-w-0 flex-1 items-end justify-center ${
                    mode === 'grouped' ? 'gap-[6%] px-[10%]' : 'px-[18%]'
                  }`}
                >
                  {series.map((s) => {
                    const point = s.points[i];
                    const value = point?.value;
                    if (value === null || value === undefined) return null;
                    const heightPct = axisMax === 0 ? 0 : (value / axisMax) * 100;
                    return (
                      <div
                        key={s.key}
                        className="flex h-full min-w-0 flex-1 flex-col justify-end"
                        title={`${s.label} ${month}: ${fmt(value, unit)}`}
                      >
                        {showValueLabels && (
                          <span className="mb-0.5 block text-center text-[10px] font-bold text-[var(--app-text)]">
                            {fmt(value, unit)}
                          </span>
                        )}
                        <div
                          className="w-full rounded-t-[2px]"
                          style={{
                            background: point?.color ?? s.color,
                            height: `${heightPct}%`,
                            minHeight: value > 0 ? 2 : 0,
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* X axis */}
          <div className="absolute inset-x-0 bottom-0 flex">
            {months.map((m) => (
              <span key={m} className="min-w-0 flex-1 text-center text-[10px] text-[var(--app-muted)]">
                {m}
              </span>
            ))}
          </div>
        </div>
      </div>

      {footnote && <p className="mt-1.5 text-center text-[11px] text-[var(--app-muted)]">{footnote}</p>}
    </div>
  );
}
