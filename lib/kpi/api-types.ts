/**
 * The shape of `GET /api/v1/kpi/cm-cases`, mirroring the backend's
 * KpiCaseMetricsResponse exactly.
 *
 * Rates are percentages already rounded to one decimal, or `null` when there
 * was nothing to divide by — which is not the same as 0% and must not be
 * rendered as one.
 */

/** 1st Time Install. */
export type InstallCounts = {
  total: number;
  firstTime: number;
  followedByCm: number;
  /** Installations naming no serial, so unmatchable; counted inside `firstTime`. */
  withoutSerial: number;
  firstTimeRate: number | null;
};

/** CM volume, First Time Fix and SLA. */
export type CmCounts = {
  total: number;
  firstTimeFix: number;
  repeat: number;
  withoutSerial: number;
  slaWithin: number;
  slaOver: number;
  /** No RE Action date recorded, so SLA cannot be said either way. */
  slaUnknown: number;
  firstTimeFixRate: number | null;
  slaWithinRate: number | null;
};

/** One slice of the fleet: its installations and its corrective maintenance. */
export type KpiSegment = {
  installation: InstallCounts;
  cm: CmCounts;
};

export type KpiMonth = {
  /** 'YYYY-MM'. */
  month: string;
  all: KpiSegment;
  cleaning: KpiSegment;
  delivery: KpiSegment;
};

export type KpiCaseMetrics = {
  from: string;
  to: string;
  months: KpiMonth[];
  totals: { all: KpiSegment; cleaning: KpiSegment; delivery: KpiSegment };
  ticketCount: number;
  /** Rows in the range counted in the fleet total but in neither cleaning nor delivery. */
  unclassifiedTickets: number;
  /** Rows in the range whose category the board config does not count as a KPI case. */
  excludedByCategory: number;
  /** When the monday mirror was last refreshed; null when it never has been. */
  lastSyncedAt: string | null;
  repeatWindowDays: number;
  installFollowUpDays: number;
  /** SLA threshold in days when every CM board agrees on one; null when they differ. */
  slaDays: number | null;
  /** True while the formulas await RE-team sign-off. */
  provisional: boolean;
  /** Each formula in words, keyed by metric. */
  definitions: Record<string, string>;
};

/** Whether a monday token is present and how the boards are mapped. */
export type MondaySyncConfig = {
  tokenConfigured: boolean;
  schedulerEnabled: boolean;
  syncCron: string | null;
  syncZone: string;
  repeatWindowDays: number;
  boards: {
    id: string;
    serviceLine: 'CLEANING' | 'DELIVERY' | null;
    ticketType: 'CM' | 'INSTALLATION';
    slaDays: number;
  }[];
};

/* ── CSAT — GET /api/v1/kpi/csat ─────────────────────────────────────────── */

/**
 * One survey (or the pool of all four) over one month (or the range).
 *
 * `surveyed` is false when no workbook has a sheet for it; the zeros then mean
 * "not surveyed", not "nobody was happy", and the rates are `null`.
 */
export type CsatBucket = {
  surveyed: boolean;
  /** Customers the team tried to reach. */
  customers: number;
  /** Of those, ones who answered. */
  responses: number;
  notEvaluated: number;
  /**
   * Top Box as a percentage — the CSAT the deck reports. For one survey in one
   * month it is that sheet's own Top Box cell, read as the RE team wrote it.
   * For a range or the pool, which no sheet holds, it is `fives / ratings`.
   */
  topBoxRate: number | null;
  /** True when `topBoxRate` is one sheet's cell; false when it was combined. */
  topBoxFromSheet: boolean;
  /** Ratings of 5 given — the numerator of a combined Top Box. */
  fives: number;
  /** Ratings given at all — its denominator. */
  ratings: number;
  /** `responses / customers`. */
  responseRate: number | null;
};

export type CsatStreamKey = 'installation' | 'pm' | 'cleaning' | 'delivery';

export type CsatMonth = {
  /** 'YYYY-MM'. */
  month: string;
  overall: CsatBucket;
  installation: CsatBucket;
  pm: CsatBucket;
  cleaning: CsatBucket;
  delivery: CsatBucket;
};

export type CsatSourceFile = {
  name: string;
  /** Which survey the file turned out to be; null when that could not be told. */
  stream: CsatStreamKey | null;
  lastModified: string;
  firstMonth: string | null;
  lastMonth: string | null;
};

export type KpiCsat = {
  from: string;
  to: string;
  months: CsatMonth[];
  totals: {
    overall: CsatBucket;
    installation: CsatBucket;
    pm: CsatBucket;
    cleaning: CsatBucket;
    delivery: CsatBucket;
  };
  sourceFiles: CsatSourceFile[];
  /** The latest month any workbook has responses for; null when none does. */
  asOf: string | null;
  provisional: boolean;
  /** Anything found while reading the workbooks the reader should know. */
  warnings: string[];
  definitions: Record<string, string>;
};

/** What the workbook source holds right now — the reload endpoint returns it. */
export type CsatSourceStatus = {
  source: string;
  files: CsatSourceFile[];
  surveys: CsatStreamKey[];
  asOf: string | null;
  warnings: string[];
  loadedAt: string;
};
