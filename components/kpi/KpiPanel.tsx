/**
 * One numbered KPI panel: chart on the left, supporting figures on the right,
 * with a coloured spine identifying the KPI (the deck's visual language).
 *
 * The side stats stack under the chart on narrow screens rather than squeezing
 * beside it, since the deck's fixed 16:9 layout has no mobile equivalent.
 */
import type { SideStat } from '@/lib/kpi/types';
import { KpiBarChart, type ChartSeries } from './KpiBarChart';

type Props = {
  index: number;
  title: string;
  accent: string;
  chart: {
    mode: 'single' | 'grouped' | 'stacked';
    unit: 'percent' | 'count';
    series: ChartSeries[];
    average?: { value: number; display: string };
    showValueLabels: boolean;
    footnote?: string;
  };
  sideStats: (SideStat & { label: string })[];
};

export function KpiPanel({ index, title, accent, chart, sideStats }: Props) {
  return (
    <section className="flex overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] shadow-sm">
      <div aria-hidden className="w-1.5 shrink-0" style={{ background: accent }} />

      <div className="flex min-w-0 flex-1 flex-col p-3.5">
        <h3 className="mb-3 text-sm font-bold text-[var(--app-text)]">
          <span className="mr-1.5 text-[var(--app-muted)]">{index}</span>
          {title}
        </h3>

        <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row">
          <div className="flex min-h-[190px] min-w-0 flex-1">
            <KpiBarChart {...chart} />
          </div>

          <div className="flex shrink-0 flex-col gap-1.5 sm:w-[104px]">
            {sideStats.map((stat) => (
              <div
                key={stat.labelKey}
                className={`rounded-lg px-2 py-1.5 text-center ${
                  stat.emphasis ? '' : 'bg-[var(--app-panel-soft)] border border-[var(--app-border)]'
                }`}
                style={
                  stat.emphasis
                    ? { background: accent, color: '#fff' }
                    : undefined
                }
              >
                <p
                  className={`truncate text-[10px] leading-tight ${
                    stat.emphasis ? 'opacity-90' : 'text-[var(--app-muted)]'
                  }`}
                >
                  {stat.label}
                </p>
                <p
                  className={`text-base font-bold leading-tight ${
                    stat.emphasis ? '' : 'text-[var(--app-text)]'
                  }`}
                >
                  {stat.value}
                </p>
                {stat.detail && (
                  <p className={`text-[10px] leading-tight ${stat.emphasis ? 'opacity-85' : 'text-[var(--app-muted)]'}`}>
                    {stat.detail}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
