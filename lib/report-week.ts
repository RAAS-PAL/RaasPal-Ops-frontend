/**
 * Report-week helpers, the weekly counterpart to `report-month.ts`.
 *
 * Weeks are ISO weeks (Monday-Sunday), formatted "YYYY-Www" — the exact string
 * the browser's native `<input type="week">` produces and the backend's
 * `week` request parameter accepts, so nothing has to be translated between the
 * picker, the request and the report.
 */

const MS_PER_DAY = 86_400_000;

/** Midnight UTC on the given local date, so week arithmetic ignores DST. */
function utcDay(d: Date): Date {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

/**
 * The ISO week containing `date`, as "YYYY-Www".
 *
 * The year in the string is the ISO *week-based* year, which is not always the
 * calendar year: 1 January 2027 falls in week 53 of 2026, and labelling it
 * "2027-W53" would be a week that does not exist.
 */
export function isoWeekOf(date: Date = new Date()): string {
  const d = utcDay(date);
  // Shift to the Thursday of this week — the ISO week's year is Thursday's year.
  const day = d.getUTCDay() || 7; // Sunday 0 -> 7
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const year = d.getUTCFullYear();
  const firstThursday = new Date(Date.UTC(year, 0, 4));
  const firstDay = firstThursday.getUTCDay() || 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() + 4 - firstDay);
  const week = 1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * MS_PER_DAY));
  return `${year}-W${String(week).padStart(2, '0')}`;
}

/**
 * The most recently *finished* ISO week — the default the picker opens on, for
 * the same reason the month picker opens on last month: the current one is still
 * accumulating tasks, so its numbers are not yet a report.
 */
export function previousIsoWeek(now: Date = new Date()): string {
  const d = new Date(now);
  d.setDate(d.getDate() - 7);
  return isoWeekOf(d);
}

/** Monday of an ISO week string, or null when it is malformed. */
function isoWeekMonday(week: string): Date | null {
  const match = /^(\d{4})-W(\d{2})$/.exec(week);
  if (!match) return null;
  const year = Number(match[1]);
  const weekNumber = Number(match[2]);
  if (weekNumber < 1 || weekNumber > 53) return null;
  // Week 1 is the week containing 4 January; walk back to its Monday, then forward.
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - ((jan4.getUTCDay() || 7) - 1) + (weekNumber - 1) * 7);
  // A 53rd week in a 52-week year rolls into the next year — reject it rather
  // than silently reporting on a week nobody asked for (the backend 400s too).
  if (weekNumber === 53 && isoWeekOf(new Date(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate())) !== week) {
    return null;
  }
  return monday;
}

/**
 * "2026-W34" → { from: "2026-08-17", to: "2026-08-23" } — the range the Gausium
 * sync pulls for a week. Returns null for a malformed week.
 */
export function isoWeekRange(week: string): { from: string; to: string } | null {
  const monday = isoWeekMonday(week);
  if (!monday) return null;
  const sunday = new Date(monday.getTime() + 6 * MS_PER_DAY);
  return { from: iso(monday), to: iso(sunday) };
}

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * "2026-W34" → "17 – 23 August 2026", collapsing whatever the two ends share.
 * Mirrors the backend's label so the sample preview reads like a real one.
 * Falls back to the raw value when the week is malformed.
 */
export function weekRangeLabel(week: string, locale = 'en-GB'): string {
  const range = isoWeekRange(week);
  if (!range) return week;
  const start = new Date(`${range.from}T00:00:00Z`);
  const end = new Date(`${range.to}T00:00:00Z`);
  const opts: Intl.DateTimeFormatOptions = { timeZone: 'UTC' };
  const endLabel = end.toLocaleDateString(locale, { ...opts, day: 'numeric', month: 'long', year: 'numeric' });

  if (start.getUTCFullYear() !== end.getUTCFullYear()) {
    return `${start.toLocaleDateString(locale, { ...opts, day: 'numeric', month: 'long', year: 'numeric' })} – ${endLabel}`;
  }
  if (start.getUTCMonth() !== end.getUTCMonth()) {
    return `${start.toLocaleDateString(locale, { ...opts, day: 'numeric', month: 'long' })} – ${endLabel}`;
  }
  return `${start.getUTCDate()} – ${endLabel}`;
}
