import type { PmCellStatus, PmMonthRow } from './types';
import type { StatusTone } from '@/components/ui/status-badge';

/**
 * The colour system for the planner (requirement spec section 22), defined once.
 *
 * Every class pair is written for both themes, because the grid is a wall of
 * colour and a bucket that only works in light mode is invisible in dark.
 * Colour is never the only signal — cells carry a count, rows carry a badge.
 */

/** How urgent each bucket is. Drives which status wins a cell holding several. */
export const PM_STATUS_ORDER: PmCellStatus[] = [
  'OVERDUE',
  'UNPLANNED',
  'IN_PROGRESS',
  'PLANNED',
  'COMPLETED',
];

/** Solid fill for a grid cell. */
export const PM_CELL_CLASS: Record<PmCellStatus, string> = {
  // Red — the plan date passed and the work is not done.
  OVERDUE: 'bg-red-500 text-white dark:bg-red-600',
  // Grey — no usable status. Present, but not yet real work.
  UNPLANNED: 'bg-slate-300 text-slate-800 dark:bg-slate-700 dark:text-slate-200',
  // Amber — an engineer is on it.
  IN_PROGRESS: 'bg-amber-400 text-amber-950 dark:bg-amber-600 dark:text-amber-50',
  // Blue — scheduled and waiting.
  PLANNED: 'bg-sky-500 text-white dark:bg-sky-600',
  // Green — done.
  COMPLETED: 'bg-emerald-500 text-white dark:bg-emerald-600',
};

/** Small square used in the legend and week-total bars. */
export const PM_SWATCH_CLASS: Record<PmCellStatus, string> = {
  OVERDUE: 'bg-red-500',
  UNPLANNED: 'bg-slate-400',
  IN_PROGRESS: 'bg-amber-400',
  PLANNED: 'bg-sky-500',
  COMPLETED: 'bg-emerald-500',
};

/** Maps a bucket onto the app-wide StatusBadge tones. */
export const PM_STATUS_TONE: Record<PmCellStatus, StatusTone> = {
  OVERDUE: 'danger',
  UNPLANNED: 'neutral',
  IN_PROGRESS: 'warning',
  PLANNED: 'info',
  COMPLETED: 'success',
};

/** Translation keys under `pmPlanning.status`. */
export const PM_STATUS_LABEL_KEY: Record<PmCellStatus, string> = {
  OVERDUE: 'overdue',
  UNPLANNED: 'unplanned',
  IN_PROGRESS: 'inProgress',
  PLANNED: 'planned',
  COMPLETED: 'completed',
};

/** How close a due date has to be to count as "near due" (spec section 22, orange). */
export const NEAR_DUE_DAYS = 7;

/**
 * The status to show for one month row.
 *
 * Overdue and near-due are both properties of the date rather than of the stored
 * status, so they are applied here instead of being baked into the mirror — a
 * stored "near due" would be wrong by the next morning.
 */
export function rowStatus(row: PmMonthRow): PmCellStatus {
  return row.daysOverdue != null ? 'OVERDUE' : row.statusBucket;
}

/** Whether a row is due within the next week and still outstanding. */
export function isNearDue(row: PmMonthRow, today: Date): boolean {
  if (!row.planDate || row.statusBucket === 'COMPLETED' || row.daysOverdue != null) return false;
  const due = new Date(`${row.planDate}T00:00:00`);
  const days = Math.round((due.getTime() - startOfDay(today).getTime()) / 86_400_000);
  return days >= 0 && days <= NEAR_DUE_DAYS;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
