'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Building2, CalendarClock, ClipboardList, FileSearch, Gauge, History, Mail, Wrench } from 'lucide-react';
import { AppSidebar } from '@/components/AppSidebar';
import { AppTopBar } from '@/components/AppTopBar';
import { ReportAutomationPanel } from '@/components/ReportAutomationPanel';
import { CustomerBundlePanel } from '@/components/CustomerBundlePanel';
import { CustomerEmailPanel } from '@/components/CustomerEmailPanel';
import { ReportPreviewPanel } from '@/components/ReportPreviewPanel';
import { AutoxingReportPanel } from '@/components/AutoxingReportPanel';
import { CmReportPanel } from '@/components/CmReportPanel';
import { CmReportHistoryPanel } from '@/components/CmReportHistoryPanel';
import { CasePendingPanel } from '@/components/CasePendingPanel';

const REPORT_TABS = [
  'automation',
  'company',
  'email',
  'preview',
  'autoxing',
  'cm-new',
  'cm-history',
  'case-mk',
] as const;

export type ReportTab = (typeof REPORT_TABS)[number];

/**
 * Reports covers three unrelated jobs — scheduled robot-performance reporting,
 * one-off corrective maintenance write-ups, and the daily pending-case report — so the
 * tabs are grouped rather than sitting in one long row.
 *
 * The group is derived from the tab rather than tracked in its own query param,
 * which keeps existing `?tab=automation` and `?tab=autoxing` links working.
 */
const TAB_GROUP: Record<ReportTab, 'performance' | 'cm' | 'case'> = {
  automation: 'performance',
  company: 'performance',
  email: 'performance',
  preview: 'performance',
  autoxing: 'performance',
  'cm-new': 'cm',
  'cm-history': 'cm',
  'case-mk': 'case',
};

type ReportGroup = 'performance' | 'cm' | 'case';

const GROUP_DEFAULT_TAB: Record<ReportGroup, ReportTab> = {
  performance: 'automation',
  cm: 'cm-new',
  case: 'case-mk',
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
    { id: 'case', label: t('groups.pendingCases'), icon: <ClipboardList className="h-4 w-4" /> },
  ];

  // A lookup rather than a ternary: with three groups a nested conditional stops
  // being readable, and a fourth report would have to nest again.
  const TABS_BY_GROUP: Record<ReportGroup, { id: ReportTab; label: string; icon: React.ReactNode }[]> = {
    performance: [
      { id: 'automation', label: t('tabs.automation'), icon: <CalendarClock className="h-4 w-4" /> },
      { id: 'company', label: t('tabs.company'), icon: <Building2 className="h-4 w-4" /> },
      { id: 'email', label: t('tabs.email'), icon: <Mail className="h-4 w-4" /> },
      { id: 'preview', label: t('tabs.preview'), icon: <FileSearch className="h-4 w-4" /> },
      { id: 'autoxing', label: t('tabs.autoxing'), icon: <Gauge className="h-4 w-4" /> },
    ],
    cm: [
      { id: 'cm-new', label: t('tabs.cmNew'), icon: <Wrench className="h-4 w-4" /> },
      { id: 'cm-history', label: t('tabs.cmHistory'), icon: <History className="h-4 w-4" /> },
    ],
    case: [
      { id: 'case-mk', label: t('tabs.caseMk'), icon: <ClipboardList className="h-4 w-4" /> },
    ],
  };

  const tabs = TABS_BY_GROUP[group];

  return (
    <main className="min-h-dvh bg-[var(--app-bg)] text-[var(--app-text)] transition-colors">
      <div className="flex min-h-dvh">
        <AppSidebar />
        <section className="flex min-w-0 flex-1 flex-col">
          <AppTopBar eyebrow={t('eyebrow')} title={t('title')} searchPlaceholder={t('searchPlaceholder')} />

          {/* Full width, as PM Planning is: the pending-case table has eleven columns of
              Thai text and was clipping its last two inside the old 64rem cap. The CM
              report sheet sizes itself to A4 and centres, so it is unaffected. */}
          <div className="w-full space-y-5 p-4 sm:p-6">
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
            {tab === 'case-mk' && <CasePendingPanel />}
          </div>
        </section>
      </div>
    </main>
  );
}
