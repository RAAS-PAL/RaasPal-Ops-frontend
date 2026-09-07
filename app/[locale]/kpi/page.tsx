import { KpiClient, type KpiTab } from './KpiClient';

/**
 * Server shell. The active tab lives in the URL so a KPI view is shareable —
 * the same pattern as /reports.
 */
const VALID_TABS: readonly string[] = ['report', 'utilization', 'repeat-cost'];

export default async function KpiPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const initialTab: KpiTab = VALID_TABS.includes(tab ?? '') ? (tab as KpiTab) : 'report';
  return <KpiClient initialTab={initialTab} />;
}
