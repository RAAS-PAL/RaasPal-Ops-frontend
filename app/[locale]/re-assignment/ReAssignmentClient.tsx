'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Bot, ClipboardList, History, ListChecks, Users } from 'lucide-react';
import { AppSidebar } from '@/components/AppSidebar';
import { AppTopBar } from '@/components/AppTopBar';
import { QueuePanel } from '@/components/re-assignment/QueuePanel';
import { EngineersPanel } from '@/components/re-assignment/EngineersPanel';
import { SkillMatrixPanel } from '@/components/re-assignment/SkillMatrixPanel';
import { MappingPanel } from '@/components/re-assignment/MappingPanel';
import { HistoryPanel } from '@/components/re-assignment/HistoryPanel';
import { reAssignmentApi } from '@/lib/api';

export type ReTab = 'queue' | 'engineers' | 'skills' | 'mapping' | 'history';

/**
 * RE assignment for CM tickets: the queue of suggestions to approve, the engineer
 * directory, the skill matrix, which board robot labels count as which matrix model, and
 * the approval history. Only the queue is visible without manage rights.
 */
export function ReAssignmentClient({ initialTab }: { initialTab: ReTab }) {
  const t = useTranslations('reAssignment');
  const [tab, setTab] = useState<ReTab>(initialTab);
  const access = useQuery({
    queryKey: ['re-access'],
    queryFn: () => reAssignmentApi.access().then((r) => r.data.data),
  });
  const canManage = access.data?.canManage ?? false;

  function select(next: ReTab) {
    setTab(next);
    const params = new URLSearchParams(window.location.search);
    params.set('tab', next);
    window.history.replaceState(null, '', `?${params.toString()}`);
  }

  const tabs: { id: ReTab; label: string; icon: React.ReactNode; manage: boolean }[] = [
    { id: 'queue', label: t('tabs.queue'), icon: <ListChecks className="h-4 w-4" />, manage: false },
    { id: 'engineers', label: t('tabs.engineers'), icon: <Users className="h-4 w-4" />, manage: true },
    { id: 'skills', label: t('tabs.skills'), icon: <ClipboardList className="h-4 w-4" />, manage: true },
    { id: 'mapping', label: t('tabs.mapping'), icon: <Bot className="h-4 w-4" />, manage: true },
    { id: 'history', label: t('tabs.history'), icon: <History className="h-4 w-4" />, manage: true },
  ];
  const visible = tabs.filter((x) => !x.manage || canManage);
  const current = visible.some((x) => x.id === tab) ? tab : 'queue';

  return (
    <main className="min-h-dvh bg-[var(--app-bg)] text-[var(--app-text)] transition-colors">
      <div className="flex min-h-dvh">
        <AppSidebar />
        <section className="flex min-w-0 flex-1 flex-col">
          <AppTopBar eyebrow={t('eyebrow')} title={t('title')} />
          <div className="space-y-5 p-4 sm:p-6">
            <div className="flex max-w-full gap-1 overflow-x-auto rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-1 sm:inline-flex sm:w-fit">
              {visible.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => select(item.id)}
                  className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition ${
                    current === item.id
                      ? 'bg-[var(--app-brand)] text-white shadow-sm'
                      : 'text-[var(--app-muted)] hover:text-[var(--app-brand-dark)]'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </div>

            {current === 'queue' && <QueuePanel onGoTo={select} />}
            {current === 'engineers' && <EngineersPanel isAdmin={access.data?.isAdmin ?? false} />}
            {current === 'skills' && <SkillMatrixPanel />}
            {current === 'mapping' && <MappingPanel />}
            {current === 'history' && <HistoryPanel />}
          </div>
        </section>
      </div>
    </main>
  );
}
