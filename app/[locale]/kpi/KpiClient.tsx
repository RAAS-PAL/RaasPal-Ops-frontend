'use client';

/**
 * KPI section — one tab per area of the RE Team KPI deck.
 *
 * Only the KPI report tab is built. Utilization and Repeat Cost are declared
 * here so the structure is visible and the routes work, but they render an
 * explicit "not built yet" state rather than a half-finished panel.
 */
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { BarChart3, Banknote, Users } from 'lucide-react';
import { AppSidebar } from '@/components/AppSidebar';
import { AppTopBar } from '@/components/AppTopBar';
import { ReKpiReportTab } from '@/components/kpi/ReKpiReportTab';

export type KpiTab = 'report' | 'utilization' | 'repeat-cost';

export function KpiClient({ initialTab = 'report' }: { initialTab?: KpiTab }) {
  const t = useTranslations('kpi');
  const [tab, setTab] = useState<KpiTab>(initialTab);

  const selectTab = (next: KpiTab) => {
    setTab(next);
    window.history.replaceState(null, '', `?tab=${next}`);
  };

  const tabs: { id: KpiTab; label: string; icon: React.ReactNode }[] = [
    { id: 'report', label: t('tabs.report'), icon: <BarChart3 className="h-4 w-4" /> },
    { id: 'utilization', label: t('tabs.utilization'), icon: <Users className="h-4 w-4" /> },
    { id: 'repeat-cost', label: t('tabs.repeatCost'), icon: <Banknote className="h-4 w-4" /> },
  ];

  return (
    <main className="min-h-dvh bg-[var(--app-bg)] text-[var(--app-text)] transition-colors">
      <div className="flex min-h-dvh">
        <AppSidebar />
        <section className="flex min-w-0 flex-1 flex-col">
          <AppTopBar eyebrow={t('eyebrow')} title={t('title')} searchPlaceholder={t('searchPlaceholder')} />

          <div className="mx-auto w-full max-w-[1600px] space-y-4 p-4 sm:p-6">
            <div className="flex flex-wrap gap-2 border-b border-[var(--app-border)] print:hidden">
              {tabs.map((item) => {
                const active = tab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => selectTab(item.id)}
                    aria-current={active ? 'page' : undefined}
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

            {tab === 'report' && <ReKpiReportTab />}
            {tab !== 'report' && (
              <div className="rounded-xl border border-dashed border-[var(--app-border-strong)] bg-[var(--app-panel-soft)] p-10 text-center">
                <p className="text-sm font-semibold text-[var(--app-text)]">
                  {tab === 'utilization' ? t('tabs.utilization') : t('tabs.repeatCost')}
                </p>
                <p className="mt-1 text-xs text-[var(--app-muted)]">{t('notBuiltYet')}</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
