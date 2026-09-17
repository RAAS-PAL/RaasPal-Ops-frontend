/**
 * PLACEHOLDER DATA — RE workload utilization, deck slide 3 (Jan–Jun 2026).
 *
 * The headline metrics below are printed on the slide. The three analysis
 * sections (per-person workload, work-type mix, monthly trend) are charts whose
 * underlying numbers are NOT in the deck's text layer, so they are declared here
 * without data and render an empty state — inventing per-person figures would be
 * worse than showing nothing. They need the RE_Productivity source sheet.
 *
 * Note the deck's own caveats: the per-person view is "Top 15 field work only",
 * helpdesk MD is excluded from field utilization, and Jan–Apr travel is
 * estimated from the May–Jun average by type rather than measured.
 */
import type { UtilizationReport } from './types';
import { KPI_COLORS } from './fixtures';

export const RE_UTILIZATION_JAN_JUN_2026: UtilizationReport = {
  period: 'Jan - Jun 2026',

  metrics: [
    { key: 'work', labelKey: 'utilization.metrics.work', value: '969.5', detailKey: 'utilization.metrics.workDetail', color: KPI_COLORS.cmTotal },
    { key: 'travel', labelKey: 'utilization.metrics.travel', value: '832.7', detailKey: 'utilization.metrics.travelDetail', color: KPI_COLORS.install },
    { key: 'total', labelKey: 'utilization.metrics.total', value: '1,802.2', detailKey: 'utilization.metrics.totalDetail', color: KPI_COLORS.pm },
    { key: 'utilization', labelKey: 'utilization.metrics.utilization', value: '91.0%', detailKey: 'utilization.metrics.utilizationDetail', color: KPI_COLORS.sla },
    { key: 'helpdesk', labelKey: 'utilization.metrics.helpdesk', value: '139.5', detailKey: 'utilization.metrics.helpdeskDetail', color: KPI_COLORS.ftf },
    { key: 'topWorkType', labelKey: 'utilization.metrics.topWorkType', value: 'CM', detailKey: 'utilization.metrics.topWorkTypeDetail', color: KPI_COLORS.csat },
  ],

  factorKeys: [
    'utilization.factors.standard',
    'utilization.factors.cm',
    'utilization.factors.pm',
    'utilization.factors.half',
    'utilization.factors.meeting',
    'utilization.factors.travel',
    'utilization.factors.estimate',
  ],

  actionKeys: [
    'utilization.actions.cm',
    'utilization.actions.travel',
    'utilization.actions.capacity',
  ],

  sections: [
    { key: 'perPerson', titleKey: 'utilization.sections.perPerson' },
    { key: 'workMix', titleKey: 'utilization.sections.workMix' },
    { key: 'monthlyTrend', titleKey: 'utilization.sections.monthlyTrend' },
  ],
};
