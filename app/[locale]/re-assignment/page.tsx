import { ReAssignmentClient, type ReTab } from './ReAssignmentClient';

const VALID_TABS: readonly string[] = ['queue', 'engineers', 'skills', 'mapping', 'history'];

/** RE assignment for CM tickets. The tab is read here, server-side, like the Tools page. */
export default async function ReAssignmentPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const initialTab: ReTab = VALID_TABS.includes(tab ?? '') ? (tab as ReTab) : 'queue';
  return <ReAssignmentClient initialTab={initialTab} />;
}
