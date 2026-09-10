/**
 * Shapes for the RE Team KPI report.
 *
 * These are deliberately written as the response the backend WILL return, not as
 * whatever is convenient for the current fixtures. Nothing in the backend
 * produces these numbers yet (see docs/re-kpi-dashboard-plan.md), so when the
 * API lands the only change here should be where the data comes from — the
 * components already consume this shape.
 */

/**
 * A next-intl translate function, narrowed to what this layer needs. The lib
 * modules build display strings (counts, footnotes, averages) that must be
 * localised, so the component passes its `t` down rather than these modules
 * importing a hook they cannot use.
 */
export type Translate = (key: string, values?: Record<string, string | number>) => string;

/** Service line every KPI is split by. */
export type Segment = 'cleaning' | 'delivery';

/** One month of a series. `null` means "no data", which is not the same as 0. */
export type MonthlyPoint = {
  /** Short month label, already localised by the caller. */
  month: string;
  value: number | null;
  /** Overrides the series colour for this bar only (the deck flags months this way). */
  color?: string;
};

/** A named series drawn on a chart (one bar colour). */
export type Series = {
  key: string;
  /** Message key for the legend label; resolved in the component. */
  labelKey: string;
  color: string;
  points: MonthlyPoint[];
};

/** A supporting figure shown beside a chart (the grey boxes in the deck). */
export type SideStat = {
  labelKey: string;
  /** Pre-formatted for display — percent, ratio or count. */
  value: string;
  /** Optional smaller line under the value, e.g. "10/17". */
  detail?: string;
  /** When set, the box is tinted with the KPI's accent colour. */
  emphasis?: boolean;
};

/** One of the six numbered panels. */
export type KpiPanelData = {
  id: KpiId;
  /** 1–6, as printed in the deck. */
  index: number;
  titleKey: string;
  accent: string;
  chart: {
    mode: 'single' | 'grouped' | 'stacked';
    /** Percent charts fix the axis at 0–100; count charts scale to the data. */
    unit: 'percent' | 'count';
    series: Series[];
    /** Horizontal reference line — the period average. */
    average?: { value: number; labelKey: string; display: string };
    /** Whether to print each bar's value above it. */
    showValueLabels: boolean;
    /** Small line under the chart, e.g. "Cleaning 95.6% | Delivery 81.2%". */
    footnote?: string;
  };
  sideStats: SideStat[];
};

export type KpiId =
  | 'firstTimeInstall'
  | 'pmComplete'
  | 'totalCmCases'
  | 'firstTimeFix'
  | 'sla';

/** The coloured summary tiles across the top. */
export type KpiHeadline = {
  id: KpiId;
  labelKey: string;
  value: string;
  detail: string;
  color: string;
};

export type BoardTakeaway = {
  index: number;
  color: string;
  titleKey: string;
  bodyKey: string;
};

export type KpiReport = {
  /** Period label, e.g. "Jan - Jun 2026". */
  period: string;
  months: string[];
  headlines: KpiHeadline[];
  panels: KpiPanelData[];
  takeaways: BoardTakeaway[];
};

/* ── Utilization & productivity (deck slide 3) ─────────────────────────────── */

export type UtilizationMetric = {
  key: string;
  labelKey: string;
  value: string;
  detailKey: string;
  color: string;
};

export type UtilizationReport = {
  period: string;
  metrics: UtilizationMetric[];
  /** MD conversion rules, printed verbatim — the aggregation must match these. */
  factorKeys: string[];
  actionKeys: string[];
  sections: { key: string; titleKey: string }[];
};

/* ── Repeat cost (deck slides 4–5) ─────────────────────────────────────────── */

export type RepeatHeadline = {
  key: string;
  labelKey: string;
  value: string;
  /** Message key for the supporting line, so the deck's wording is localised. */
  detailKey: string;
  color: string;
};

/** Ticket breakdown behind one repeat type. */
export type RepeatBreakdown = {
  key: string;
  titleKey: string;
  accent: string;
  kpiVolume: string;
  kpiVolumeLabelKey: string;
  costEvents: string;
  costEventsLabelKey: string;
  channels: { labelKey: string; count: number }[];
  /** Local/BKK vs province split of the cost events. */
  split: { localLabelKey: string; local: number; provinceLabelKey: string; province: number };
  avgKm: { local: number; province: number };
  unitCost: { localBaht: number; provinceBaht: number };
  totalBaht: number;
};

export type CostLine = {
  key: string;
  labelKey: string;
  qty: string;
  unit: string;
  total: number;
};

export type RepeatCostReport = {
  period: string;
  headlines: RepeatHeadline[];
  breakdowns: RepeatBreakdown[];
  costLines: CostLine[];
  totals: { repeatCost: number; incentive: number; gap: number; incentiveBasisKey: string };
};
