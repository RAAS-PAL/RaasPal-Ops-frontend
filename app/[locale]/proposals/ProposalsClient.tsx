'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Bot, ClipboardList, FileText, Loader2, Plus, Trash2 } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { AppSidebar } from '@/components/AppSidebar';
import { AppTopBar } from '@/components/AppTopBar';
import { ListSkeleton } from '@/components/ui/skeleton';
import { StatusBadge, toneForStatus } from '@/components/ui/status-badge';
import { proposalApi } from '@/lib/api';
import type { GeneratedProposalResponse } from '@/types/api';

function ProposalCard({
  proposal,
  onDelete,
  isDeleting,
}: {
  proposal: GeneratedProposalResponse;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const t = useTranslations('proposals');
  const [confirming, setConfirming] = useState(false);
  const date = new Date(proposal.createdAt).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <article className="flex flex-col gap-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-4 shadow-sm transition hover:border-[var(--app-brand)] hover:shadow-md hover:shadow-[var(--app-brand-glow)] sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--app-brand-soft)] text-[var(--app-brand-dark)]">
          <Bot className="h-5 w-5" />
        </span>
        <div>
          <p className="font-semibold text-[var(--app-text)]">
            {proposal.recommendationName
              ? `${proposal.recommendationName} ${t('proposalSuffix')}`
              : (proposal.title ?? t('untitled'))}
          </p>
          <p className="mt-0.5 text-xs text-[var(--app-muted)]">{t('generated', { date })}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 pl-[52px] sm:pl-0">
        <StatusBadge tone={proposal.status === 'FINAL' ? 'success' : toneForStatus(proposal.status)}>
          {proposal.status}
        </StatusBadge>
        <Link
          className="flex items-center gap-1.5 rounded-lg border border-[var(--app-border)] px-3 py-1.5 text-sm font-semibold text-[var(--app-muted)] transition hover:border-[var(--app-brand)] hover:text-[var(--app-brand-dark)]"
          href={`/proposals/${proposal.id}`}
        >
          <FileText className="h-3.5 w-3.5" />
          {t('view')}
        </Link>

        {confirming ? (
          <div className="flex items-center gap-1.5">
            <button
              className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
              disabled={isDeleting}
              onClick={onDelete}
              type="button"
            >
              {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t('confirmDelete')}
            </button>
            <button
              className="rounded-lg border border-[var(--app-border)] px-3 py-1.5 text-sm font-semibold text-[var(--app-muted)] transition hover:border-[var(--app-brand)] hover:text-[var(--app-brand-dark)]"
              disabled={isDeleting}
              onClick={() => setConfirming(false)}
              type="button"
            >
              {t('cancel')}
            </button>
          </div>
        ) : (
          <button
            className="flex items-center gap-1.5 rounded-lg border border-[var(--app-border)] px-3 py-1.5 text-sm font-semibold text-[var(--app-muted)] transition hover:border-red-400 hover:text-red-500"
            onClick={() => setConfirming(true)}
            type="button"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {t('delete')}
          </button>
        )}
      </div>
    </article>
  );
}

function EmptyState({ filtered }: { filtered: boolean }) {
  const t = useTranslations('proposals');
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--app-border)] bg-[var(--app-panel)] py-20 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--app-brand)] to-[var(--app-brand-dark)] text-white shadow-sm shadow-[var(--app-brand-glow)]">
        <ClipboardList className="h-7 w-7" />
      </span>
      <h3 className="mt-4 text-lg font-semibold text-[var(--app-text)]">
        {filtered ? t('noResults') : t('empty')}
      </h3>
      <p className="mt-1 max-w-xs text-sm text-[var(--app-muted)]">
        {filtered ? t('noResultsDesc') : t('generateFirst')}
      </p>
      {!filtered && (
        <Link
          className="mt-6 flex items-center gap-2 rounded-lg bg-[var(--app-brand)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--app-brand-dark)]"
          href="/generate-solution"
        >
          <Plus className="h-4 w-4" />
          {t('generateSolution')}
        </Link>
      )}
    </div>
  );
}

export function ProposalsClient() {
  const t = useTranslations('proposals');
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['proposals'],
    queryFn: () => proposalApi.getAll(0, 200).then((r) => r.data.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => proposalApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['proposals'] }),
  });

  const all = data?.content ?? [];
  const query = searchQuery.trim().toLowerCase();
  const filtered = query
    ? all.filter((p) => {
        const name = (p.recommendationName ?? p.title ?? '').toLowerCase();
        return name.includes(query);
      })
    : all;

  return (
    <main className="min-h-dvh bg-[var(--app-bg)] text-[var(--app-text)] transition-colors">
      <div className="flex min-h-dvh">
        <AppSidebar />
        <section className="flex min-w-0 flex-1 flex-col">
          <AppTopBar
            eyebrow={t('eyebrow')}
            title={t('pageTitle')}
            searchPlaceholder={t('searchPlaceholder')}
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
          />

          <div className="mx-auto w-full max-w-6xl space-y-4 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-[var(--app-muted)]">
                {isLoading
                  ? t('loading')
                  : query
                    ? t('searchResults', { count: filtered.length, query: searchQuery })
                    : t('count', { count: data?.totalElements ?? 0 })}
              </p>
              <Link
                className="flex items-center gap-2 rounded-lg bg-[var(--app-brand)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--app-brand-dark)]"
                href="/generate-solution"
              >
                <Plus className="h-4 w-4" />
                {t('newSolution')}
              </Link>
            </div>

            {isLoading && <ListSkeleton rows={5} />}

            {isError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
                {t('failedToLoad')}
              </div>
            )}

            {!isLoading && !isError && filtered.length === 0 && (
              <EmptyState filtered={query.length > 0} />
            )}

            {filtered.length > 0 && (
              <div className="space-y-3">
                {filtered.map((proposal) => (
                  <ProposalCard
                    key={proposal.id}
                    proposal={proposal}
                    onDelete={() => deleteMutation.mutate(proposal.id)}
                    isDeleting={deleteMutation.isPending && deleteMutation.variables === proposal.id}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
