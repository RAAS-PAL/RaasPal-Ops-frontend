'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Bot, Handshake, Radio, Users } from 'lucide-react';
import { AppSidebar } from '@/components/AppSidebar';
import { AppTopBar } from '@/components/AppTopBar';
import { CvteMonitorPanel } from '@/components/CvteMonitorPanel';
import { CustomersPanel } from '@/components/CustomersPanel';
import { RobotsPanel } from '@/components/RobotsPanel';
import { PartnersPanel } from '@/components/PartnersPanel';

const TOOL_TABS = ['monitor', 'customers', 'robots', 'partners'] as const;

export type ToolTab = (typeof TOOL_TABS)[number];

export function ToolsClient({ initialTab = 'monitor' }: { initialTab?: ToolTab }) {
  const t = useTranslations('tools');
  const [tab, setTab] = useState<ToolTab>(initialTab);

  // Keep the active tab in the URL so tool views are shareable/bookmarkable.
  const selectTab = (next: ToolTab) => {
    setTab(next);
    window.history.replaceState(null, '', `?tab=${next}`);
  };

  const tabs: { id: ToolTab; label: string; icon: React.ReactNode }[] = [
    { id: 'monitor', label: t('tabs.monitor'), icon: <Radio className="h-4 w-4" /> },
    { id: 'customers', label: t('tabs.customers'), icon: <Users className="h-4 w-4" /> },
    { id: 'robots', label: t('tabs.robots'), icon: <Bot className="h-4 w-4" /> },
    { id: 'partners', label: t('tabs.partners'), icon: <Handshake className="h-4 w-4" /> },
  ];

  return (
    <main className="min-h-dvh bg-[var(--app-bg)] text-[var(--app-text)] transition-colors">
      <div className="flex min-h-dvh">
        <AppSidebar />
        <section className="flex min-w-0 flex-1 flex-col">
          <AppTopBar eyebrow={t('eyebrow')} title={t('title')} searchPlaceholder={t('searchPlaceholder')} />

          <div className="space-y-5 p-4 sm:p-6">
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

            {tab === 'monitor' && <CvteMonitorPanel />}
            {tab === 'customers' && <CustomersPanel />}
            {tab === 'robots' && <RobotsPanel />}
            {tab === 'partners' && <PartnersPanel />}
          </div>
        </section>
      </div>
    </main>
  );
}
