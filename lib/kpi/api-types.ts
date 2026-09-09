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
