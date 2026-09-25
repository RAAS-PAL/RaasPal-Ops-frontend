import { notFound } from 'next/navigation';
import type { CaseReportSlug } from '@/lib/api';
import { CaseReportDetailClient } from './CaseReportDetailClient';

/**
 * The rows of one pending-case sheet for one date, linked from that sheet's summary on
 * the Reports tab: `/reports/cases/mk?date=2026-09-25`.
 *
 * The slugs are listed here rather than read from CASE_REPORTS: that object lives in a
 * client module, which a server component sees only as a reference, not as data.
 */
const SLUGS: readonly CaseReportSlug[] = ['mk', 'cleaning', 'makro', 'aotga', 'delivery', 'on-hold'];

export default async function CaseReportDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const { slug } = await params;
  const { date } = await searchParams;
  if (!SLUGS.includes(slug as CaseReportSlug)) notFound();

  // A malformed date falls back to today rather than asking the backend for a sheet it
  // cannot parse.
  const initialDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
  return <CaseReportDetailClient slug={slug as CaseReportSlug} initialDate={initialDate} />;
}
