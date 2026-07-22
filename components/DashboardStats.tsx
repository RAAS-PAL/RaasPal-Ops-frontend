'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Bot, FileText, Radio, Sparkles } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cvteApi, proposalApi, recommendationApi, robotApi } from '@/lib/api';

const REFRESH_MS = 60_000;

function StatTile({
  icon: Icon,
  label,
  value,
  hint,
  loading,
}: {
  icon: LucideIcon;
  label: string;
  value: number | null;
  hint?: string;
  loading: boolean;
}) {
  return (
    <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-panel)] p-4">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--app-brand-soft)] text-[var(--app-brand-dark)]">
          <Icon className="h-4 w-4" />
        </span>
        <p className="truncate text-xs font-semibold uppercase tracking-wide text-[var(--app-muted)]">{label}</p>
      </div>
      {loading ? (
        <Skeleton className="mt-3 h-8 w-16" />
      ) : (
        <p className="mt-2 text-3xl font-bold tabular-nums text-[var(--app-text)]">
          {value ?? '—'}
        </p>
      )}
      {hint && <p className="mt-1 truncate text-xs text-[var(--app-muted)]">{hint}</p>}
    </div>
  );
}

/**
 * KPI row for the Team Dashboard — live counts of solutions, proposals,
 * catalog robots, and online devices. Each tile degrades to “—” on error.
 */
export function DashboardStats() {
  const t = useTranslations('teamDashboard.kpi');

  const recs = useQuery({
    queryKey: ['dashboard', 'recommendations-count'],
    queryFn: () => recommendationApi.getAll(0, 1).then((r) => r.data.data.totalElements),
    refetchInterval: REFRESH_MS,
  });
  const proposals = useQuery({
    queryKey: ['dashboard', 'proposals-count'],
    queryFn: () => proposalApi.getAll(0, 1).then((r) => r.data.data.totalElements),
    refetchInterval: REFRESH_MS,
  });
  const robots = useQuery({
    queryKey: ['dashboard', 'robots-count'],
    queryFn: () => robotApi.getAll(0, 1).then((r) => r.data.data.totalElements),
    refetchInterval: REFRESH_MS,
  });
  const devices = useQuery({
    queryKey: ['cvte-devices', 'summary'],
    queryFn: () => cvteApi.getAll(0, 100).then((r) => r.data.data),
    refetchInterval: REFRESH_MS,
  });

  const deviceList = devices.data?.content ?? [];
  const onlineCount = deviceList.filter((d) => d.onlineStatus === true).length;
  const offlineCount = deviceList.filter((d) => d.onlineStatus === false).length;

  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      <StatTile
        icon={Sparkles}
        label={t('solutions')}
        value={recs.isError ? null : recs.data ?? null}
        hint={t('solutionsHint')}
        loading={recs.isLoading}
      />
      <StatTile
        icon={FileText}
        label={t('proposals')}
        value={proposals.isError ? null : proposals.data ?? null}
        hint={t('proposalsHint')}
        loading={proposals.isLoading}
      />
      <StatTile
        icon={Bot}
        label={t('robots')}
        value={robots.isError ? null : robots.data ?? null}
        hint={t('robotsHint')}
        loading={robots.isLoading}
      />
      <StatTile
        icon={Radio}
        label={t('devices')}
        value={devices.isError || devices.isLoading ? null : onlineCount}
        hint={t('devicesHint', { offline: offlineCount })}
        loading={devices.isLoading}
      />
    </div>
  );
}
