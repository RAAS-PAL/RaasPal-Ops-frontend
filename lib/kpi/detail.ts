/**
 * The single-KPI detail view's model: the chart, the headline, and — the point
 * of the view — how the number was reached. For the four live KPIs that is the
 * backend's own definition text plus the arithmetic and the caveats that move
 * it (blank serials, unknown SLA, unclassified rows). For the two placeholders
 * it is the deck's stated basis and a plain statement that nothing was computed.
 */
import type { KpiCaseMetrics, KpiMonth, KpiSegment } from './api-types';
import { toLiveReport } from './from-api';
import { placeholderKpis, PLACEHOLDER_KPIS } from './placeholders';
import type { Period } from './period';
import type { KpiId, KpiPanelData, SideStat } from './types';

export type DetailCell = { numerator: number | null; denominator: number | null; rate: number | null };

export type KpiDetail = {
  id: KpiId;
  index: number;
  titleKey: string;
  accent: string;
  headline: { value: string; detail: string };
  chart: KpiPanelData['chart'];
  sideStats: SideStat[];
  /** True for the four KPIs computed from synced tickets. */
  computed: boolean;
  /** The backend's definition text for a computed KPI, or a message key for a placeholder. */
  formula: { text?: string; key?: string };
  /** "numerator ÷ denominator = result", when the KPI is a rate. */
  arithmetic?: { numerator: number; numeratorKey: string; denominator: number; denominatorKey: string; result: string };
  /** Configured windows that shape the number. */
  windows: { key: string; days: number }[];
  /** Figures that qualify the rate — each is a count with a label key. */
  caveats: { key: string; value: number }[];
  /** Further backend notes (matching, split, category rules). */
  notes: string[];
  /** Per-month numerator/denominator by segment, for the table. */
  monthly: { month: string; all: DetailCell; cleaning: DetailCell; delivery: DetailCell }[];
};

const pct = (v: number | null) => (v === null ? '—' : `${v.toFixed(1)}%`);

type Extract = (s: KpiSegment) => DetailCell;

const extractors: Record<Exclude<KpiId, 'pmComplete' | 'csat'>, Extract> = {
  firstTimeInstall: (s) => ({
    numerator: s.installation.firstTime,
    denominator: s.installation.total,
    rate: s.installation.firstTimeRate,
  }),
  totalCmCases: (s) => ({ numerator: s.cm.total, denominator: null, rate: null }),
  firstTimeFix: (s) => ({ numerator: s.cm.firstTimeFix, denominator: s.cm.total, rate: s.cm.firstTimeFixRate }),
  sla: (s) => ({
    numerator: s.cm.slaWithin,
    denominator: s.cm.slaWithin + s.cm.slaOver,
    rate: s.cm.slaWithinRate,
  }),
};

function monthlyRows(months: KpiMonth[], locale: string, extract: Extract) {
  const fmt = new Intl.DateTimeFormat(locale, { month: 'short', year: 'numeric' });
  return months.map((m) => {
    const [y, mo] = m.month.split('-').map(Number);
    return {
      month: fmt.format(new Date(Date.UTC(y, mo - 1, 1))),
      all: extract(m.all),
      cleaning: extract(m.cleaning),
      delivery: extract(m.delivery),
    };
  });
}

export function kpiDetail(data: KpiCaseMetrics, id: KpiId, period: Period, locale: string): KpiDetail | null {
  const live = toLiveReport(data, locale);
  const def = data.definitions ?? {};
  const notes = [def.matching, def.split, def.category].filter((n): n is string => Boolean(n));

  if ((PLACEHOLDER_KPIS as readonly KpiId[]).includes(id)) {
    const p = placeholderKpis(period).find((x) => x.panel.id === id);
    if (!p) return null;
    return {
      id,
      index: p.panel.index,
      titleKey: p.panel.titleKey,
      accent: p.panel.accent,
      headline: { value: p.headline.value, detail: p.headline.detail },
      chart: p.panel.chart,
      sideStats: p.panel.sideStats,
      computed: false,
      formula: { key: id === 'pmComplete' ? 'detail.pmFormula' : 'detail.csatFormula' },
      windows: [],
      caveats: [],
      notes: [],
      monthly: [],
    };
  }

  const panel = live.panels.find((x) => x.id === id);
  const headline = live.headlines.find((x) => x.id === id);
  if (!panel || !headline) return null;

  const all = data.totals.all;
  const extract = extractors[id as keyof typeof extractors];
  const totals = extract(all);

  const base: Omit<KpiDetail, 'formula' | 'arithmetic' | 'windows' | 'caveats'> = {
    id,
    index: panel.index,
    titleKey: panel.titleKey,
    accent: panel.accent,
    headline: { value: headline.value, detail: headline.detail },
    chart: panel.chart,
    sideStats: panel.sideStats,
    computed: true,
    notes,
    monthly: monthlyRows(data.months, locale, extract),
  };

  switch (id) {
    case 'firstTimeInstall':
      return {
        ...base,
        formula: { text: def.firstTimeInstall },
        arithmetic: {
          numerator: all.installation.firstTime,
          numeratorKey: 'detail.num.installFirstTime',
          denominator: all.installation.total,
          denominatorKey: 'detail.den.installs',
          result: pct(totals.rate),
        },
        windows: [{ key: 'detail.window.install', days: data.installFollowUpDays }],
        caveats: [
          { key: 'detail.caveat.installWithoutSerial', value: all.installation.withoutSerial },
          { key: 'detail.caveat.installFollowedByCm', value: all.installation.followedByCm },
          { key: 'detail.caveat.unclassified', value: data.unclassifiedTickets },
          { key: 'detail.caveat.excludedByCategory', value: data.excludedByCategory },
        ],
      };
    case 'totalCmCases':
      return {
        ...base,
        formula: { text: [def.bucketing, def.category].filter(Boolean).join(' ') },
        windows: [],
        caveats: [
          { key: 'detail.caveat.cleaningCases', value: data.totals.cleaning.cm.total },
          { key: 'detail.caveat.deliveryCases', value: data.totals.delivery.cm.total },
          { key: 'detail.caveat.unclassified', value: data.unclassifiedTickets },
          { key: 'detail.caveat.excludedByCategory', value: data.excludedByCategory },
        ],
      };
    case 'firstTimeFix':
      return {
        ...base,
        formula: { text: def.firstTimeFix },
        arithmetic: {
          numerator: all.cm.firstTimeFix,
          numeratorKey: 'detail.num.fixedFirstTime',
          denominator: all.cm.total,
          denominatorKey: 'detail.den.cmCases',
          result: pct(totals.rate),
        },
        windows: [{ key: 'detail.window.repeat', days: data.repeatWindowDays }],
        caveats: [
          { key: 'detail.caveat.repeat', value: all.cm.repeat },
          { key: 'detail.caveat.cmWithoutSerial', value: all.cm.withoutSerial },
          { key: 'detail.caveat.excludedByCategory', value: data.excludedByCategory },
        ],
      };
    case 'sla':
      return {
        ...base,
        formula: { text: def.sla },
        arithmetic: {
          numerator: all.cm.slaWithin,
          numeratorKey: 'detail.num.slaWithin',
          denominator: all.cm.slaWithin + all.cm.slaOver,
          denominatorKey: 'detail.den.slaMeasured',
          result: pct(totals.rate),
        },
        windows: [],
        caveats: [
          { key: 'detail.caveat.slaOver', value: all.cm.slaOver },
          { key: 'detail.caveat.slaUnknown', value: all.cm.slaUnknown },
          { key: 'detail.caveat.excludedByCategory', value: data.excludedByCategory },
        ],
      };
    default:
      return null;
  }
}
