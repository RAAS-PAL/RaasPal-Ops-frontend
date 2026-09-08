/**
 * Turns `GET /api/v1/kpi/cm-cases` into the panels the report tab already
 * renders, so the components below it did not have to change when the data
 * stopped being a constant.
 *
 * Four of the deck's six KPIs are computed from the monday ticket mirror:
 * 1st Time Install, Total CM Cases, First Time Fix and SLA. The other two —
 * PM Complete and CSAT — have no source anywhere in the backend, so they are
 * deliberately absent here rather than filled with a plausible-looking number.
 * The tab slots badged placeholders into their positions (see
 * lib/kpi/placeholders.ts), which is why the panel indices here are the deck's
 * 1, 3, 4 and 5 rather than 1–4.
 *
 * A `null` rate means the denominator was zero. It is rendered as an em dash,
 * never as 0%: "no cases to measure" and "nothing was fixed first time" are
 * opposite readings and the difference is visible to a board.
 */
import type { KpiCaseMetrics, KpiMonth, KpiSegment } from './api-types';
import { KPI_COLORS } from './fixtures';
import { formatPeriod } from './period';
import type { KpiHeadline, KpiPanelData, MonthlyPoint } from './types';

const CLEANING = '#2563EB';
const DELIVERY = '#6BA6F7';
const WITHIN = '#34A853';
const OVER = '#E8A33D';

/** '2026-01' → 'Jan', in the viewer's locale. */
function monthLabel(month: string, locale: string): string {
  const [year, m] = month.split('-').map(Number);
  return new Intl.DateTimeFormat(locale, { month: 'short' }).format(new Date(Date.UTC(year, m - 1, 1)));
}

const pct = (value: number | null): string => (value === null ? '—' : `${value.toFixed(1)}%`);
const count = (value: number): string => value.toLocaleString();

/** A month series, reading one number out of each month's segment. */
function series(
  months: KpiMonth[],
  locale: string,
  segment: (m: KpiMonth) => KpiSegment,
  value: (s: KpiSegment) => number | null,
): MonthlyPoint[] {
  return months.map((m) => ({ month: monthLabel(m.month, locale), value: value(segment(m)) }));
}

export type LiveKpiReport = {
  headlines: KpiHeadline[];
  panels: KpiPanelData[];
  /** True when the range genuinely contains no tickets, so the page can say so. */
  empty: boolean;
};

export function toLiveReport(data: KpiCaseMetrics, locale: string): LiveKpiReport {
  const { months, totals } = data;
  const all = totals.all;
  const cleaning = totals.cleaning;
  const delivery = totals.delivery;

  const headlines: KpiHeadline[] = [
    {
      id: 'firstTimeInstall',
      labelKey: 'kpis.firstTimeInstall',
      value: pct(all.installation.firstTimeRate),
      detail: `${all.installation.firstTime}/${all.installation.total} installs`,
      color: KPI_COLORS.install,
    },
    {
      id: 'totalCmCases',
      labelKey: 'kpis.totalCmCases',
      value: count(all.cm.total),
      detail: formatPeriod({ from: data.from, to: data.to }, locale),
      color: KPI_COLORS.cmTotal,
    },
    {
      id: 'firstTimeFix',
      labelKey: 'kpis.firstTimeFix',
      value: pct(all.cm.firstTimeFixRate),
      detail: `${all.cm.firstTimeFix}/${all.cm.total} cases`,
      color: KPI_COLORS.ftf,
    },
    {
      id: 'sla',
      labelKey: 'kpis.sla',
      value:
        all.cm.slaWithinRate === null
          ? '—'
          : `${all.cm.slaWithinRate.toFixed(1)}% / ${(100 - all.cm.slaWithinRate).toFixed(1)}%`,
      detail: `${all.cm.slaWithin} W | ${all.cm.slaOver} O`,
      color: KPI_COLORS.sla,
    },
  ];

  const panels: KpiPanelData[] = [
    {
      id: 'firstTimeInstall',
      index: 1,
      titleKey: 'panels.firstTimeInstall',
      accent: KPI_COLORS.install,
      chart: {
        // The deck draws one overall bar per month here; the cleaning/delivery
        // split lives in the side stats (and the detail view's table).
        mode: 'single',
        unit: 'percent',
        showValueLabels: true,
        series: [
          {
            key: 'install',
            labelKey: 'legend.install',
            color: CLEANING,
            points: series(months, locale, (m) => m.all, (s) => s.installation.firstTimeRate),
          },
        ],
        ...(all.installation.firstTimeRate !== null && {
          average: {
            value: all.installation.firstTimeRate,
            labelKey: 'chart.avg',
            display: `Avg ${pct(all.installation.firstTimeRate)}`,
          },
        }),
      },
      sideStats: [
        {
          labelKey: 'stats.overall',
          value: pct(all.installation.firstTimeRate),
          detail: `${all.installation.firstTime}/${all.installation.total}`,
          emphasis: true,
        },
        {
          labelKey: 'segments.cleaning',
          value: pct(cleaning.installation.firstTimeRate),
          detail: `${cleaning.installation.firstTime}/${cleaning.installation.total}`,
        },
        {
          labelKey: 'segments.delivery',
          value: pct(delivery.installation.firstTimeRate),
          detail: `${delivery.installation.firstTime}/${delivery.installation.total}`,
        },
      ],
    },
    {
      id: 'totalCmCases',
      index: 3,
      titleKey: 'panels.totalCmCases',
      accent: KPI_COLORS.cmTotal,
      chart: {
        mode: 'stacked',
        unit: 'count',
        showValueLabels: true,
        series: [
          {
            key: 'cleaning',
            labelKey: 'segments.cleaning',
            color: CLEANING,
            points: series(months, locale, (m) => m.cleaning, (s) => s.cm.total),
          },
          {
            key: 'delivery',
            labelKey: 'segments.delivery',
            color: DELIVERY,
            points: series(months, locale, (m) => m.delivery, (s) => s.cm.total),
          },
        ],
        ...(months.length > 0 && {
          average: {
            value: all.cm.total / months.length,
            labelKey: 'chart.avg',
            display: `Avg ${Math.round(all.cm.total / months.length).toLocaleString()}`,
          },
        }),
      },
      sideStats: [
        { labelKey: 'stats.total', value: count(all.cm.total), detail: 'cases', emphasis: true },
        { labelKey: 'segments.cleaning', value: count(cleaning.cm.total), detail: 'cases' },
        { labelKey: 'segments.delivery', value: count(delivery.cm.total), detail: 'cases' },
        {
          labelKey: 'stats.avgPerMonth',
          value: months.length ? Math.round(all.cm.total / months.length).toLocaleString() : '—',
          detail: 'cases',
        },
      ],
    },
    {
      id: 'firstTimeFix',
      index: 4,
      titleKey: 'panels.firstTimeFix',
      accent: KPI_COLORS.ftf,
      chart: {
        mode: 'grouped',
        unit: 'percent',
        showValueLabels: true,
        series: [
          {
            key: 'cleaning',
            labelKey: 'segments.cleaning',
            color: CLEANING,
            points: series(months, locale, (m) => m.cleaning, (s) => s.cm.firstTimeFixRate),
          },
          {
            key: 'delivery',
            labelKey: 'segments.delivery',
            color: DELIVERY,
            points: series(months, locale, (m) => m.delivery, (s) => s.cm.firstTimeFixRate),
          },
        ],
        ...(all.cm.firstTimeFixRate !== null && {
          average: {
            value: all.cm.firstTimeFixRate,
            labelKey: 'chart.avg',
            display: `Avg ${pct(all.cm.firstTimeFixRate)}`,
          },
        }),
        footnote: `Repeat window ${data.repeatWindowDays} days`,
      },
      sideStats: [
        {
          labelKey: 'stats.overall',
          value: pct(all.cm.firstTimeFixRate),
          detail: `${all.cm.firstTimeFix}/${all.cm.total}`,
          emphasis: true,
        },
        {
          labelKey: 'segments.cleaning',
          value: pct(cleaning.cm.firstTimeFixRate),
          detail: `${cleaning.cm.firstTimeFix}/${cleaning.cm.total}`,
        },
        {
          labelKey: 'segments.delivery',
          value: pct(delivery.cm.firstTimeFixRate),
          detail: `${delivery.cm.firstTimeFix}/${delivery.cm.total}`,
        },
      ],
    },
    {
      id: 'sla',
      index: 5,
      titleKey: 'panels.sla',
      accent: KPI_COLORS.sla,
      chart: {
        mode: 'stacked',
        unit: 'percent',
        showValueLabels: true,
        series: [
          {
            key: 'within',
            labelKey: 'legend.within',
            color: WITHIN,
            points: series(months, locale, (m) => m.all, (s) => s.cm.slaWithinRate),
          },
          {
            key: 'over',
            labelKey: 'legend.over',
            color: OVER,
            points: series(months, locale, (m) => m.all, (s) =>
              s.cm.slaWithinRate === null ? null : Number((100 - s.cm.slaWithinRate).toFixed(1)),
            ),
          },
        ],
        ...(all.cm.slaWithinRate !== null && {
          average: {
            value: all.cm.slaWithinRate,
            labelKey: 'chart.avgSla',
            display: `Avg SLA ${pct(all.cm.slaWithinRate)}`,
          },
        }),
        // Unknowns are excluded from the rate, so saying how many there are is
        // the difference between "77% on time" and "77% of the third we measured".
        footnote: `${all.cm.slaUnknown.toLocaleString()} case(s) have no RE Action date and are not counted`,
      },
      sideStats: [
        { labelKey: 'legend.within', value: pct(all.cm.slaWithinRate), detail: count(all.cm.slaWithin), emphasis: true },
        {
          labelKey: 'legend.over',
          value: all.cm.slaWithinRate === null ? '—' : pct(Number((100 - all.cm.slaWithinRate).toFixed(1))),
          detail: count(all.cm.slaOver),
        },
      ],
    },
  ];

  return { headlines, panels, empty: data.ticketCount === 0 };
}
