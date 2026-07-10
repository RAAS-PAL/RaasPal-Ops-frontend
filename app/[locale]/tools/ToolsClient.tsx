'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Bot, CalendarClock, FileSearch, Mail, Radio, Users } from 'lucide-react';
import { AppSidebar } from '@/components/AppSidebar';
import { AppTopBar } from '@/components/AppTopBar';
import { CvteMonitorPanel } from '@/components/CvteMonitorPanel';
import { CustomersPanel } from '@/components/CustomersPanel';
import { RobotsPanel } from '@/components/RobotsPanel';
import { ReportPreviewPanel } from '@/components/ReportPreviewPanel';
import { ReportAutomationPanel } from '@/components/ReportAutomationPanel';
import { CustomerEmailPanel } from '@/components/CustomerEmailPanel';

type ToolTab = 'monitor' | 'reports' | 'email' | 'preview' | 'customers' | 'robots';

export function ToolsClient({ initialTab = 'monitor' }: { initialTab?: ToolTab }) {
  const t = useTranslations('tools');
  const [tab, setTab] = useState<ToolTab>(initialTab);

  const tabs: { id: ToolTab; label: string; icon: React.ReactNode }[] = [
    { id: 'monitor', label: t('tabs.monitor'), icon: <Radio className="h-4 w-4" /> },
    { id: 'reports', label: t('tabs.reports'), icon: <CalendarClock className="h-4 w-4" /> },
    { id: 'email', label: t('tabs.email'), icon: <Mail className="h-4 w-4" /> },
    { id: 'preview', label: t('tabs.preview'), icon: <FileSearch className="h-4 w-4" /> },
    { id: 'customers', label: t('tabs.customers'), icon: <Users className="h-4 w-4" /> },
    { id: 'robots', label: t('tabs.robots'), icon: <Bot className="h-4 w-4" /> },
  ];

  return (
    <main className="min-h-dvh bg-[var(--app-bg)] text-[var(--app-text)] transition-colors">
      <div className="flex min-h-dvh">
        <AppSidebar />
        <section className="flex min-w-0 flex-1 flex-col">
          <AppTopBar eyebrow={t('eyebrow')} title={t('title')} searchPlaceholder={t('searchPlaceholder')} />

          <div className="space-y-5 p-4 sm:p-6">
            {/* Tab switcher */}
            <div className="inline-flex rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-1">
              {tabs.map((item) => {
                const active = tab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTab(item.id)}
                    className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
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

            {tab === 'monitor' && <CvteMonitorPanel />}
            {tab === 'reports' && <ReportAutomationPanel />}
            {tab === 'email' && <CustomerEmailPanel />}
            {tab === 'preview' && <ReportPreviewPanel />}
            {tab === 'customers' && <CustomersPanel />}
            {tab === 'robots' && <RobotsPanel />}
          </div>
        </section>
      </div>
    </main>
  );
}
