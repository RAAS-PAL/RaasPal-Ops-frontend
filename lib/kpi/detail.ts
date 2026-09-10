/**
 * The single-KPI detail view's model: the chart, the headline, and — the point
 * of the view — how the number was reached. For the four live KPIs that is the
 * backend's own definition text plus the equation and a breakdown of every
 * count involved. For the two placeholders it is the deck's stated basis and a
 * plain statement that nothing was computed.
 *
 * The formula and notes shown here are localised message strings rather than
 * the backend's `definitions` text, which the API only returns in English. They
 * mirror it deliberately and must be updated together; the window lengths are
 * interpolated from the response so the numbers in them cannot drift.
 *
 * Breakdowns are trees, not lists. Each one names the total it partitions
 * ("59 installs") and every row is either a part of that total (level 0) or an
 * "of which" part of the row above it (level 1). That is what makes a figure
 * like "30 installs with no serial" readable: it sits under "52 scored 1" in
 * one tree and under "38 could not be placed" in the other, so the reader can
 * see it is the same 30 rows counted from two angles rather than a third group.
 */
import type { KpiCaseMetrics, KpiMonth, KpiSegment } from './api-types';
import { toLiveReport } from './from-api';
import { placeholderKpis, PLACEHOLDER_KPIS } from './placeholders';
import { dateLocale, type Period } from './period';
import type { KpiId, KpiPanelData, SideStat, Translate } from './types';

export type DetailCell = { numerator: number | null; denominator: number | null; rate: number | null };

export type Arithmetic = {
  operator: 'divide' | 'add';
  left: { value: number; key: string };
  right: { value: number; key: string };
  result: string;
};

export type BreakdownRow = {
  key: string;
  value: number;
  /** 0 = a part of the total; 1 = "of which" — a part of the level-0 row above. */
  level: 0 | 1;
  /** Marks a row as the KPI's pass, fail, or a count that is neither. */
  tone?: 'success' | 'failure' | 'muted';
};

export type Breakdown = {
  titleKey: string;
  /** What the level-0 rows add up to, e.g. 59 installs. */
  total: { value: number; unitKey: string };
  rows: BreakdownRow[];
};

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
  /** The sum or the ratio behind the headline, shown as an equation. */
  arithmetic?: Arithmetic;
  /** Configured windows that shape the number. */
  windows: { key: string; days: number }[];
  /** Every count involved, as trees that add up. */
  breakdowns: Breakdown[];
  /** Board rows in the period that never entered the total (not a KPI case). */
  leftOut: number;
  /** Further backend notes (matching, split, category rules). */
  notes: string[];
  /** Per-month numerator/denominator by segment, for the table. */
  monthly: { month: string; all: DetailCell; cleaning: DetailCell; delivery: DetailCell }[];
};

const pct = (v: number | null) => (v === null ? '—' : `${v.toFixed(1)}%`);

type Extract = (s: KpiSegment) => DetailCell;

const extractors: Record<Exclude<KpiId, 'pmComplete'>, Extract> = {
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
  const fmt = new Intl.DateTimeFormat(dateLocale(locale), { month: 'short', year: 'numeric' });
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

/** Cleaning + delivery of one total — the two lines always add up for CMs. */
function byLine(total: number, unitKey: string, cleaning: number, delivery: number): Breakdown {
  return {
    titleKey: 'detail.bd.byLine',
    total: { value: total, unitKey },
    rows: [
      { key: 'segments.cleaning', value: cleaning, level: 0 },
      { key: 'segments.delivery', value: delivery, level: 0 },
    ],
  };
}

export function kpiDetail(
  data: KpiCaseMetrics,
  id: KpiId,
  period: Period,
  locale: string,
  t: Translate,
): KpiDetail | null {
  const live = toLiveReport(data, locale, t);
  /** The backend's own wording, kept as a fallback if a translation is missing. */
  const def = data.definitions ?? {};
  const notes = (...keys: string[]) => keys.map((k) => t(`detail.apiNotes.${k}`) || def[k]).filter(Boolean);

  if ((PLACEHOLDER_KPIS as readonly KpiId[]).includes(id)) {
    const p = placeholderKpis(period, t, locale).find((x) => x.panel.id === id);
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
      formula: { key: 'detail.pmFormula' },
      windows: [],
      breakdowns: [],
      leftOut: 0,
      notes: [],
      monthly: [],
    };
  }

  const panel = live.panels.find((x) => x.id === id);
  const headline = live.headlines.find((x) => x.id === id);
  if (!panel || !headline) return null;

  const { all, cleaning, delivery } = data.totals;
  const extract = extractors[id as keyof typeof extractors];
  const totals = extract(all);

  const base = {
    id,
    index: panel.index,
    titleKey: panel.titleKey,
    accent: panel.accent,
    headline: { value: headline.value, detail: headline.detail },
    chart: panel.chart,
    sideStats: panel.sideStats,
    computed: true as const,
    leftOut: data.excludedByCategory,
    monthly: monthlyRows(data.months, locale, extract),
  };

  switch (id) {
    case 'firstTimeInstall': {
      const inst = all.installation;
      // An install with no serial cannot be placed in a line, so every one of
      // them is inside the unplaced count; the remainder carry a serial no CM
      // board has ever named.
      const placed = cleaning.installation.total + delivery.installation.total;
      const unplaced = inst.total - placed;
      const unplacedNoSerial = Math.min(inst.withoutSerial, unplaced);
      return {
        ...base,
        formula: { text: t('detail.formulaText.firstTimeInstall', { days: data.installFollowUpDays }) },
        arithmetic: {
          operator: 'divide',
          left: { value: inst.firstTime, key: 'detail.num.installFirstTime' },
          right: { value: inst.total, key: 'detail.den.installs' },
          result: pct(totals.rate),
        },
        windows: [{ key: 'detail.window.install', days: data.installFollowUpDays }],
        breakdowns: [
          {
            titleKey: 'detail.bd.scoring',
            total: { value: inst.total, unitKey: 'detail.den.installs' },
            rows: [
              { key: 'detail.row.installPass', value: inst.firstTime, level: 0, tone: 'success' },
              { key: 'detail.row.passVerified', value: inst.firstTime - inst.withoutSerial, level: 1 },
              { key: 'detail.row.passNoSerial', value: inst.withoutSerial, level: 1, tone: 'muted' },
              { key: 'detail.row.installFail', value: inst.followedByCm, level: 0, tone: 'failure' },
            ],
          },
          {
            titleKey: 'detail.bd.split',
            total: { value: inst.total, unitKey: 'detail.den.installs' },
            rows: [
              { key: 'detail.row.placed', value: placed, level: 0 },
              { key: 'detail.row.placedCleaning', value: cleaning.installation.total, level: 1 },
              { key: 'detail.row.placedDelivery', value: delivery.installation.total, level: 1 },
              { key: 'detail.row.unplaced', value: unplaced, level: 0, tone: 'muted' },
              { key: 'detail.row.unplacedNoSerial', value: unplacedNoSerial, level: 1 },
              { key: 'detail.row.unplacedUnknownSerial', value: unplaced - unplacedNoSerial, level: 1 },
            ],
          },
        ],
        notes: notes('bucketing', 'matching', 'split'),
      };
    }
    case 'totalCmCases':
      return {
        ...base,
        formula: { text: t('detail.formulaText.totalCmCases') },
        arithmetic: {
          operator: 'add',
          left: { value: cleaning.cm.total, key: 'detail.row.cleaningCases' },
          right: { value: delivery.cm.total, key: 'detail.row.deliveryCases' },
          result: all.cm.total.toLocaleString(),
        },
        windows: [],
        breakdowns: [byLine(all.cm.total, 'detail.den.cmCases', cleaning.cm.total, delivery.cm.total)],
        notes: [],
      };
    case 'firstTimeFix': {
      const cm = all.cm;
      return {
        ...base,
        formula: { text: t('detail.formulaText.firstTimeFix', { days: data.repeatWindowDays }) },
        arithmetic: {
          operator: 'divide',
          left: { value: cm.firstTimeFix, key: 'detail.num.fixedFirstTime' },
          right: { value: cm.total, key: 'detail.den.cmCases' },
          result: pct(totals.rate),
        },
        windows: [{ key: 'detail.window.repeat', days: data.repeatWindowDays }],
        breakdowns: [
          {
            titleKey: 'detail.bd.scoring',
            total: { value: cm.total, unitKey: 'detail.den.cmCases' },
            rows: [
              { key: 'detail.row.ftfPass', value: cm.firstTimeFix, level: 0, tone: 'success' },
              { key: 'detail.row.passVerified', value: cm.firstTimeFix - cm.withoutSerial, level: 1 },
              { key: 'detail.row.passNoSerial', value: cm.withoutSerial, level: 1, tone: 'muted' },
              { key: 'detail.row.ftfFail', value: cm.repeat, level: 0, tone: 'failure' },
            ],
          },
          byLine(cm.total, 'detail.den.cmCases', cleaning.cm.total, delivery.cm.total),
        ],
        notes: notes('bucketing', 'matching', 'category'),
      };
    }
    case 'sla': {
      const cm = all.cm;
      return {
        ...base,
        formula: { text: t('detail.formulaText.sla') },
        arithmetic: {
          operator: 'divide',
          left: { value: cm.slaWithin, key: 'detail.num.slaWithin' },
          right: { value: cm.slaWithin + cm.slaOver, key: 'detail.den.slaMeasured' },
          result: pct(totals.rate),
        },
        windows: data.slaDays === null ? [] : [{ key: 'detail.window.sla', days: data.slaDays }],
        breakdowns: [
          {
            titleKey: 'detail.bd.slaJudged',
            total: { value: cm.total, unitKey: 'detail.den.cmCases' },
            rows: [
              { key: 'detail.row.slaMeasurable', value: cm.slaWithin + cm.slaOver, level: 0 },
              { key: 'detail.row.slaWithin', value: cm.slaWithin, level: 1, tone: 'success' },
              { key: 'detail.row.slaOver', value: cm.slaOver, level: 1, tone: 'failure' },
              { key: 'detail.row.slaUnknown', value: cm.slaUnknown, level: 0, tone: 'muted' },
            ],
          },
        ],
        notes: notes('bucketing', 'category'),
      };
    }
    default:
      return null;
  }
}
