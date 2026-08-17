'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Building2, CalendarClock, FileSearch, Gauge, History, Mail, Wrench } from 'lucide-react';
import { AppSidebar } from '@/components/AppSidebar';
import { AppTopBar } from '@/components/AppTopBar';
import { ReportAutomationPanel } from '@/components/ReportAutomationPanel';
import { CustomerBundlePanel } from '@/components/CustomerBundlePanel';
import { CustomerEmailPanel } from '@/components/CustomerEmailPanel';
import { ReportPreviewPanel } from '@/components/ReportPreviewPanel';
import { AutoxingReportPanel } from '@/components/AutoxingReportPanel';
import { CmReportPanel } from '@/components/CmReportPanel';
import { CmReportHistoryPanel } from '@/components/CmReportHistoryPanel';

const REPORT_TABS = [
  'automation',
  'company',
  'email',
  'preview',
  'autoxing',
  'cm-new',
  'cm-history',
] as const;

export type ReportTab = (typeof REPORT_TABS)[number];

/**
 * Reports covers two unrelated jobs — scheduled robot-performance reporting, and
 * one-off corrective maintenance write-ups — so the tabs are grouped rather than
 * sitting in one long row.
 *
 * The group is derived from the tab rather than tracked in its own query param,
 * which keeps existing `?tab=automation` and `?tab=autoxing` links working.
 */
const TAB_GROUP: Record<ReportTab, 'performance' | 'cm'> = {
  automation: 'performance',
  company: 'performance',
  email: 'performance',
  preview: 'performance',
  autoxing: 'performance',
  'cm-new': 'cm',
  'cm-history': 'cm',
};

type ReportGroup = 'performance' | 'cm';

const GROUP_DEFAULT_TAB: Record<ReportGroup, ReportTab> = {
  performance: 'automation',
  cm: 'cm-new',
};

export function ReportsClient({ initialTab = 'automation' }: { initialTab?: ReportTab }) {
  const t = useTranslations('reports');
  const [tab, setTab] = useState<ReportTab>(initialTab);
  const group = TAB_GROUP[tab];

  // Keep the active tab in the URL so a report view is shareable/bookmarkable.
  const selectTab = (next: ReportTab) => {
    setTab(next);
    window.history.replaceState(null, '', `?tab=${next}`);
  };

  const groups: { id: ReportGroup; label: string; icon: React.ReactNode }[] = [
    { id: 'performance', label: t('groups.performance'), icon: <Gauge className="h-4 w-4" /> },
    { id: 'cm', label: t('groups.correctiveMaintenance'), icon: <Wrench className="h-4 w-4" /> },
  ];

  const tabs: { id: ReportTab; label: string; icon: React.ReactNode }[] =
    group === 'performance'
      ? [
          { id: 'automation', label: t('tabs.automation'), icon: <CalendarClock className="h-4 w-4" /> },
          { id: 'company', label: t('tabs.company'), icon: <Building2 className="h-4 w-4" /> },
          { id: 'email', label: t('tabs.email'), icon: <Mail className="h-4 w-4" /> },
          { id: 'preview', label: t('tabs.preview'), icon: <FileSearch className="h-4 w-4" /> },
          { id: 'autoxing', label: t('tabs.autoxing'), icon: <Gauge className="h-4 w-4" /> },
        ]
      : [
          { id: 'cm-new', label: t('tabs.cmNew'), icon: <Wrench className="h-4 w-4" /> },
          { id: 'cm-history', label: t('tabs.cmHistory'), icon: <History className="h-4 w-4" /> },
        ];

  return (
    <main className="min-h-dvh bg-[var(--app-bg)] text-[var(--app-text)] transition-colors">
      <div className="flex min-h-dvh">
        <AppSidebar />
        <section className="flex min-w-0 flex-1 flex-col">
          <AppTopBar eyebrow={t('eyebrow')} title={t('title')} searchPlaceholder={t('searchPlaceholder')} />

          <div className="mx-auto w-full max-w-5xl space-y-5 p-4 sm:p-6">
            {/* Sub-section switcher — hidden when printing a report below. */}
            <div className="flex flex-wrap gap-2 border-b border-[var(--app-border)] print:hidden">
              {groups.map((item) => {
                const active = group === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => selectTab(GROUP_DEFAULT_TAB[item.id])}
                    className={`-mb-px inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-3 pb-2.5 pt-1 text-sm font-semibold transition ${
                      active
                        ? 'border-[var(--app-brand)] text-[var(--app-brand-dark)]'
                        : 'border-transparent text-[var(--app-muted)] hover:text-[var(--app-text)]'
                    }`}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                );
              })}
            </div>

            {/* Tab switcher — scrolls horizontally instead of wrapping/overflowing */}
            <div className="flex max-w-full gap-1 overflow-x-auto rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-1 print:hidden sm:inline-flex sm:w-fit">
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
            {tab === 'company' && <CustomerBundlePanel />}
            {tab === 'email' && <CustomerEmailPanel />}
            {tab === 'preview' && <ReportPreviewPanel />}
            {tab === 'autoxing' && <AutoxingReportPanel />}
            {tab === 'cm-new' && <CmReportPanel />}
            {tab === 'cm-history' && <CmReportHistoryPanel />}
          </div>
        </section>
      </div>
    </main>
  );
}
