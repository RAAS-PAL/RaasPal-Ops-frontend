/**
 * Turns `GET /api/v1/kpi/cm-cases` into the panels the report tab already
 * renders, so the components below it did not have to change when the data
 * stopped being a constant.
 *
 * Four of the deck's KPIs are computed from the monday ticket mirror:
 * 1st Time Install, Total CM Cases, First Time Fix and SLA. PM Complete has no
 * source anywhere in the backend, so it is deliberately absent here rather than
 * filled with a plausible-looking number; the tab slots a badged placeholder
 * into its position (see lib/kpi/placeholders.ts), which is why the panel
 * indices here are the deck's 1, 3, 4 and 5 rather than 1–4. CSAT is not a
 * report KPI at all any more — it is a monthly hand tally from the survey
 * workbooks, on its own page (components/kpi/CsatTab.tsx).
 *
 * A `null` rate means the denominator was zero. It is rendered as an em dash,
 * never as 0%: "no cases to measure" and "nothing was fixed first time" are
 * opposite readings and the difference is visible to a board.
 */
import type { KpiCaseMetrics, KpiMonth, KpiSegment } from './api-types';
import { KPI_COLORS } from './fixtures';
import { dateLocale, formatPeriod } from './period';
import type { KpiHeadline, KpiPanelData, MonthlyPoint, Translate } from './types';

const CLEANING = '#2563EB';
const DELIVERY = '#6BA6F7';
const WITHIN = '#34A853';
const OVER = '#E8A33D';

/** '2026-01' → 'Jan', in the viewer's locale. */
function monthLabel(month: string, locale: string): string {
  const [year, m] = month.split('-').map(Number);
  return new Intl.DateTimeFormat(dateLocale(locale), { month: 'short' }).format(new Date(Date.UTC(year, m - 1, 1)));
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

export function toLiveReport(data: KpiCaseMetrics, locale: string, t: Translate): LiveKpiReport {
  const { months, totals } = data;
  const all = totals.all;
  const cleaning = totals.cleaning;
  const delivery = totals.delivery;
  const unplacedInstalls =
    all.installation.total - cleaning.installation.total - delivery.installation.total;

  const headlines: KpiHeadline[] = [
    {
      id: 'firstTimeInstall',
      labelKey: 'kpis.firstTimeInstall',
      value: pct(all.installation.firstTimeRate),
      detail: t('live.headlineInstalls', { done: all.installation.firstTime, total: all.installation.total }),
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
      detail: t('live.headlineCases', { done: all.cm.firstTimeFix, total: all.cm.total }),
      color: KPI_COLORS.ftf,
    },
    {
      id: 'sla',
      labelKey: 'kpis.sla',
      value:
        all.cm.slaWithinRate === null
          ? '—'
          : `${all.cm.slaWithinRate.toFixed(1)}% / ${(100 - all.cm.slaWithinRate).toFixed(1)}%`,
      detail: t('live.headlineSla', { within: all.cm.slaWithin, over: all.cm.slaOver }),
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
            display: t('chart.avgValue', { value: pct(all.installation.firstTimeRate) }),
          },
        }),
        // The two lines do not add up to the total here, unlike every CM panel:
        // an install with no matching serial counts in the total but in neither
        // line. Say so, or the side boxes look like a rounding fault.
        ...(unplacedInstalls > 0 && {
          footnote: t('live.footnoteUnplaced', { unplaced: unplacedInstalls, total: all.installation.total }),
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
            display: t('chart.avgValue', { value: Math.round(all.cm.total / months.length).toLocaleString() }),
          },
        }),
      },
      sideStats: [
        { labelKey: 'stats.total', value: count(all.cm.total), detail: t('units.cases'), emphasis: true },
        { labelKey: 'segments.cleaning', value: count(cleaning.cm.total), detail: t('units.cases') },
        { labelKey: 'segments.delivery', value: count(delivery.cm.total), detail: t('units.cases') },
        {
          labelKey: 'stats.avgPerMonth',
          value: months.length ? Math.round(all.cm.total / months.length).toLocaleString() : '—',
          detail: t('units.cases'),
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
            display: t('chart.avgValue', { value: pct(all.cm.firstTimeFixRate) }),
          },
        }),
        footnote: t('live.footnoteRepeatWindow', { days: data.repeatWindowDays }),
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
            display: t('chart.avgSlaValue', { value: pct(all.cm.slaWithinRate) }),
          },
        }),
        // Unknowns are excluded from the rate, so saying how many there are is
        // the difference between "77% on time" and "77% of the third we measured".
        footnote: t('live.footnoteSlaUnknown', { count: all.cm.slaUnknown.toLocaleString() }),
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
