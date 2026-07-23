'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { CalendarClock, FileSearch, Mail } from 'lucide-react';
import { AppSidebar } from '@/components/AppSidebar';
import { AppTopBar } from '@/components/AppTopBar';
import { ReportAutomationPanel } from '@/components/ReportAutomationPanel';
import { CustomerEmailPanel } from '@/components/CustomerEmailPanel';
import { ReportPreviewPanel } from '@/components/ReportPreviewPanel';

const REPORT_TABS = ['automation', 'email', 'preview'] as const;

export type ReportTab = (typeof REPORT_TABS)[number];

export function ReportsClient({ initialTab = 'automation' }: { initialTab?: ReportTab }) {
  const t = useTranslations('reports');
  const [tab, setTab] = useState<ReportTab>(initialTab);

  // Keep the active tab in the URL so a report view is shareable/bookmarkable.
  const selectTab = (next: ReportTab) => {
    setTab(next);
    window.history.replaceState(null, '', `?tab=${next}`);
  };

  const tabs: { id: ReportTab; label: string; icon: React.ReactNode }[] = [
    { id: 'automation', label: t('tabs.automation'), icon: <CalendarClock className="h-4 w-4" /> },
    { id: 'email', label: t('tabs.email'), icon: <Mail className="h-4 w-4" /> },
    { id: 'preview', label: t('tabs.preview'), icon: <FileSearch className="h-4 w-4" /> },
  ];

  return (
    <main className="min-h-dvh bg-[var(--app-bg)] text-[var(--app-text)] transition-colors">
      <div className="flex min-h-dvh">
        <AppSidebar />
        <section className="flex min-w-0 flex-1 flex-col">
          <AppTopBar eyebrow={t('eyebrow')} title={t('title')} searchPlaceholder={t('searchPlaceholder')} />

          <div className="mx-auto w-full max-w-5xl space-y-5 p-4 sm:p-6">
            {/* Tab switcher — scrolls horizontally instead of wrapping/overflowing */}
            <div className="flex max-w-full gap-1 overflow-x-auto rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-1 sm:inline-flex sm:w-fit">
              {tabs.map((item) => {
                const active = tab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => selectTab(item.id)}
                    className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition ${
                      active
                        ? 'bg-[var(--app-brand)] text-white shadow-sm'
                        : 'text-[var(--app-muted)] hover:text-[var(--app-brand-dark)]'
                    }`}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                );
              })}
            </div>

            {tab === 'automation' && <ReportAutomationPanel />}
            {tab === 'email' && <CustomerEmailPanel />}
            {tab === 'preview' && <ReportPreviewPanel />}
          </div>
        </section>
      </div>
    </main>
  );
}
