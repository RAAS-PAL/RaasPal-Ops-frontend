import { SolutionsHubClient, SOLUTION_TABS, type SolutionTab } from './SolutionsHubClient';

export default async function SolutionsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const initialTab: SolutionTab = (SOLUTION_TABS as readonly string[]).includes(tab ?? '')
    ? (tab as SolutionTab)
    : 'generate';
  return <SolutionsHubClient initialTab={initialTab} />;
}
