/**
 * lib/thai-date.ts
 *
 * Thai Buddhist-era date formatting for printed customer documents.
 * Thailand counts years from 543 BC, so 2026 CE prints as 2569 BE — the CM report
 * is a Thai legal-style document and must carry the Buddhist year.
 */

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

const BUDDHIST_ERA_OFFSET = 543;

/**
 * Formats an ISO `yyyy-MM-dd` date as e.g. "17 มิถุนายน 2569".
 *
 * Parsed field-by-field rather than via `new Date(iso)`, which would read the
 * string as UTC midnight and render the previous day for anyone east of GMT —
 * including, unhelpfully, Thailand.
 */
export function formatThaiDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return iso;

  const [, year, month, day] = match;
  const monthName = THAI_MONTHS[Number(month) - 1];
  if (!monthName) return iso;

  return `${Number(day)} ${monthName} ${Number(year) + BUDDHIST_ERA_OFFSET}`;
}

/** Today as `yyyy-MM-dd` in the browser's local timezone — the default report date. */
export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
