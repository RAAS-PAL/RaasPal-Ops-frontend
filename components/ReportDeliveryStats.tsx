'use client';

import { useLocale, useTranslations } from 'next-intl';
import { AlertTriangle, CalendarRange, CheckCircle2, Hourglass } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { monthLabel } from '@/lib/report-month';
import { weekRangeLabel } from '@/lib/report-week';
import { useReportTracking } from '@/lib/use-report-tracking';

/** One dashboard KPI tile. Shared with the report-cadence row so the two rows match. */
export function StatTile({
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
      {hint && <p className="mt-1 line-clamp-2 text-xs text-[var(--app-muted)]">{hint}</p>}
    </div>
  );
}

/**
 * KPI row for report delivery: last month's monthly reports (sent / not sent yet /
 * needs attention, all out of the customers due one) and last week's weekly ones.
 * The counts are customers, not send attempts — a customer emailed twice counts
 * once. The tracking list further down the dashboard names them.
 */
export function ReportDeliveryStats() {
  const t = useTranslations('teamDashboard.reportKpi');
  const locale = useLocale();
  const { month, week, monthly, weekly, isLoading, isError } = useReportTracking();

  const count = (n: number | undefined) => (isError || n === undefined ? null : n);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--app-muted)]">{t('heading')}</h3>
        <p className="text-xs text-[var(--app-muted)]">
          {t('periods', { month: monthLabel(month, locale), week: weekRangeLabel(week) })}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatTile
          icon={CheckCircle2}
          tone="success"
          label={t('monthlySent')}
          value={count(monthly?.sent.length)}
          hint={
            monthly
              ? t('monthlySentHint', {
                  due: monthly.due,
                  company: monthly.sentByCompanyLink,
                  robot: monthly.sentByRobotEmail,
                })
              : undefined
          }
          loading={isLoading}
        />
        <StatTile
          icon={Hourglass}
          tone="brand"
          label={t('monthlyNotSent')}
          value={count(monthly?.notSent.length)}
          hint={
            monthly
              ? monthly.waitingWithoutEmail > 0
                ? t('noContactEmail', { count: monthly.waitingWithoutEmail })
                : t('monthlyNotSentHint', { due: monthly.due })
              : undefined
          }
          loading={isLoading}
        />
        <StatTile
          icon={AlertTriangle}
          tone="danger"
          label={t('failed')}
          value={count(monthly && weekly ? monthly.failed.length + weekly.failed.length : undefined)}
          hint={t('failedHint')}
          loading={isLoading}
        />
        <StatTile
          icon={CalendarRange}
          tone="muted"
          label={t('weeklySent')}
          value={count(weekly?.sent.length)}
          hint={weekly ? t('weeklySentHint', { due: weekly.due, notSent: weekly.notSent.length }) : undefined}
          loading={isLoading}
        />
      </div>
    </div>
  );
}
