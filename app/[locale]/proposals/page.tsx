import { redirect } from '@/i18n/navigation';

/**
 * The proposals list moved to the Solutions page's Proposals tab. Kept as a redirect
 * for old bookmarks; a proposal's own page under /proposals/[id] stays where it is.
 */
export default async function ProposalsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect({ href: '/solutions?tab=proposals', locale });
}
