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
  'case-mk',
  'case-cleaning',
  'case-makro',
  'case-aotga',
  'case-delivery',
  'case-on-hold',
];

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
  const initialTab: ReportTab = VALID_TABS.includes(tab ?? '') ? (tab as ReportTab) : 'automation';
  // `customer` opens that customer's company report straight away — the dashboard's
  // tracking list links each not-yet-sent customer here.
  return <ReportsClient initialTab={initialTab} initialCustomerId={customer ?? null} />;
}
