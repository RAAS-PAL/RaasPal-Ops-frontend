import { EMPTY_PM_FILTERS, type PmFilters } from './types';

/**
 * Query-string handling for the planner.
 *
 * The view, the period and every filter live in the URL so a planner can send
 * "the North in week 38" to a colleague as a link, and so the browser's back
 * button steps through what they were looking at rather than leaving the page.
 */

export type PmView = 'year' | 'month';

export function resolveView(value: string | undefined): PmView {
  return value === 'month' ? 'month' : 'year';
}

/** A four-digit year inside the range the backend accepts, else the current one. */
export function resolveYear(value: string | undefined): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 2000 || parsed > 2100) {
    return new Date().getFullYear();
  }
  return parsed;
}

/** "YYYY-MM", else the current month. */
export function resolveMonth(value: string | undefined): string {
  if (value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return value;
  return currentMonth();
}

export function currentMonth(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/** Reads the filters out of raw search params, ignoring anything unexpected. */
export function resolveFilters(params: Record<string, string | undefined>): PmFilters {
  return {
    serviceLine: clean(params.serviceLine),
    region: clean(params.region),
    zone: clean(params.zone),
    province: clean(params.province),
    status: clean(params.status),
    owner: clean(params.owner),
    q: clean(params.q),
    excludedCompanies: splitList(params.excludeCompany),
  };
}

/**
 * The excluded chains ride in one comma-joined param.
 *
 * Repeated params would be tidier, but the page keeps its state through
 * history.replaceState and this keeps that one string readable. Note the comma is
 * not an arbitrary choice to revisit: Spring binds `@RequestParam List<String>` by
 * splitting on commas whatever the wire format, so a company whose name contained
 * one would break either way. None does today - the derived name is a single word
 * or the text before a colon - and fixing it would mean a custom binder, not a
 * different separator here.
 */
function splitList(value: string | undefined): string[] {
  if (!value) return [];
  return value.split(',').map((entry) => entry.trim()).filter(Boolean);
}

export function hasAnyFilter(filters: PmFilters): boolean {
  return (
    filters.excludedCompanies.length > 0 ||
    (Object.keys(EMPTY_PM_FILTERS) as (keyof PmFilters)[]).some(
      (key) => key !== 'excludedCompanies' && filters[key] !== '',
    )
  );
}

/** Drops empty values so the request never sends `region=`. */
export function toQuery(filters: PmFilters): Record<string, string> {
  const out: Record<string, string> = {};
  (Object.keys(filters) as (keyof PmFilters)[]).forEach((key) => {
    if (key === 'excludedCompanies') return;
    const value = filters[key];
    if (typeof value === 'string' && value) out[key] = value;
  });
  if (filters.excludedCompanies.length > 0) {
    out.excludeCompany = filters.excludedCompanies.join(',');
  }
  return out;
}

function clean(value: string | undefined): string {
  return value?.trim() ?? '';
}

/* ─── Look-ahead ranges (spec section 8) ──────────────────────────────────── */

export type PmLookAhead = 'thisMonth' | 'next30' | 'next60' | 'next90';

/**
 * The chips resolve to explicit date ranges rather than months, because "next 90
 * days" is not three months and splitting it into months would cut a week in half
 * exactly where a trip spans a month end.
 */
export function lookAheadRange(kind: PmLookAhead, now: Date = new Date()): { from: string; to: string } {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (kind === 'thisMonth') {
    return {
      from: iso(new Date(today.getFullYear(), today.getMonth(), 1)),
      to: iso(new Date(today.getFullYear(), today.getMonth() + 1, 0)),
    };
  }
  const days = kind === 'next30' ? 30 : kind === 'next60' ? 60 : 90;
  const end = new Date(today);
  end.setDate(end.getDate() + days);
  return { from: iso(today), to: iso(end) };
}

export function iso(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** Monday of an ISO week, matching the backend's own week arithmetic. */
export function isoWeekMonday(isoYear: number, week: number): Date {
  const jan4 = new Date(Date.UTC(isoYear, 0, 4));
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - ((jan4.getUTCDay() || 7) - 1) + (week - 1) * 7);
  return new Date(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate());
}

/** "8–14 Sep" for a week column's tooltip and the drill-down header. */
export function weekRangeLabel(isoYear: number, week: number, locale: string): string {
  const start = isoWeekMonday(isoYear, week);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const fmt = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' });
  return `${fmt.format(start)} – ${fmt.format(end)}`;
}
