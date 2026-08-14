import { RobotsClient, type RobotsView } from './RobotsClient';

/**
 * The view is read here, server-side, and passed down as a prop — the same shape
 * as the Reports page. Reading it in the client with useSearchParams would force
 * the whole page behind a Suspense boundary, because Next cannot prerender a
 * component that touches the query string.
 */
export default async function RobotsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  const initialView: RobotsView = view === 'specs' ? 'specs' : 'catalog';
  return <RobotsClient initialView={initialView} />;
}
