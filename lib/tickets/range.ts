import type { TicketRange } from './types';

/** The range presets the tickets page offers. Keys double as the `?range=` value. */
export type RangeKey = 'month' | 'quarter' | 'year' | 'all';

export const RANGE_KEYS: RangeKey[] = ['month', 'quarter', 'year', 'all'];

const iso = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Resolve a preset to concrete dates in Bangkok's calendar. `to` is left null
 * (the backend treats it as "today") so a bookmarked link keeps working tomorrow.
 */
export function resolveRange(key: RangeKey, now = new Date()): TicketRange {
  // Bangkok is UTC+7 with no DST; shift so the calendar maths uses the right day.
  const bkk = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const y = bkk.getUTCFullYear();
  const m = bkk.getUTCMonth();
  switch (key) {
    case 'month':
      return { from: iso(new Date(Date.UTC(y, m, 1))), to: null };
    case 'quarter':
      return { from: iso(new Date(Date.UTC(y, m - 2, 1))), to: null };
    case 'year':
      return { from: `${y}-01-01`, to: null };
    case 'all':
    default:
      return { from: null, to: null };
  }
}

export function resolveRangeKey(value: string | undefined): RangeKey {
  return RANGE_KEYS.includes(value as RangeKey) ? (value as RangeKey) : 'year';
}
