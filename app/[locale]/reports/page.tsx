import { redirect } from '@/i18n/navigation';
import { ReportsClient, type ReportTab } from './ReportsClient';

const VALID_TABS: readonly string[] = [
  'automation',
  'company',
  'preview',
  'zero-data',
  'autoxing',
  'pudu',
  'cm-new',
  'cm-history',
  'case-internal',
  'case-mk',
  'case-aot',
  'case-pcs',
  'case-makro',
  'case-ifs',
  'case-on-hold',
];

/**
 * Pending-case tabs that were folded into others, so an old bookmark still lands on the
 * cases it showed: Cleaning and Delivery are the two halves of Internal now, and AOTGA is
 * the AOT tab.
 */
const RENAMED_TABS: Record<string, string> = {
  'case-cleaning': 'case-internal',
  'case-delivery': 'case-internal',
  'case-aotga': 'case-aot',
  'case-summary': 'case-internal',
  // The IFS tab was first built as "ITS"; links to it still land on IFS.
  'case-its': 'case-ifs',
};

export default async function ReportsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string; customer?: string }>;
}) {
  const { tab, customer } = await searchParams;

  // "Email customers" and "Contracts" both moved to Tools. Redirected rather than
  // dropped, so a bookmark or a pasted link lands on the panel instead of silently
  // opening Manage automation.
  if (tab === 'email' || tab === 'contracts') {
    const { locale } = await params;
    redirect({ href: `/tools?tab=${tab}`, locale });
  }
  const wanted = RENAMED_TABS[tab ?? ''] ?? tab ?? '';
  const initialTab: ReportTab = VALID_TABS.includes(wanted) ? (wanted as ReportTab) : 'automation';
  // `customer` opens that customer's company report straight away — the dashboard's
  // tracking list links each not-yet-sent customer here.
  return <ReportsClient initialTab={initialTab} initialCustomerId={customer ?? null} />;
}
