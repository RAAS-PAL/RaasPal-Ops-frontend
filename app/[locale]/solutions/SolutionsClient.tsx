'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Bot, ChevronRight, ClipboardList, FileText, Plus } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { AppSidebar } from '@/components/AppSidebar';
import { AppTopBar } from '@/components/AppTopBar';
import { ListSkeleton } from '@/components/ui/skeleton';
import { StatusBadge, toneForStatus } from '@/components/ui/status-badge';
import { recommendationApi } from '@/lib/api';
import type { RecommendationResponse } from '@/types/api';

function RecommendationCard({ rec }: { rec: RecommendationResponse }) {
  const t = useTranslations('solutions');
  const date = new Date(rec.createdAt).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

  const topOption = rec.options?.[0];
  const robotName = rec.name
    ?? (topOption
      ? `${topOption.robot.brand} ${topOption.robot.model}`
      : rec.status === 'COMPLETED'
        ? t('robotRecommendation')
        : t('processing'));
  const optionCount = rec.options?.length ?? 0;

  const solutionType = topOption?.robot.robotType?.toLowerCase() ?? 'cleaning';
  const viewHref = `/generate-solution/${solutionType}/recommendation?recId=${rec.id}`;

  return (
    <article className="flex flex-col gap-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-4 shadow-sm transition hover:border-[var(--app-brand)] hover:shadow-md hover:shadow-[var(--app-brand-glow)] sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--app-brand-soft)] text-[var(--app-brand-dark)]">
          <Bot className="h-5 w-5" />
        </span>
        <div>
          <p className="font-semibold text-[var(--app-text)]">{robotName}</p>
          <p className="mt-0.5 text-xs text-[var(--app-muted)]">
            {optionCount > 0 ? `${t('options', { count: optionCount })} · ` : ''}
            {date}
          </p>
          {topOption?.fitLevel && (
            <p className="mt-1 text-xs font-medium text-[var(--app-brand-dark)]">
              {t('fit', { level: topOption.fitLevel })}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 pl-[52px] sm:pl-0">
        <StatusBadge tone={toneForStatus(rec.status)}>{rec.status}</StatusBadge>
        {rec.status === 'COMPLETED' && (
          <>
            <Link
              className="flex items-center gap-1 rounded-lg border border-[var(--app-border)] px-3 py-1.5 text-sm font-semibold text-[var(--app-muted)] transition hover:border-[var(--app-brand)] hover:text-[var(--app-brand-dark)]"
              href={viewHref}
            >
              {t('view')}
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              className="flex items-center gap-1.5 rounded-lg bg-[var(--app-brand)] px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-[var(--app-brand-dark)]"
              href={viewHref}
            >
              <FileText className="h-3.5 w-3.5" />
              {t('generateProposal')}
            </Link>
          </>
        )}
      </div>
    </article>
  );
}

function EmptyState({ filtered }: { filtered: boolean }) {
  const t = useTranslations('solutions');
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--app-border)] bg-[var(--app-panel)] py-20 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--app-brand)] to-[var(--app-brand-dark)] text-white shadow-sm shadow-[var(--app-brand-glow)]">
        <ClipboardList className="h-7 w-7" />
      </span>
      <h3 className="mt-4 text-lg font-semibold text-[var(--app-text)]">
        {filtered ? t('noResults') : t('empty')}
      </h3>
      <p className="mt-1 max-w-xs text-sm text-[var(--app-muted)]">
        {filtered ? t('noResultsDesc') : t('emptyDesc')}
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

export function SolutionsClient() {
  const t = useTranslations('solutions');
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['recommendations'],
    queryFn: () => recommendationApi.getAll(0, 200).then((r) => r.data.data),
  });

  const all = data?.content ?? [];
  const query = searchQuery.trim().toLowerCase();
  const filtered = query
    ? all.filter((rec) => {
        const name = (rec.name ?? '').toLowerCase();
        const topOption = rec.options?.[0];
        const brand = (topOption?.robot.brand ?? '').toLowerCase();
        const model = (topOption?.robot.model ?? '').toLowerCase();
        return name.includes(query) || brand.includes(query) || model.includes(query);
      })
    : all;

  function handleSearch(q: string) {
    setSearchQuery(q);
  }

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
            onSearchChange={handleSearch}
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
                {filtered.map((rec) => (
                  <RecommendationCard key={rec.id} rec={rec} />
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
