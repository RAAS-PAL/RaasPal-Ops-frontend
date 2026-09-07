/**
 * Reporting period for the KPI section.
 *
 * Month granularity, not day: every figure in the deck is a monthly series or a
 * half-year total, so a day-level range would imply a precision the data does
 * not have. A period is an inclusive pair of 'YYYY-MM' strings.
 *
 * The placeholder fixtures only cover the deck's own period (Jan–Jun 2026). Any
 * other selection has no data behind it yet, which the tabs say plainly rather
 * than re-rendering the same numbers under a different heading.
 */

export type Period = { from: string; to: string };

export type PeriodPresetId = 'last6' | 'h1' | 'h2' | 'custom';

/** The only period the placeholder data covers. */
export const DECK_PERIOD: Period = { from: '2026-01', to: '2026-06' };

const ym = (year: number, month1: number) => `${year}-${String(month1).padStart(2, '0')}`;

export function parseMonth(value: string): { year: number; month: number } {
  const [y, m] = value.split('-').map(Number);
  return { year: y, month: m };
}

/** Shift a 'YYYY-MM' by a signed number of months. */
export function addMonths(value: string, delta: number): string {
  const { year, month } = parseMonth(value);
  const zero = year * 12 + (month - 1) + delta;
  return ym(Math.floor(zero / 12), (zero % 12) + 1);
}

/** Inclusive count of months in a period; 0 when the range is inverted. */
export function monthCount(period: Period): number {
  const a = parseMonth(period.from);
  const b = parseMonth(period.to);
  return b.year * 12 + b.month - (a.year * 12 + a.month) + 1;
}

export function isValidPeriod(period: Period): boolean {
  return monthCount(period) >= 1;
}

/** Every month in the period, as 'YYYY-MM'. */
export function monthsIn(period: Period): string[] {
  const total = Math.max(monthCount(period), 0);
  return Array.from({ length: total }, (_, i) => addMonths(period.from, i));
}

/** Short month labels for chart axes, in the viewer's locale. */
export function monthLabels(period: Period, locale: string): string[] {
  const fmt = new Intl.DateTimeFormat(locale, { month: 'short' });
  return monthsIn(period).map((value) => {
    const { year, month } = parseMonth(value);
    return fmt.format(new Date(Date.UTC(year, month - 1, 1)));
  });
}

/** "Jan – Jun 2026", or "Nov 2025 – Apr 2026" when the range spans a year end. */
export function formatPeriod(period: Period, locale: string): string {
  const fmt = new Intl.DateTimeFormat(locale, { month: 'short' });
  const a = parseMonth(period.from);
  const b = parseMonth(period.to);
  const label = (p: { year: number; month: number }) =>
    fmt.format(new Date(Date.UTC(p.year, p.month - 1, 1)));
  return a.year === b.year
    ? `${label(a)} – ${label(b)} ${a.year}`
    : `${label(a)} ${a.year} – ${label(b)} ${b.year}`;
}

/**
 * The six complete months ending with last month — today's partial month is
 * excluded, since a half-finished month would drag every rate down.
 */
export function lastSixMonths(today = new Date()): Period {
  const lastComplete = ym(today.getUTCFullYear(), today.getUTCMonth() + 1);
  const to = addMonths(lastComplete, -1);
  return { from: addMonths(to, -5), to };
}

export function presetPeriod(id: Exclude<PeriodPresetId, 'custom'>, year: number): Period {
  if (id === 'h1') return { from: ym(year, 1), to: ym(year, 6) };
  if (id === 'h2') return { from: ym(year, 7), to: ym(year, 12) };
  return lastSixMonths();
}

export function samePeriod(a: Period, b: Period): boolean {
  return a.from === b.from && a.to === b.to;
}

/** True when the placeholder fixtures can answer for this period. */
export function hasPlaceholderData(period: Period): boolean {
  return samePeriod(period, DECK_PERIOD);
}

/** Years offered in the preset year picker. */
export function selectableYears(today = new Date()): number[] {
  const current = today.getUTCFullYear();
  return [current + 1, current, current - 1, current - 2];
}
