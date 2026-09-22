/**
 * RE assignment for CM tickets — mirrors the backend's `reassignment/dto/ReDtos`.
 * Levels are 1–4 (L1–L4); null is "-" / not assessed.
 */

export type Outcome = 'SUGGESTED' | 'APPROVED' | 'ASSIGNED' | 'MANUAL' | 'HELD' | 'NO_QUALIFIED' | 'ALL_BUSY';

export interface Candidate {
  engineerId: string;
  name: string;
  modelLevel: number | null;
  cmLevel: number | null;
  expertiseLevel: number | null;
  currentLoad: number | null;
  projectedLoad: number | null;
  maxLoad: number | null;
  score: number | null;
  components: Record<string, number>;
  hasEmail: boolean;
}

export interface Exclusion {
  engineerId: string;
  name: string;
  reason: string;
  modelLevel: number | null;
  cmLevel: number | null;
}

export interface AssignmentView {
  id: string;
  itemId: string;
  ticketName: string | null;
  engineerId: string;
  engineerName: string | null;
  status: 'APPROVED' | 'CONFIRMED' | 'CANCELLED' | 'SUPERSEDED';
  origin: 'SUGGESTION' | 'ALTERNATIVE' | 'MANUAL';
  score: number | null;
  requiredLevel: number | null;
  reason: string;
  approvedBy: string;
  approvedAt: string;
  confirmedAt: string | null;
  endedAt: string | null;
  endedBy: string | null;
  emailStatus: 'NOT_SENT' | 'SENT' | 'FAILED' | 'DISABLED' | 'NO_ADDRESS';
  emailDetail: string | null;
}

export interface QueueRow {
  itemId: string;
  name: string | null;
  group: string | null;
  status: string | null;
  subStatus: string | null;
  modelLabel: string | null;
  modelName: string | null;
  issueLevel: string | null;
  caseType: string | null;
  serviceMode: string | null;
  serial: string | null;
  customer: string | null;
  branch: string | null;
  mainIssue: string | null;
  openDate: string | null;
  actionDate: string | null;
  people: string[];
  outcome: Outcome;
  reason: string;
  requiredLevel: number | null;
  assumedDifficulty: boolean;
  issueCategory: string | null;
  suggested: Candidate | null;
  alternatives: Candidate[];
  excluded: Exclusion[];
  assignment: AssignmentView | null;
  mondayUrl: string | null;
}

export interface QueueView {
  rows: QueueRow[];
  counts: Record<Outcome, number>;
  lastRefreshAt: string | null;
  openTickets: number;
  emailEnabled: boolean;
  canManage: boolean;
  engineers: number;
  engineersWithoutMondayId: number;
}

export interface RefreshResult {
  seen: number;
  openInActiveGroups: number;
  newTickets: number;
  closed: number;
  confirmed: number;
  superseded: number;
  durationMs: number;
}

export interface EngineerView {
  id: string;
  fullName: string;
  nickname: string | null;
  displayName: string;
  email: string | null;
  mondayUserId: string | null;
  mondayName: string | null;
  active: boolean;
  maxLoad: number;
  note: string | null;
  load: number;
  openTickets: number;
  assessedSkills: number;
  onLeaveToday: boolean;
}

export interface EngineerRequest {
  fullName: string;
  nickname?: string | null;
  email?: string | null;
  mondayUserId?: string | null;
  maxLoad?: number | null;
  note?: string | null;
  active?: boolean;
}

export interface LeaveView {
  id: string;
  engineerId: string;
  engineerName: string | null;
  startsOn: string;
  endsOn: string;
  note: string | null;
  createdBy: string;
}

export interface MondayPerson {
  id: string;
  name: string | null;
  openTickets: number;
  linkedEngineerId: string | null;
}

export interface SkillView {
  code: string;
  groupCode: string;
  boardType: 'CLEANING' | 'DELIVERY' | 'COMMON';
  label: string;
  ordinal: number;
}

export interface MatrixRow {
  engineerId: string;
  name: string;
  active: boolean;
  levels: Record<string, number>;
}

export interface RevisionView {
  id: string;
  label: string;
  source: 'EXCEL' | 'CONSOLE';
  reason: string;
  createdBy: string;
  createdAt: string;
  changes: number;
}

export interface MatrixView {
  skills: SkillView[];
  rows: MatrixRow[];
  revisions: RevisionView[];
}

export interface LevelChange {
  engineerId: string;
  skillCode: string;
  level: number | null;
}

export interface ImportCell {
  skillCode: string;
  level: number | null;
  currentLevel: number | null;
  sourceCell: string;
  sourceValue: string;
}

export interface ImportRow {
  sourceRow: number;
  fullName: string;
  nickname: string | null;
  match: 'EXISTING' | 'NEW' | 'AMBIGUOUS';
  engineerId: string | null;
  matchedName: string | null;
  cells: ImportCell[];
  changes: number;
  unassessed: boolean;
}

export interface ImportPreview {
  fileHash: string;
  sheet: string;
  rows: ImportRow[];
  unmappedColumns: string[];
  warnings: string[];
  errors: string[];
  newEngineers: number;
  changedLevels: number;
  canCommit: boolean;
}

export interface ImportResult {
  revision: RevisionView;
  engineersCreated: number;
  levelsChanged: number;
}

export interface MappingView {
  label: string;
  disposition: 'MAPPED' | 'MANUAL' | 'UNCONFIRMED';
  skillCode: string | null;
  modelName: string | null;
  note: string | null;
  openTickets: number;
  updatedBy: string | null;
  updatedAt: string | null;
}

export interface ManagerView {
  userId: string;
  email: string;
  fullName: string;
  role: string;
  grantedBy: string;
  grantedAt: string;
}

export interface AccessView {
  canManage: boolean;
  isAdmin: boolean;
}

/** Workbook colours: L4 green, L3 pale green, L2 amber, L1 red, "-" grey. */
export function levelClass(level: number | null | undefined): string {
  switch (level) {
    case 4:
      return 'bg-emerald-200 text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-200';
    case 3:
      return 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300';
    case 2:
      return 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200';
    case 1:
      return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200';
    default:
      return 'bg-[var(--app-faint)] text-[var(--app-muted)]';
  }
}

export const levelText = (level: number | null | undefined) => (level ? `L${level}` : '-');
