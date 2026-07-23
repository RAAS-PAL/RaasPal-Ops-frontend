'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { AlertTriangle, CheckCircle2, SkipForward, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { customerApi, reportApi } from '@/lib/api';
import { previousMonth } from '@/lib/report-month';

const REFRESH_MS = 60_000;

function StatTile({
  icon: Icon,
  label,
  value,
  hint,
  tone,
  loading,
}: {
  icon: LucideIcon;
  label: string;
  value: number | null;
  hint?: string;
  tone: 'brand' | 'success' | 'danger' | 'muted';
  loading: boolean;
}) {
  const toneClass = {
    brand: 'bg-[var(--app-brand-soft)] text-[var(--app-brand-dark)]',
    success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
    danger: 'bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400',
    muted: 'bg-[var(--app-faint)] text-[var(--app-muted)]',
  }[tone];

  return (
    <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-panel)] p-4">
      <div className="flex items-center gap-2">
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${toneClass}`}>
          <Icon className="h-4 w-4" />
        </span>
        <p className="truncate text-xs font-semibold uppercase tracking-wide text-[var(--app-muted)]">{label}</p>
      </div>
      {loading ? (
        <Skeleton className="mt-3 h-8 w-16" />
      ) : (
        <p className="mt-2 text-3xl font-bold tabular-nums text-[var(--app-text)]">{value ?? '—'}</p>
      )}
      {hint && <p className="mt-1 truncate text-xs text-[var(--app-muted)]">{hint}</p>}
    </div>
  );
}

/**
 * KPI row for the report-automation dashboard — this report month's delivery
 * outcome (sent / needs attention / skipped) plus the total customer recipients.
 */
export function ReportDeliveryStats() {
  const t = useTranslations('teamDashboard.reportKpi');
  const month = previousMonth();

  const history = useQuery({
    queryKey: ['report-delivery-history', month],
    queryFn: () => reportApi.deliveryHistory(month).then((r) => r.data.data ?? []),
    refetchInterval: REFRESH_MS,
  });
  const customers = useQuery({
    queryKey: ['customers'],
    queryFn: () => customerApi.list().then((r) => r.data.data ?? []),
    refetchInterval: REFRESH_MS,
  });

  const rows = history.data ?? [];
  const sent = rows.filter((r) => r.status === 'SENT').length;
  const failed = rows.filter((r) => r.status === 'FAILED').length;
  const skipped = rows.filter((r) => r.status === 'SKIPPED').length;

  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      <StatTile
        icon={CheckCircle2}
        tone="success"
        label={t('sent')}
        value={history.isError ? null : history.isLoading ? null : sent}
        hint={t('sentHint')}
        loading={history.isLoading}
      />
      <StatTile
        icon={AlertTriangle}
        tone="danger"
        label={t('failed')}
        value={history.isError ? null : history.isLoading ? null : failed}
        hint={t('failedHint')}
        loading={history.isLoading}
      />
      <StatTile
        icon={SkipForward}
        tone="muted"
        label={t('skipped')}
        value={history.isError ? null : history.isLoading ? null : skipped}
        hint={t('skippedHint')}
        loading={history.isLoading}
      />
      <StatTile
        icon={Users}
        tone="brand"
        label={t('customers')}
        value={customers.isError ? null : customers.data?.length ?? null}
        hint={t('customersHint')}
        loading={customers.isLoading}
      />
    </div>
  );
}
