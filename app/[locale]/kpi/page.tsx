import { redirect } from 'next/navigation';
import { routing } from '@/i18n/routing';

/**
 * /kpi has no view of its own — each area of the deck is its own route, reached
 * from the KPI group in the sidebar.
 *
 * The old single page carried the area in `?tab=`. That is honoured here so a
 * link shared before the split still lands on the area it named, with its period
 * intact, rather than silently dropping the reader on the report.
 */
const TAB_TO_SECTION: Record<string, string> = {
  report: 'report',
  utilization: 'utilization',
  'repeat-cost': 'repeat-cost',
};

export default async function KpiIndexPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string; from?: string; to?: string; preset?: string; kpi?: string }>;
}) {
  const { locale } = await params;
  const { tab, ...carried } = await searchParams;

  const safeLocale = (routing.locales as readonly string[]).includes(locale)
    ? locale
    : routing.defaultLocale;
  const section = TAB_TO_SECTION[tab ?? ''] ?? 'report';

  const query = new URLSearchParams(
    Object.entries(carried).filter((entry): entry is [string, string] => Boolean(entry[1])),
  ).toString();

  redirect(`/${safeLocale}/kpi/${section}${query ? `?${query}` : ''}`);
}
