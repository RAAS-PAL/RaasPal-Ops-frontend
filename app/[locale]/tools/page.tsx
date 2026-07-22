import { ToolsClient, type ToolTab } from './ToolsClient';

const VALID_TABS: readonly string[] = ['monitor', 'reports', 'email', 'preview', 'customers', 'robots'];

export default async function ToolsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const initialTab: ToolTab = VALID_TABS.includes(tab ?? '') ? (tab as ToolTab) : 'monitor';
  return <ToolsClient initialTab={initialTab} />;
}
