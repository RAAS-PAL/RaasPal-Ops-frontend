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

// English is written out rather than taken from Intl: en-GB prints "Fri, 4 Sept", and the
// team writes "Fri 4 Sep". Any other locale (Thai) comes from Intl, in UTC so the calendar
// day does not move with the browser's zone; Thai then reads in the Buddhist era, as the
// rest of the app's dates do.
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const utc = (locale: string, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(locale, { timeZone: 'UTC', ...options });

function parts(date: string, locale: string) {
  const [y, m, d] = date.split('-').map(Number);
  if (locale === 'en') return { y, year: String(y), month: MONTHS[m - 1], d, wd: WEEKDAYS[weekday(date)] };
  // Parts of one full date: the year alone would carry the era ("พ.ศ. 2569"), and a weekday
  // alone can come out in its long form.
  const found = utc(locale, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).formatToParts(
    new Date(toMs(date)),
  );
  const get = (type: string) => found.find((p) => p.type === type)?.value ?? '';
  return { y, year: get('year'), month: get('month'), d, wd: get('weekday') };
}

/** "Mon 28 Sep 2026". */
export function formatDay(date: string, locale = 'en'): string {
  const p = parts(date, locale);
  return `${p.wd} ${p.d} ${p.month} ${p.year}`;
}

/** "September 2026". */
export function formatMonth(month: string, locale = 'en'): string {
  const [y, m] = month.split('-').map(Number);
  if (locale === 'en') return `${MONTHS_LONG[m - 1]} ${y}`;
  return utc(locale, { month: 'long', year: 'numeric' }).format(new Date(Date.UTC(y, m - 1, 1)));
}

/** "Mon 7 – Fri 11 Sep 2026", "Mon 28 Sep – Fri 2 Oct 2026", "Mon 29 Dec 2025 – Fri 2 Jan 2026". */
export function formatWeek(week: Week, locale = 'en'): string {
  const a = parts(week.start, locale);
  const b = parts(week.end, locale);
  const from =
    a.y !== b.y
      ? formatDay(week.start, locale)
      : a.month !== b.month
        ? `${a.wd} ${a.d} ${a.month}`
        : `${a.wd} ${a.d}`;
  return `${from} – ${formatDay(week.end, locale)}`;
}

/** "1 – 30 Sep 2026". */
function formatMonthRange(month: string, locale: string): string {
  const p = parts(`${month}-01`, locale);
  return `1 – ${Number(lastDayOfMonth(month).slice(8))} ${p.month} ${p.year}`;
}

/** The month a week is listed under: the month of its Friday. */
export function weekMonth(weekStart: string): string {
  return monthOf(addDays(weekStart, 4));
}

export function initialChoice(today: string): PeriodChoice {
  return { cadence: 'DAILY', day: today, month: monthOf(today), weekStart: mondayOf(today) };
}

export function resolvePeriod(choice: PeriodChoice, today: string, locale = 'en'): Period {
  const clamp = (start: string, end: string) => {
    const running = end > today;
    return { start, end, asOf: running ? today : end, running };
  };
  switch (choice.cadence) {
    case 'DAILY': {
      const day = choice.day > today ? today : choice.day;
      return { cadence: 'DAILY', start: day, end: day, asOf: day, running: false, label: formatDay(day, locale) };
    }
    case 'WEEKLY': {
      const week = { start: choice.weekStart, end: addDays(choice.weekStart, 4) };
      return { cadence: 'WEEKLY', ...clamp(week.start, week.end), label: formatWeek(week, locale) };
    }
    case 'MONTHLY': {
      const start = `${choice.month}-01`;
      return {
        cadence: 'MONTHLY',
        ...clamp(start, lastDayOfMonth(choice.month)),
        label: formatMonthRange(choice.month, locale),
      };
    }
  }
}

/** What `describePeriod` needs of a translator: `pendingCases.period`. */
type Translate = (key: string, values: Record<string, string>) => string;

/**
 * What the numbers under a period mean, in one line: "Cases open on Mon 28 Sep 2026", or
 * for a week or month, the day it was read on and whether it is still running.
 */
export function describePeriod(period: Period, t: Translate, locale = 'en'): string {
  const date = formatDay(period.asOf, locale);
  if (period.cadence === 'DAILY') return t('openOn', { date });
  return t(period.running ? 'running' : 'ended', { label: period.label, date });
}
