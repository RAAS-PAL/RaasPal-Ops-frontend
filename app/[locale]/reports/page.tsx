import { ReportsClient, type ReportTab } from './ReportsClient';

const VALID_TABS: readonly string[] = [
  'automation',
  'company',
  'email',
  'preview',
  'autoxing',
  'cm-new',
  'cm-history',
  'case-mk',
];

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const initialTab: ReportTab = VALID_TABS.includes(tab ?? '') ? (tab as ReportTab) : 'automation';
  return <ReportsClient initialTab={initialTab} />;
}
