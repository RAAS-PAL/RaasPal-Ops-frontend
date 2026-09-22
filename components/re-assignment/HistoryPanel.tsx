'use client';

import { useQuery } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import { reAssignmentApi } from '@/lib/api';
import { Card, ErrorLine, fmtDateTime } from './shared';

const STATUS_STYLE: Record<string, string> = {
  APPROVED: 'bg-[var(--app-brand-soft)] text-[var(--app-brand-dark)]',
  CONFIRMED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
  CANCELLED: 'bg-[var(--app-faint)] text-[var(--app-muted)]',
  SUPERSEDED: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
};

/** Every approval, newest first: who was assigned, why, by whom, and whether it reached monday and email. */
export function HistoryPanel() {
  const t = useTranslations('reAssignment.history');
  const locale = useLocale();
  const history = useQuery({ queryKey: ['re-history'], queryFn: () => reAssignmentApi.history().then((r) => r.data.data ?? []) });

  return (
    <Card title={t('title')} hint={t('hint')}>
      <ErrorLine error={history.error} fallback={t('loadFailed')} />
      {history.isLoading ? (
        <Loader2 className="mx-auto my-6 h-5 w-5 animate-spin text-[var(--app-muted)]" />
      ) : (history.data ?? []).length === 0 ? (
        <p className="py-6 text-center text-sm text-[var(--app-muted)]">{t('empty')}</p>
      ) : (
        <div className="-mx-4 overflow-x-auto sm:-mx-5">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-[var(--app-border)] text-left text-xs font-semibold uppercase tracking-wide text-[var(--app-muted)]">
                <th className="px-4 py-2 sm:px-5">{t('ticket')}</th>
                <th className="px-2 py-2">{t('engineer')}</th>
                <th className="px-2 py-2">{t('status')}</th>
                <th className="px-2 py-2">{t('origin')}</th>
                <th className="px-2 py-2">{t('reason')}</th>
                <th className="px-2 py-2">{t('email')}</th>
                <th className="px-4 py-2 sm:px-5">{t('approved')}</th>
              </tr>
            </thead>
            <tbody>
              {(history.data ?? []).map((a) => (
                <tr key={a.id} className="border-b border-[var(--app-border)] align-top">
                  <td className="max-w-[260px] px-4 py-2 sm:px-5">
                    <p className="truncate font-medium text-[var(--app-text)]" title={a.ticketName ?? ''}>{a.ticketName ?? a.itemId}</p>
                    <p className="text-xs text-[var(--app-muted)]">#{a.itemId}</p>
                  </td>
                  <td className="px-2 py-2 text-[var(--app-text)]">{a.engineerName}</td>
                  <td className="px-2 py-2">
                    <span className={`rounded-md px-1.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[a.status] ?? ''}`}>{t(`statusKind.${a.status}`)}</span>
                    {a.endedBy && <p className="mt-0.5 text-xs text-[var(--app-muted)]">{a.endedBy}</p>}
                  </td>
                  <td className="px-2 py-2 text-xs text-[var(--app-muted)]">{t(`originKind.${a.origin}`)}</td>
                  <td className="max-w-[280px] px-2 py-2 text-xs text-[var(--app-text)]">{a.reason}</td>
                  <td className="px-2 py-2 text-xs text-[var(--app-muted)]" title={a.emailDetail ?? ''}>{a.emailStatus}</td>
                  <td className="whitespace-nowrap px-4 py-2 text-xs text-[var(--app-muted)] sm:px-5">
                    {fmtDateTime(a.approvedAt, locale)}
                    <br />
                    {a.approvedBy}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
