'use client';

import { useQuery } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { ChevronRight, Mail } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { EmptyState } from '@/components/ui/empty-state';
import { ListSkeleton } from '@/components/ui/skeleton';
import { StatusBadge, toneForStatus } from '@/components/ui/status-badge';
import { reportApi } from '@/lib/api';
import { monthLabel, previousMonth } from '@/lib/report-month';

const PREVIEW_COUNT = 6;

/**
 * Latest report deliveries for the current report month — the operator's live
 * feed of who was sent, skipped, or failed. Links through to the Reports hub.
 */
export function RecentDeliveries() {
  const t = useTranslations('teamDashboard.recentDeliveries');
  const locale = useLocale();
  const month = previousMonth();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['report-delivery-history', month],
    queryFn: () => reportApi.deliveryHistory(month).then((r) => r.data.data ?? []),
    refetchInterval: 60_000,
  });

  const rows = (data ?? []).slice(0, PREVIEW_COUNT);

  return (
    <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--app-brand-soft)] text-[var(--app-brand-dark)]">
            <Mail className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-[var(--app-text)]">{t('heading')}</p>
            <p className="text-xs text-[var(--app-muted)]">{monthLabel(month, locale)}</p>
          </div>
        </div>
        <Link
          className="flex items-center gap-1 text-xs font-semibold text-[var(--app-muted)] transition hover:text-[var(--app-brand-dark)]"
          href="/reports"
        >
          {t('viewAll')}
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {isLoading && <ListSkeleton rows={3} className="mt-3" />}

      {isError && <p className="mt-3 text-xs text-[var(--app-muted)]">{t('failedToLoad')}</p>}

      {!isLoading && !isError && rows.length === 0 && (
        <EmptyState
          className="mt-3 py-8"
          icon={Mail}
          title={t('empty')}
          description={t('emptyHint')}
          action={
            <Link
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--app-brand)] px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-[var(--app-brand-dark)]"
              href="/reports"
            >
              {t('cta')}
            </Link>
          }
        />
      )}

      {!isLoading && !isError && rows.length > 0 && (
        <ul className="mt-3 divide-y divide-[var(--app-border)]">
          {rows.map((row) => {
            const when = new Date(row.sentAt);
            const time = Number.isNaN(when.getTime())
              ? ''
              : when.toLocaleDateString(locale, { day: '2-digit', month: 'short' });

            return (
              <li key={row.id} className="flex items-center gap-3 py-2.5 text-sm">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-[var(--app-text)]">{row.customerName}</span>
                  <span className="block truncate text-xs text-[var(--app-muted)]">
                    {row.recipientEmail ?? time}
                  </span>
                </span>
                <StatusBadge tone={toneForStatus(row.status)}>{row.status}</StatusBadge>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
