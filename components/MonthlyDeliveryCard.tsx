'use client';

import { useQuery } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowRight, CalendarClock, CheckCircle2, Loader2 } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { reportApi } from '@/lib/api';
import { monthLabel } from '@/lib/report-month';
import { useReportTracking } from '@/lib/use-report-tracking';

/**
 * The dashboard centerpiece — status of the automated monthly bundle delivery
 * for the current report month: whether a run is in progress, the last finished
 * summary, and how far coverage has reached. Links into the Reports hub to act.
 */
export function MonthlyDeliveryCard() {
  const t = useTranslations('teamDashboard.delivery');
  const locale = useLocale();
  const { month, monthly } = useReportTracking();

  const status = useQuery({
    queryKey: ['report-delivery-status'],
    queryFn: () => reportApi.deliveryStatus().then((r) => r.data.data),
    refetchInterval: (query) => (query.state.data?.running ? 3000 : 60_000),
  });
  const running = status.data?.running ?? false;
  // Coverage is customers sent out of customers DUE a monthly report — not out of
  // every customer record, which includes delivery-only and robot-less customers who
  // never get one. A customer counts as sent when their company link went out, or a
  // single-robot email went out for every robot they are due for (see report-tracking).
  const sentCount = monthly?.sent.length ?? 0;
  const dueCount = monthly?.due ?? 0;
  const coverage = dueCount > 0 ? Math.round((sentCount / dueCount) * 100) : 0;

  return (
    <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--app-brand-soft)] text-[var(--app-brand-dark)]">
            <CalendarClock className="h-4.5 w-4.5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-[var(--app-text)]">{t('heading')}</p>
            <p className="text-xs text-[var(--app-muted)]">{t('reportPeriod', { month: monthLabel(month, locale) })}</p>
          </div>
        </div>

        {running ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-700 dark:bg-sky-950/40 dark:text-sky-300">
            <Loader2 className="h-3 w-3 animate-spin" />
            {t('running')}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
            <CheckCircle2 className="h-3 w-3" />
            {t('idle')}
          </span>
        )}
      </div>

      {/* Coverage bar — customers sent vs. customers due a monthly report */}
      <div className="mt-5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-[var(--app-text)]">{t('coverage')}</span>
          <span className="tabular-nums text-[var(--app-muted)]">
            {t('coverageCount', { sent: sentCount, total: dueCount })}
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--app-faint)]">
          <div
            className="h-full rounded-full bg-[var(--app-brand)] transition-[width] duration-500"
            style={{ width: `${coverage}%` }}
          />
        </div>
      </div>

      {/* Last run summary */}
      {status.data?.lastSummary && (
        <div className="mt-5 grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-[var(--app-faint)] px-3 py-2 text-center">
            <p className="text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
              {status.data.lastSummary.sent}
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--app-muted)]">{t('sent')}</p>
          </div>
          <div className="rounded-lg bg-[var(--app-faint)] px-3 py-2 text-center">
            <p className="text-lg font-bold tabular-nums text-[var(--app-muted)]">
              {status.data.lastSummary.skipped}
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--app-muted)]">{t('skipped')}</p>
          </div>
          <div className="rounded-lg bg-[var(--app-faint)] px-3 py-2 text-center">
            <p className="text-lg font-bold tabular-nums text-red-600 dark:text-red-400">
              {status.data.lastSummary.failed}
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--app-muted)]">{t('failed')}</p>
          </div>
        </div>
      )}

      <Link
        href="/reports"
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--app-brand)] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[var(--app-brand-dark)]"
      >
        {t('manage')}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
