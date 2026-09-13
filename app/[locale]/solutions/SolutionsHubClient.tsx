'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ClipboardList, FileText, Sparkles } from 'lucide-react';
import { AppSidebar } from '@/components/AppSidebar';
import { AppTopBar } from '@/components/AppTopBar';
import { GenerateSolutionHub } from '@/components/solutions/GenerateSolutionHub';
import { SolutionsList } from './SolutionsClient';
import { ProposalsList } from '@/app/[locale]/proposals/ProposalsClient';

/**
 * One page for the whole solution workflow: start one, look at the saved ones, look
 * at the proposals made from them.
 *
 * <p>These were three sidebar entries for what is one job done in sequence, and the
 * team moved between them constantly. Grouped as tabs, the way Reports groups its
 * three jobs. The tab is kept in the URL so a list is linkable, and the old paths
 * (/generate-solution, /proposals) redirect here so nothing bookmarked breaks. The
 * generation flow's own steps and a proposal's detail page keep their routes.
 *
 * <p>The top bar's search box belongs to whichever list is showing; the Generate tab
 * has nothing to search, so the box is not drawn there.
 */

export const SOLUTION_TABS = ['generate', 'solutions', 'proposals'] as const;
export type SolutionTab = (typeof SOLUTION_TABS)[number];

export function SolutionsHubClient({ initialTab = 'generate' }: { initialTab?: SolutionTab }) {
  const t = useTranslations('solutionsHub');
  const tSolutions = useTranslations('solutions');
  const tProposals = useTranslations('proposals');
  const [tab, setTab] = useState<SolutionTab>(initialTab);
  // One query per list, so switching tabs does not carry a filter across.
  const [solutionsQuery, setSolutionsQuery] = useState('');
  const [proposalsQuery, setProposalsQuery] = useState('');

  const selectTab = (next: SolutionTab) => {
    setTab(next);
    window.history.replaceState(null, '', `?tab=${next}`);
  };

  const tabs: { id: SolutionTab; label: string; icon: React.ReactNode }[] = [
    { id: 'generate', label: t('tabs.generate'), icon: <Sparkles className="h-4 w-4" /> },
    { id: 'solutions', label: t('tabs.solutions'), icon: <ClipboardList className="h-4 w-4" /> },
    { id: 'proposals', label: t('tabs.proposals'), icon: <FileText className="h-4 w-4" /> },
  ];

  const search =
    tab === 'solutions'
      ? { placeholder: tSolutions('searchPlaceholder'), value: solutionsQuery, onChange: setSolutionsQuery }
      : tab === 'proposals'
        ? { placeholder: tProposals('searchPlaceholder'), value: proposalsQuery, onChange: setProposalsQuery }
        : null;

  return (
    <main className="min-h-dvh bg-[var(--app-bg)] text-[var(--app-text)] transition-colors">
      <div className="flex min-h-dvh">
        <AppSidebar />
        <section className="flex min-w-0 flex-1 flex-col">
          <AppTopBar
            eyebrow={t('eyebrow')}
            title={t('title')}
            searchPlaceholder={search?.placeholder}
            searchValue={search?.value}
            onSearchChange={search?.onChange}
          />

          <div className="w-full space-y-5 p-4 sm:p-6">
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
                        : 'text-[var(--app-muted)] hover:bg-[var(--app-faint)] hover:text-[var(--app-brand-dark)]'
                    }`}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                );
              })}
            </div>

            {tab === 'generate' && <GenerateSolutionHub />}
            {tab === 'solutions' && (
              <div className="mx-auto w-full max-w-6xl">
                <SolutionsList searchQuery={solutionsQuery} />
              </div>
            )}
            {tab === 'proposals' && (
              <div className="mx-auto w-full max-w-6xl">
                <ProposalsList searchQuery={proposalsQuery} />
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
