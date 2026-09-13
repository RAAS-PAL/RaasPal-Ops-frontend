import { redirect } from '@/i18n/navigation';

/**
 * The hub moved to the Solutions page's Generate tab. Kept as a redirect so old
 * bookmarks and the flow's own back links still land somewhere. The three-step flow
 * under /generate-solution/[type] stays where it is.
 */
export default async function GenerateSolutionPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect({ href: '/solutions?tab=generate', locale });
}
