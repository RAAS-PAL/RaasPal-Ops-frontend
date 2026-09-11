/**
 * Shapes returned by /api/v1/pm — mirrors the backend DTOs in
 * com.raaspal.robotrecommendation.pm.dto.
 */

/**
 * The buckets a visit can be in.
 *
 * OVERDUE is not stored anywhere: the backend derives it per request from a plan
 * date that has passed on work that is not complete. It therefore appears in grid
 * cells and week totals, but never as a row's own `statusBucket`.
 */
export type PmStatusBucket = 'COMPLETED' | 'IN_PROGRESS' | 'PLANNED' | 'UNPLANNED';
export type PmCellStatus = PmStatusBucket | 'OVERDUE';

export type PmServiceLine = 'CLEANING' | 'DELIVERY';

export interface PmSummary {
  totalVisits: number;
  customers: number;
  robots: number;
  planned: number;
  inProgress: number;
  completed: number;
  unplanned: number;
  overdue: number;
  /**
   * Visits with no plan date at all, so they fall in no week and no month. The
   * number the source data made necessary — a large minority of rows — and the
   * difference between "nothing due" and "nothing scheduled".
   */
  undatedBacklog: number;
}

export interface PmYearCell {
  week: number;
  total: number;
  byStatus: Partial<Record<PmCellStatus, number>>;
  dominantStatus: PmCellStatus;
}

export interface PmYearRow {
  contractId: string;
  name: string | null;
  customerName: string | null;
  project: string | null;
  serviceLine: PmServiceLine;
  province: string | null;
  region: string | null;
  zone: string | null;
  robotModel: string | null;
  robotCount: number | null;
  totalVisits: number;
  /** Keyed by ISO week; only weeks that actually have visits are present. */
  cells: Record<string, PmYearCell>;
}

export interface PmWeekTotal {
  week: number;
  total: number;
  byStatus: Partial<Record<PmCellStatus, number>>;
}

export interface PmYearResponse {
  year: number;
  /** 52 or 53 — sent rather than assumed, because 2026 has 53. */
  weekCount: number;
  rows: PmYearRow[];
  weekTotals: PmWeekTotal[];
  summary: PmSummary;
}

export interface PmMonthRow {
  visitId: string;
  visitName: string | null;
  pmSequence: number | null;
  planDate: string | null;
  actionDate: string | null;
  timeText: string | null;
  statusRaw: string | null;
  statusBucket: PmStatusBucket;
  /** Positive days past a missed plan date, or null when nothing is owed. */
  daysOverdue: number | null;
  ownerNames: string | null;
  contractId: string;
  contractName: string | null;
  customerName: string | null;
  project: string | null;
  serviceLine: PmServiceLine;
  province: string | null;
  region: string | null;
  zone: string | null;
  robotModel: string | null;
  robotCount: number | null;
  contractType: string | null;
}

export interface PmMonthResponse {
  from: string;
  to: string;
  summary: PmSummary;
  rows: PmMonthRow[];
}

export interface PmCompanyOption {
  name: string;
  /** How many sites the chain has. Biggest first — those are the ones worth excluding. */
  siteCount: number;
}

export interface PmFilterOptions {
  serviceLines: string[];
  regions: string[];
  zones: string[];
  provinces: string[];
  statuses: string[];
  owners: string[];
  companies: PmCompanyOption[];
}

/** Every filter both views share. Empty string means "no filter". */
export interface PmFilters {
  serviceLine: string;
  region: string;
  zone: string;
  province: string;
  status: string;
  owner: string;
  q: string;
  /**
   * Chains to hide. Every company starts ticked, so this holds only what somebody
   * unticked — an empty list means "show everything", which keeps the default
   * state out of the URL entirely.
   */
  excludedCompanies: string[];
}

export const EMPTY_PM_FILTERS: PmFilters = {
  serviceLine: '',
  region: '',
  zone: '',
  province: '',
  status: '',
  owner: '',
  q: '',
  excludedCompanies: [],
};
