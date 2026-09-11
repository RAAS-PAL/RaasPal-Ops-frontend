/**
 * PLACEHOLDER DATA — the figures from the Jan–Jun 2026 RE Team KPI deck.
 *
 * Nothing in the backend can produce these numbers yet: CmReport has no SLA
 * timestamps, no repeat linkage and no CSAT field, and the Monday.com module
 * persists nothing (see docs/re-kpi-dashboard-plan.md). These constants exist so
 * the page can be built and reviewed against the real deck; they are typed to
 * KpiReport so swapping in the API is a one-line change at the call site.
 *
 * Formulas and the real source are still to be defined — do not treat anything
 * here as computed. Two values needed care:
 *   - May cleaning CM (38) is not labelled in the deck. It is derived as
 *     203 total − 165 delivery, and confirmed by the half-year totals:
 *     184+112+139+66+38+104 = 643 cleaning, 146+131+136+111+165+126 = 815
 *     delivery, 643+815 = 1,458. So it is arithmetic, not a guess.
 *   - PM task counts are marked "(est.)" in the deck itself, and Jan–Apr travel
 *     is estimated from the May–Jun average. Both stay flagged in the UI.
 */
import type { KpiReport } from './types';

/** Accent colours, matching the deck's tile order. */
export const KPI_COLORS = {
  install: '#E0912F',
  pm: '#7C3AED',
  cmTotal: '#2563EB',
  ftf: '#5B93F5',
  sla: '#2FA36B',
  csat: '#DC2F2F',
} as const;

/** Series colours shared across the panels. */
const CLEANING = '#2563EB';
const DELIVERY = '#6BA6F7';
const WITHIN = '#34A853';
const OVER = '#E8A33D';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

/** Helper: pair the fixed month labels with a row of values. */
const points = (values: (number | null)[]) =>
  MONTHS.map((month, i) => ({ month, value: values[i] ?? null }));

export const RE_KPI_REPORT_JAN_JUN_2026: KpiReport = {
  period: 'Jan - Jun 2026',
  months: MONTHS,

  headlines: [
    { id: 'firstTimeInstall', labelKey: 'kpis.firstTimeInstall', value: '60.9%', detail: '14/23 installs', color: KPI_COLORS.install },
    { id: 'pmComplete', labelKey: 'kpis.pmComplete', value: '90.3%', detail: '247.9/274.5 tasks (est.)', color: KPI_COLORS.pm },
    { id: 'totalCmCases', labelKey: 'kpis.totalCmCases', value: '1,458', detail: 'Jan–Jun 2026', color: KPI_COLORS.cmTotal },
    { id: 'firstTimeFix', labelKey: 'kpis.firstTimeFix', value: '72.3%', detail: '919/1270 KPI cases', color: KPI_COLORS.ftf },
    { id: 'sla', labelKey: 'kpis.sla', value: '77.2% / 22.8%', detail: '980 W | 290 O', color: KPI_COLORS.sla },
  ],

  panels: [
    {
      id: 'firstTimeInstall',
      index: 1,
      titleKey: 'panels.firstTimeInstall',
      accent: KPI_COLORS.install,
      chart: {
        mode: 'single',
        unit: 'percent',
        showValueLabels: true,
        series: [{ key: 'install', labelKey: 'legend.install', color: CLEANING, points: points([50, 80, 0, 80, 75, 0]) }],
        average: { value: 60.9, labelKey: 'chart.avg', display: 'Avg 60.9%' },
      },
      sideStats: [
        { labelKey: 'stats.overall', value: '60.9%', detail: '14/23', emphasis: true },
        { labelKey: 'segments.cleaning', value: '58.8%', detail: '10/17' },
        { labelKey: 'segments.delivery', value: '66.7%', detail: '4/6' },
      ],
    },
    {
      id: 'pmComplete',
      index: 2,
      titleKey: 'panels.pmComplete',
      accent: KPI_COLORS.pm,
      chart: {
        mode: 'single',
        unit: 'percent',
        showValueLabels: true,
        // The deck paints a month orange when PM fell short of 100%.
        series: [
          {
            key: 'pm',
            labelKey: 'legend.pm',
            color: WITHIN,
            points: points([100, 100, 91, 100, 87, 87]).map((p) =>
              p.value !== null && p.value < 100 ? { ...p, color: OVER } : p,
            ),
          },
        ],
        average: { value: 90.3, labelKey: 'chart.avg', display: 'Avg 90.3%' },
        footnote: 'Cleaning 95.6%  |  Delivery 81.2%',
      },
      sideStats: [
        { labelKey: 'stats.overall', value: '90.3%', detail: '247.9/274.5', emphasis: true },
        { labelKey: 'stats.yip', value: '80.0%' },
        { labelKey: 'stats.raaspal', value: '95.1%' },
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
          { key: 'cleaning', labelKey: 'segments.cleaning', color: CLEANING, points: points([184, 112, 139, 66, 38, 104]) },
          { key: 'delivery', labelKey: 'segments.delivery', color: DELIVERY, points: points([146, 131, 136, 111, 165, 126]) },
        ],
        average: { value: 243, labelKey: 'chart.avg', display: 'Avg 243' },
      },
      sideStats: [
        { labelKey: 'stats.total', value: '1,458', detail: 'cases', emphasis: true },
        { labelKey: 'segments.cleaning', value: '643', detail: 'cases' },
        { labelKey: 'segments.delivery', value: '815', detail: 'cases' },
        { labelKey: 'stats.avgPerMonth', value: '243', detail: 'cases' },
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
          { key: 'cleaning', labelKey: 'segments.cleaning', color: CLEANING, points: points([53, 71, 81, 61, 38, 66]) },
          { key: 'delivery', labelKey: 'segments.delivery', color: DELIVERY, points: points([68, 79, 75, 85, 81, 79]) },
        ],
        average: { value: 72.3, labelKey: 'chart.avg', display: 'Avg 72.3%' },
      },
      sideStats: [
        { labelKey: 'stats.overall', value: '72.3%', detail: '919/1270', emphasis: true },
        { labelKey: 'segments.cleaning', value: '63.6%', detail: '306/480' },
        { labelKey: 'segments.delivery', value: '77.6%', detail: '613/790' },
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
          { key: 'within', labelKey: 'legend.within', color: WITHIN, points: points([67, 86, 85, 74, 75, 79]) },
          { key: 'over', labelKey: 'legend.over', color: OVER, points: points([33, 14, 15, 26, 25, 21]) },
        ],
        average: { value: 77.2, labelKey: 'chart.avgSla', display: 'Avg SLA 77.2%' },
        footnote: 'Cleaning SLA 66.7%  |  Delivery SLA 83.5%',
      },
      sideStats: [
        { labelKey: 'legend.within', value: '77.2%', detail: '980', emphasis: true },
        { labelKey: 'legend.over', value: '22.8%', detail: '290' },
      ],
    },
  ],

  takeaways: [
    { index: 1, color: KPI_COLORS.install, titleKey: 'takeaways.installFtfr.title', bodyKey: 'takeaways.installFtfr.body' },
    { index: 2, color: KPI_COLORS.pm, titleKey: 'takeaways.pm.title', bodyKey: 'takeaways.pm.body' },
    { index: 3, color: KPI_COLORS.sla, titleKey: 'takeaways.sla.title', bodyKey: 'takeaways.sla.body' },
    { index: 4, color: KPI_COLORS.csat, titleKey: 'takeaways.customer.title', bodyKey: 'takeaways.customer.body' },
  ],
};
