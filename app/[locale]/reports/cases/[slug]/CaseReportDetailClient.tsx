'use client';

import { useTranslations } from 'next-intl';
import { ArrowLeft } from 'lucide-react';
import { AppSidebar } from '@/components/AppSidebar';
import { AppTopBar } from '@/components/AppTopBar';
import { CASE_REPORTS, CaseReportSheet } from '@/components/CasePendingPanel';
import { Link } from '@/i18n/navigation';
import type { CaseReportSlug } from '@/lib/api';

/** The Reports tab each sheet belongs to, and its name there. */
const TAB: Record<CaseReportSlug, { tab: string; labelKey: string }> = {
  mk: { tab: 'case-mk', labelKey: 'tabs.caseMk' },
  cleaning: { tab: 'case-cleaning', labelKey: 'tabs.caseCleaning' },
  makro: { tab: 'case-makro', labelKey: 'tabs.caseMakro' },
  aotga: { tab: 'case-aotga', labelKey: 'tabs.caseAotga' },
  delivery: { tab: 'case-delivery', labelKey: 'tabs.caseDelivery' },
  'on-hold': { tab: 'case-on-hold', labelKey: 'tabs.caseOnHold' },
};

export function CaseReportDetailClient({ slug, initialDate }: { slug: CaseReportSlug; initialDate: string | null }) {
  const t = useTranslations('reports');
  const { tab, labelKey } = TAB[slug];

  return (
    <main className="min-h-dvh bg-[var(--app-bg)] text-[var(--app-text)] transition-colors">
      <div className="flex min-h-dvh">
        <AppSidebar />
        <section className="flex min-w-0 flex-1 flex-col">
          <AppTopBar eyebrow={t('eyebrow')} title={t('title')} searchPlaceholder={t('searchPlaceholder')} />

          {/* Full width, as the Reports page is: the sheet has up to twelve columns of Thai text. */}
          <div className="w-full space-y-5 p-4 sm:p-6">
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href={`/reports?tab=${tab}`}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--app-muted)] transition hover:text-[var(--app-brand-dark)]"
              >
                <ArrowLeft className="h-4 w-4" />
                {t('groups.pendingCases')}
              </Link>
              <span className="text-[var(--app-border)]">/</span>
              <h2 className="text-lg font-semibold">{t(labelKey)} — case details</h2>
            </div>

            <CaseReportSheet report={CASE_REPORTS[slug]} initialDate={initialDate} />
          </div>
        </section>
      </div>
    </main>
  );
}
