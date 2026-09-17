/**
 * PLACEHOLDER DATA — repeat cost, deck slides 4–5 (Jan–Jun 2026).
 *
 * The deck is explicit that these Baht figures are an example, not an invoice:
 * "ตัวอย่างเท่านั้น • ปรับตาม KM/Manday/Parts จริง" — adjust to real km, manday
 * and parts. It also states the governing principle: repeat cost must come from
 * verifiable ticket events, never from multiplying a KPI denominator.
 *
 * That is why the rates live here as data rather than as constants inside the
 * component: when the real cost model arrives they become editable inputs.
 * The line totals below sum to 806,247 (≈ ฿806K), matching the deck.
 */
import type { RepeatCostReport } from './types';
import { KPI_COLORS } from './fixtures';

export const RE_REPEAT_COST_JAN_JUN_2026: RepeatCostReport = {
  period: 'Jan - Jun 2026',

  headlines: [
    { key: 'installRepeat', labelKey: 'repeat.headlines.installRepeat', value: '9', detailKey: 'repeat.headlines.installRepeatDetail', color: KPI_COLORS.install },
    { key: 'installCost', labelKey: 'repeat.headlines.installCost', value: '12', detailKey: 'repeat.headlines.installCostDetail', color: KPI_COLORS.pm },
    { key: 'cmRepeat', labelKey: 'repeat.headlines.cmRepeat', value: '351', detailKey: 'repeat.headlines.cmRepeatDetail', color: KPI_COLORS.cmTotal },
    { key: 'cmCost', labelKey: 'repeat.headlines.cmCost', value: '146', detailKey: 'repeat.headlines.cmCostDetail', color: KPI_COLORS.csat },
  ],

  breakdowns: [
    {
      key: 'installation',
      titleKey: 'repeat.breakdowns.installation',
      accent: KPI_COLORS.install,
      kpiVolume: '9',
      kpiVolumeLabelKey: 'repeat.labels.kpiVolumeInstall',
      costEvents: '12',
      costEventsLabelKey: 'repeat.labels.costEvents',
      channels: [
        { labelKey: 'repeat.channels.onsite', count: 8 },
        { labelKey: 'repeat.channels.online', count: 4 },
        { labelKey: 'repeat.channels.logistics', count: 0 },
      ],
      split: { localLabelKey: 'repeat.labels.local', local: 3, provinceLabelKey: 'repeat.labels.province', province: 9 },
      avgKm: { local: 93, province: 364 },
      unitCost: { localBaht: 5280, provinceBaht: 11600 },
      totalBaht: 88000,
    },
    {
      key: 'cm',
      titleKey: 'repeat.breakdowns.cm',
      accent: KPI_COLORS.cmTotal,
      kpiVolume: '351',
      kpiVolumeLabelKey: 'repeat.labels.kpiVolumeCm',
      costEvents: '146',
      costEventsLabelKey: 'repeat.labels.costEvents',
      channels: [
        { labelKey: 'repeat.channels.onsite', count: 85 },
        { labelKey: 'repeat.channels.online', count: 55 },
        { labelKey: 'repeat.channels.logistics', count: 6 },
      ],
      split: { localLabelKey: 'repeat.labels.local', local: 65, provinceLabelKey: 'repeat.labels.province', province: 81 },
      avgKm: { local: 72, province: 766 },
      unitCost: { localBaht: 2930, provinceBaht: 13149 },
      totalBaht: 718000,
    },
  ],

  costLines: [
    { key: 'installLocal', labelKey: 'repeat.lines.installLocal', qty: '1', unit: '฿5,280', total: 5280 },
    { key: 'installProvince', labelKey: 'repeat.lines.installProvince', qty: '7', unit: '฿11,600', total: 81200 },
    { key: 'installOnline', labelKey: 'repeat.lines.installOnline', qty: '4', unit: '฿500', total: 2000 },
    { key: 'cmLocal', labelKey: 'repeat.lines.cmLocal', qty: '42', unit: '฿2,930', total: 123060 },
    { key: 'cmProvince', labelKey: 'repeat.lines.cmProvince', qty: '43', unit: '฿13,149', total: 565407 },
    { key: 'cmOnlineLogistics', labelKey: 'repeat.lines.cmOnlineLogistics', qty: '55 + 6', unit: '฿500 / ฿300', total: 29300 },
  ],

  totals: {
    repeatCost: 806000,
    incentive: 466500,
    gap: 340000,
    incentiveBasisKey: 'repeat.labels.incentiveBasis',
  },
};
