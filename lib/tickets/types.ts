/**
 * Per-brand service-ticket analytics — mirrors the backend's
 * `casereport/brand/dto` records. The brand slug comes from `app.tickets.brands`
 * (today: `autoxing`).
 */

export type TicketBrand = 'autoxing';

export const DEFAULT_TICKET_BRAND: TicketBrand = 'autoxing';

export interface BrandTicketComment {
  id: string;
  parentId: string | null;
  author: string | null;
  postedAt: string | null;
  body: string | null;
}

export interface BrandTicket {
  id: string;
  itemId: string;
  name: string | null;
  group: string | null;
  open: boolean;
  status: string | null;
  supStatus: string | null;
  project: string | null;
  branch: string | null;
  branchCode: string | null;
  province: string | null;
  model: string | null;
  serial: string | null;
  rootCause: string | null;
  reOwner: string | null;
  caseType: string | null;
  level: string | null;
  underWarranty: string | null;
  channel: string | null;
  mainIssue: string | null;
  solution: string | null;
  openDate: string | null;
  reActionDate: string | null;
  daysToAction: number | null;
  ageDays: number | null;
  sourceUpdatedAt: string | null;
  firstSeenAt: string | null;
  lastSyncedAt: string | null;
  mondayUrl: string | null;
  comments: BrandTicketComment[];
}

export interface CountPoint {
  label: string;
  count: number;
}

export interface MonthPoint {
  month: string;
  opened: number;
  open: number;
  done: number;
}

export interface SiteCount {
  label: string;
  count: number;
  open: number;
}

export interface RobotCount {
  serial: string;
  model: string | null;
  site: string | null;
  count: number;
  lastOpenDate: string | null;
}

export interface BrandTicketSummary {
  brand: string;
  label: string;
  boardId: string;
  from: string | null;
  to: string | null;
  lastSyncedAt: string | null;
  totals: { tickets: number; open: number; done: number; robots: number; sites: number };
  kpis: {
    openNow: number;
    oldestOpenDays: number | null;
    thisMonth: number;
    lastMonth: number;
    monthDeltaPct: number | null;
    medianDaysToAction: number | null;
    actionSample: number;
    slaWithin7Pct: number | null;
    repeatRatePct: number | null;
    repeatSample: number;
  };
  monthly: MonthPoint[];
  statuses: CountPoint[];
  rootCauses: CountPoint[];
  models: CountPoint[];
  reOwners: CountPoint[];
  aging: CountPoint[];
  topSites: SiteCount[];
  repeatRobots: RobotCount[];
  definitions: { open: string; slaDays: string; repeatDays: string; ticketDate: string };
}

export interface BrandSyncStatus {
  brand: string;
  lastSyncedAt: string | null;
  ticketCount: number;
  lastRun: {
    startedAt: string;
    finishedAt: string;
    result: {
      boardId: string;
      seen: number;
      created: number;
      updated: number;
      closed: number;
      newComments: number;
      statusChanges: number;
    } | null;
    error: string | null;
    ok: boolean;
  } | null;
}

export type TicketScope = 'all' | 'open';

/** A preset the range picker offers; `from` null means "all time". */
export interface TicketRange {
  from: string | null;
  to: string | null;
}
