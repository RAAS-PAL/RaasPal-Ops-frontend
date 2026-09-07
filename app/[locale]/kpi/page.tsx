import { KpiClient, type KpiTab } from './KpiClient';
import { DECK_PERIOD, isValidPeriod, type Period, type PeriodPresetId } from '@/lib/kpi/period';

/**
 * Server shell. Tab and period both live in the URL so a KPI view is shareable —
 * the same pattern as /reports.
 *
 * Query values are user input, so each is validated before use and falls back to
 * the deck's own period rather than rendering an unattributed range.
 */
const VALID_TABS: readonly string[] = ['report', 'utilization', 'repeat-cost'];
const VALID_PRESETS: readonly string[] = ['last6', 'h1', 'h2', 'custom'];
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

export default async function KpiPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; from?: string; to?: string; preset?: string }>;
}) {
  const { tab, from, to, preset } = await searchParams;

  const initialTab: KpiTab = VALID_TABS.includes(tab ?? '') ? (tab as KpiTab) : 'report';

  const requested: Period = { from: from ?? '', to: to ?? '' };
  const periodValid = MONTH.test(requested.from) && MONTH.test(requested.to) && isValidPeriod(requested);
  const initialPeriod = periodValid ? requested : DECK_PERIOD;

  const initialPreset: PeriodPresetId = VALID_PRESETS.includes(preset ?? '')
    ? (preset as PeriodPresetId)
    : 'h1';

  return (
    <KpiClient initialTab={initialTab} initialPeriod={initialPeriod} initialPreset={initialPreset} />
  );
}
