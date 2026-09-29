/**
 * The period a pending-case view covers: one day, a working week, or a month.
 *
 * <p>Every view reads the sheets frozen for one day. A week (Monday to Friday) is read as
 * of its Friday, a month as of its last day - or today, while either is still running -
 * so a week or month shows what was still open when it ended.
 *
 * <p>Dates are `yyyy-MM-dd` strings handled in UTC arithmetic: they are calendar days in
 * Bangkok, and doing the sums in the browser's own zone would shift them across midnight.
 */

export type Cadence = 'DAILY' | 'WEEKLY' | 'MONTHLY';

export interface Period {
  cadence: Cadence;
  /** First day covered. */
  start: string;
  /** Last day covered. */
  end: string;
  /** The day the sheets are read on: `end`, or today while the period is still running. */
  asOf: string;
  /** The period ends after today, so it is covered only up to `asOf`. */
  running: boolean;
  /** "Mon 7 – Fri 11 Sep 2026", "1 – 30 Sep 2026", "Mon 28 Sep 2026". */
  label: string;
}

/** What the picker holds; the period is derived from it. */
export interface PeriodChoice {
  cadence: Cadence;
  /** Daily: the day. */
  day: string;
  /** Monthly: the month, `yyyy-MM`. */
  month: string;
  /** Weekly: the Monday of the chosen week. Its month is the month of its Friday. */
  weekStart: string;
}

const DAY_MS = 86_400_000;

function toMs(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

function fromMs(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  return fromMs(toMs(date) + days * DAY_MS);
}

/** 0 = Sunday … 6 = Saturday. */
function weekday(date: string): number {
  return new Date(toMs(date)).getUTCDay();
}

export function monthOf(date: string): string {
  return date.slice(0, 7);
}

export function lastDayOfMonth(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return fromMs(Date.UTC(y, m, 0));
}

/** The Monday on or before a day. */
export function mondayOf(date: string): string {
  return addDays(date, -((weekday(date) + 6) % 7));
}

export interface Week {
  /** Monday. */
  start: string;
  /** Friday. */
  end: string;
}

/**
 * The working weeks of a month: every Monday-to-Friday whose Friday falls in it. That is
 * four in most months, five in some, and it puts each week in the month its snapshot
 * (the Friday) belongs to.
 */
export function weeksOfMonth(month: string): Week[] {
  const first = `${month}-01`;
  const last = lastDayOfMonth(month);
  let friday = addDays(first, (5 - weekday(first) + 7) % 7);
  const weeks: Week[] = [];
  while (friday <= last) {
    weeks.push({ start: addDays(friday, -4), end: friday });
    friday = addDays(friday, 7);
  }
  return weeks;
}

// Written out rather than Intl: en-GB prints "Fri, 4 Sept", and the team writes "Fri 4 Sep".
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function parts(date: string) {
  const [y, m, d] = date.split('-').map(Number);
  return { y, month: MONTHS[m - 1], d, wd: WEEKDAYS[weekday(date)] };
}

/** "Mon 28 Sep 2026". */
export function formatDay(date: string): string {
  const p = parts(date);
  return `${p.wd} ${p.d} ${p.month} ${p.y}`;
}

/** "September 2026". */
export function formatMonth(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return `${MONTHS_LONG[m - 1]} ${y}`;
}

/** "Mon 7 – Fri 11 Sep 2026", "Mon 28 Sep – Fri 2 Oct 2026", "Mon 29 Dec 2025 – Fri 2 Jan 2026". */
export function formatWeek(week: Week): string {
  const a = parts(week.start);
  const b = parts(week.end);
  const from =
    a.y !== b.y ? formatDay(week.start) : a.month !== b.month ? `${a.wd} ${a.d} ${a.month}` : `${a.wd} ${a.d}`;
  return `${from} – ${formatDay(week.end)}`;
}

/** "1 – 30 Sep 2026". */
function formatMonthRange(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return `1 – ${Number(lastDayOfMonth(month).slice(8))} ${MONTHS[m - 1]} ${y}`;
}

/** The month a week is listed under: the month of its Friday. */
export function weekMonth(weekStart: string): string {
  return monthOf(addDays(weekStart, 4));
}

export function initialChoice(today: string): PeriodChoice {
  return { cadence: 'DAILY', day: today, month: monthOf(today), weekStart: mondayOf(today) };
}

export function resolvePeriod(choice: PeriodChoice, today: string): Period {
  const clamp = (start: string, end: string) => {
    const running = end > today;
    return { start, end, asOf: running ? today : end, running };
  };
  switch (choice.cadence) {
    case 'DAILY': {
      const day = choice.day > today ? today : choice.day;
      return { cadence: 'DAILY', start: day, end: day, asOf: day, running: false, label: formatDay(day) };
    }
    case 'WEEKLY': {
      const week = { start: choice.weekStart, end: addDays(choice.weekStart, 4) };
      return { cadence: 'WEEKLY', ...clamp(week.start, week.end), label: formatWeek(week) };
    }
    case 'MONTHLY': {
      const start = `${choice.month}-01`;
      return {
        cadence: 'MONTHLY',
        ...clamp(start, lastDayOfMonth(choice.month)),
        label: formatMonthRange(choice.month),
      };
    }
  }
}

/**
 * What the numbers under a period mean, in one line: "Cases open on Mon 28 Sep 2026", or
 * for a week or month, the day it was read on and whether it is still running.
 */
export function describePeriod(period: Period): string {
  if (period.cadence === 'DAILY') return `Cases open on ${formatDay(period.asOf)}`;
  return period.running
    ? `${period.label} · still running, so the cases open today, ${formatDay(period.asOf)}`
    : `${period.label} · the cases still open on its last day, ${formatDay(period.asOf)}`;
}
