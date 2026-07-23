/**
 * Report-month helpers. The automated bundle delivery targets the *previous*
 * calendar month (the scheduler runs on the 2nd), so "the report month" across
 * the dashboard means last month, formatted as "YYYY-MM".
 */

/** Previous calendar month as "YYYY-MM". */
export function previousMonth(now: Date = new Date()): string {
  const d = new Date(now);
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Human label for a "YYYY-MM" month, e.g. "June 2026". Falls back to the raw value. */
export function monthLabel(month: string, locale = 'en'): string {
  const [y, m] = month.split('-').map(Number);
  if (!y || !m) return month;
  return new Date(y, m - 1, 1).toLocaleDateString(locale, { month: 'long', year: 'numeric' });
}
