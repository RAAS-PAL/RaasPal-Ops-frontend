'use client';

import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { AlertTriangle, ChevronRight, ListChecks, MailX, Search } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from '@/i18n/navigation';
import { monthLabel } from '@/lib/report-month';
import { weekRangeLabel } from '@/lib/report-week';
import type { CustomerTracking, PeriodTracking } from '@/lib/report-tracking';
import { useReportTracking } from '@/lib/use-report-tracking';

type Tab = 'notSent' | 'failed' | 'sent' | 'weekly';

const PAGE_SIZE = 10;

/**
 * Delivery tracking, customer by customer: who is still waiting for last month's
 * report, whose send failed, who has been sent (and how), and last week's weekly
 * customers. Each row opens that customer's company report, where it is reviewed
 * and sent. Same numbers as the KPI row above — both come from useReportTracking.
 */
export function ReportTrackingList() {
  const t = useTranslations('teamDashboard.tracking');
  const locale = useLocale();
  const { month, week, monthly, weekly, isLoading, isError } = useReportTracking();
  const [tab, setTab] = useState<Tab>('notSent');
  const [query, setQuery] = useState('');
  const [visible, setVisible] = useState(PAGE_SIZE);

  const rows: CustomerTracking[] = useMemo(() => {
    if (tab === 'weekly') return weekly ? [...weekly.failed, ...weekly.notSent, ...weekly.sent] : [];
    if (!monthly) return [];
    return tab === 'notSent' ? monthly.notSent : tab === 'failed' ? monthly.failed : monthly.sent;
  }, [tab, monthly, weekly]);

  const q = query.trim().toLowerCase();
  const filtered = q ? rows.filter((r) => r.customerName.toLowerCase().includes(q)) : rows;
  const shown = filtered.slice(0, visible);

  const tabs: { key: Tab; label: string; count: number | null }[] = [
    { key: 'notSent', label: t('tabNotSent'), count: monthly?.notSent.length ?? null },
    { key: 'failed', label: t('tabFailed'), count: monthly?.failed.length ?? null },
    { key: 'sent', label: t('tabSent'), count: monthly?.sent.length ?? null },
    { key: 'weekly', label: t('tabWeekly'), count: weekly ? weekly.sent.length : null },
  ];

  const period: PeriodTracking | null = tab === 'weekly' ? weekly : monthly;
  const scope =
    tab === 'weekly'
      ? weekly && t('weeklyScope', { week: weekRangeLabel(week), due: weekly.due })
      : monthly && t('monthlyScope', { month: monthLabel(month, locale), due: monthly.due });

  const empty = { notSent: t('emptyNotSent'), failed: t('emptyFailed'), sent: t('emptySent'), weekly: t('emptyWeekly') }[tab];

  const selectTab = (next: Tab) => {
    setTab(next);
    setVisible(PAGE_SIZE);
  };

  return (
    <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-panel)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--app-brand-soft)] text-[var(--app-brand-dark)]">
            <ListChecks className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-[var(--app-text)]">{t('heading')}</p>
            {scope && <p className="text-xs text-[var(--app-muted)]">{scope}</p>}
          </div>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--app-muted)]" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setVisible(PAGE_SIZE);
            }}
            placeholder={t('search')}
            className="h-9 w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-panel-alt)] pl-8 pr-3 text-sm text-[var(--app-text)] outline-none focus:border-[var(--app-brand)]"
          />
        </div>
      </div>

      <div role="tablist" className="mt-3 flex flex-wrap gap-1 border-b border-[var(--app-border)]">
        {tabs.map(({ key, label, count }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => selectTab(key)}
            className={`-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-semibold transition ${
              tab === key
                ? 'border-[var(--app-brand)] text-[var(--app-brand-dark)]'
                : 'border-transparent text-[var(--app-muted)] hover:text-[var(--app-text)]'
            }`}
          >
            {label}
            {count != null && (
              <span className="rounded-full bg-[var(--app-faint)] px-1.5 text-xs tabular-nums text-[var(--app-muted)]">
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="mt-3 space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-11 w-full" />
          ))}
        </div>
      )}

      {isError && !isLoading && (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
          <AlertTriangle className="mr-1.5 inline h-4 w-4" />
          {t('failedToLoad')}
        </p>
      )}

      {!isLoading && !isError && period && (
        <>
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--app-muted)]">{q ? t('noMatch') : empty}</p>
          ) : (
            <ul className="mt-2 divide-y divide-[var(--app-border)]">
              {shown.map((row) => (
                <TrackingRow key={row.customerProfileId} row={row} weekly={tab === 'weekly'} locale={locale} />
              ))}
            </ul>
          )}

          {filtered.length > visible && (
            <button
              type="button"
              onClick={() => setVisible((n) => n + PAGE_SIZE)}
              className="mt-2 w-full rounded-lg border border-[var(--app-border)] py-2 text-sm font-semibold text-[var(--app-text)] transition hover:border-[var(--app-brand)]"
            >
              {t('showMore', { count: Math.min(PAGE_SIZE, filtered.length - visible) })}
            </button>
          )}

          {tab === 'sent' && monthly && monthly.sentOutsideDue > 0 && (
            <p className="mt-2 text-xs text-[var(--app-muted)]">{t('outsideDue', { count: monthly.sentOutsideDue })}</p>
          )}
        </>
      )}
    </div>
  );
}

function TrackingRow({ row, weekly, locale }: { row: CustomerTracking; weekly: boolean; locale: string }) {
  const t = useTranslations('teamDashboard.tracking');
  // Monthly rows open the customer's company report, ready to review and send;
  // weekly ones go to Manage automation, where the Weekly toggle sends a week.
  const href = weekly ? '/reports?tab=automation' : `/reports?tab=company&customer=${row.customerProfileId}`;

  const badge =
    row.state === 'sent' ? (
      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
        {row.via === 'company' ? t('viaCompany') : t('viaRobot')}
        {row.sentAt &&
          ` · ${t('sentAt', {
            date: new Date(row.sentAt).toLocaleDateString(locale, { day: '2-digit', month: 'short' }),
          })}`}
      </span>
    ) : row.state === 'failed' ? (
      <span
        title={row.error ?? undefined}
        className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600 dark:bg-red-950/40 dark:text-red-400"
      >
        {t('tabFailed')}
      </span>
    ) : null;

  return (
    <li>
      <Link
        href={href}
        className="group flex items-center gap-3 rounded-lg px-2 py-2.5 transition hover:bg-[var(--app-panel-alt)]"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[var(--app-text)]">{row.customerName}</p>
          <p className="flex flex-wrap items-center gap-x-2 text-xs text-[var(--app-muted)]">
            {t('robots', { count: row.robotCount })}
            {row.noContactEmail && (
              <span className="inline-flex items-center gap-1 font-semibold text-amber-700 dark:text-amber-300">
                <MailX className="h-3.5 w-3.5" />
                {t('noContactEmail')}
              </span>
            )}
          </p>
        </div>
        {badge}
        <span className="hidden text-xs font-semibold text-[var(--app-brand-dark)] sm:inline">{t('open')}</span>
        <ChevronRight className="h-4 w-4 shrink-0 text-[var(--app-muted)] transition group-hover:translate-x-0.5 group-hover:text-[var(--app-brand)]" />
      </Link>
    </li>
  );
}
