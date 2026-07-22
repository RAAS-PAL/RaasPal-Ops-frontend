'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Bot, ChevronRight, Sparkles } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { EmptyState } from '@/components/ui/empty-state';
import { ListSkeleton } from '@/components/ui/skeleton';
import { StatusBadge, toneForStatus } from '@/components/ui/status-badge';
import { recommendationApi } from '@/lib/api';
import type { RecommendationResponse } from '@/types/api';

const PREVIEW_COUNT = 5;

function solutionLabel(rec: RecommendationResponse, fallback: string) {
  const topOption = rec.options?.[0];
  return (
    rec.name ??
    (topOption ? `${topOption.robot.brand} ${topOption.robot.model}` : fallback)
  );
}

/**
 * Latest generated solutions for the Team Dashboard — the operator's
 * "what happened recently" feed, linking straight into each recommendation.
 */
export function RecentSolutions() {
  const t = useTranslations('teamDashboard.recent');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard', 'recent-solutions'],
    queryFn: () => recommendationApi.getAll(0, PREVIEW_COUNT).then((r) => r.data.data),
  });

  const recs = data?.content ?? [];

  return (
    <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--app-brand-soft)] text-[var(--app-brand-dark)]">
            <Sparkles className="h-4 w-4" />
          </span>
          <p className="text-sm font-semibold text-[var(--app-text)]">{t('heading')}</p>
        </div>
        <Link
          className="flex items-center gap-1 text-xs font-semibold text-[var(--app-muted)] transition hover:text-[var(--app-brand-dark)]"
          href="/solutions"
        >
          {t('viewAll')}
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {isLoading && <ListSkeleton rows={3} className="mt-3" />}

      {isError && <p className="mt-3 text-xs text-[var(--app-muted)]">{t('failedToLoad')}</p>}

      {!isLoading && !isError && recs.length === 0 && (
        <EmptyState
          className="mt-3 py-8"
          icon={Bot}
          title={t('empty')}
          description={t('emptyHint')}
          action={
            <Link
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--app-brand)] px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-[var(--app-brand-dark)]"
              href="/generate-solution"
            >
              {t('cta')}
            </Link>
          }
        />
      )}

      {!isLoading && !isError && recs.length > 0 && (
        <ul className="mt-3 divide-y divide-[var(--app-border)]">
          {recs.map((rec) => {
            const topOption = rec.options?.[0];
            const solutionType = topOption?.robot.robotType?.toLowerCase() ?? 'cleaning';
            const date = new Date(rec.createdAt).toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
            });

            return (
              <li key={rec.id}>
                <Link
                  className="group flex items-center gap-3 py-2.5 text-sm transition hover:bg-[var(--app-faint)]"
                  href={`/generate-solution/${solutionType}/recommendation?recId=${rec.id}`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-[var(--app-text)] group-hover:text-[var(--app-brand-dark)]">
                      {solutionLabel(rec, t('processing'))}
                    </span>
                    <span className="block text-xs tabular-nums text-[var(--app-muted)]">{date}</span>
                  </span>
                  <StatusBadge tone={toneForStatus(rec.status)}>{rec.status}</StatusBadge>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[var(--app-muted)] transition group-hover:translate-x-0.5 group-hover:text-[var(--app-brand)]" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
