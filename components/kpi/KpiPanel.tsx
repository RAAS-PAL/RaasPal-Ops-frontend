/**
 * One numbered KPI panel: chart on the left, supporting figures on the right,
 * with a coloured spine identifying the KPI (the deck's visual language).
 *
 * The side stats stack under the chart on narrow screens rather than squeezing
 * beside it, since the deck's fixed 16:9 layout has no mobile equivalent.
 *
 * A panel may carry a badge (a placeholder with no backend source) or, when
 * there is nothing honest to chart for the period, an `emptyMessage` that
 * replaces the chart and figures entirely.
 */
import { ChevronRight } from 'lucide-react';
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
  /** Badge text; its presence marks the panel as a placeholder. */
  badge?: string;
  /** When set, shown instead of the chart and side stats. */
  emptyMessage?: string;
  /** Makes the whole panel a button that opens the KPI's detail view. */
  onSelect?: () => void;
  /** Accessible hint for the click affordance, e.g. "View details". */
  selectLabel?: string;
};

export function KpiPanel({ index, title, accent, chart, sideStats, badge, emptyMessage, onSelect, selectLabel }: Props) {
  const interactive = Boolean(onSelect);
  return (
    <section
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={interactive ? `${title} — ${selectLabel ?? ''}`.trim() : undefined}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (!onSelect) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      className={`group flex overflow-hidden rounded-xl border bg-[var(--app-panel)] shadow-sm transition ${
        badge ? 'border-dashed border-[var(--app-border-strong)]' : 'border-[var(--app-border)]'
      } ${
        interactive
          ? 'cursor-pointer outline-none hover:border-[var(--app-brand)] hover:shadow-md focus-visible:ring-2 focus-visible:ring-[var(--app-brand)]'
          : ''
      }`}
    >
      <div aria-hidden className="w-1.5 shrink-0" style={{ background: accent }} />

      <div className="flex min-w-0 flex-1 flex-col p-3.5">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-[var(--app-text)]">
          <span className="text-[var(--app-muted)]">{index}</span>
          {title}
          {badge && (
            <span className="rounded border border-[var(--app-border-strong)] bg-[var(--app-panel-soft)] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[var(--app-muted)]">
              {badge}
            </span>
          )}
          {interactive && (
            <span className="ml-auto inline-flex items-center gap-0.5 text-[11px] font-medium text-[var(--app-muted)] opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
              {selectLabel}
              <ChevronRight className="h-3.5 w-3.5" />
            </span>
          )}
        </h3>

        {emptyMessage ? (
          <div className="flex min-h-[190px] flex-1 items-center justify-center rounded-lg border border-dashed border-[var(--app-border-strong)] bg-[var(--app-panel-soft)] p-4 text-center">
            <p className="max-w-xs text-xs leading-relaxed text-[var(--app-muted)]">{emptyMessage}</p>
          </div>
        ) : (
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
        )}
      </div>
    </section>
  );
}
