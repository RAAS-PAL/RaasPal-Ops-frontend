'use client';

import { useTranslations } from 'next-intl';
import { StatusBadge } from '@/components/ui/status-badge';
import { isNearDue, PM_STATUS_LABEL_KEY, PM_STATUS_TONE, rowStatus } from '@/lib/pm/status';
import type { PmMonthResponse } from '@/lib/pm/types';

/**
 * The month list (spec section 7): every visit in the selected range, one row each.
 *
 * Sorted by the backend on plan date then geography, so the reading order is also
 * the order a week would be driven.
 */
export function PmMonthView({ data, locale }: { data: PmMonthResponse; locale: string }) {
  const t = useTranslations('pmPlanning');
  const today = new Date();
  const dateFormat = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', weekday: 'short' });

  if (data.rows.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-[var(--app-border)] p-8 text-center text-sm text-[var(--app-muted)]">
        {t('empty')}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--app-border)]">
      <table className="w-full min-w-[64rem] border-collapse text-sm">
        <thead>
          <tr className="bg-[var(--app-panel-soft)] text-left text-xs uppercase text-[var(--app-muted)]">
            <th scope="col" className="px-3 py-2 font-semibold">{t('table.date')}</th>
            <th scope="col" className="px-3 py-2 font-semibold">{t('table.visit')}</th>
            <th scope="col" className="px-3 py-2 font-semibold">{t('table.site')}</th>
            <th scope="col" className="px-3 py-2 font-semibold">{t('table.geography')}</th>
            <th scope="col" className="px-3 py-2 font-semibold">{t('table.robot')}</th>
            <th scope="col" className="px-3 py-2 font-semibold">{t('table.engineer')}</th>
            <th scope="col" className="px-3 py-2 font-semibold">{t('table.status')}</th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row) => {
            const status = rowStatus(row);
            const nearDue = isNearDue(row, today);
            return (
              <tr
                key={row.visitId}
                className="border-t border-[var(--app-border)] align-top hover:bg-[var(--app-panel-alt)]"
              >
                <td className="whitespace-nowrap px-3 py-2">
                  {row.planDate ? (
                    <>
                      <span className="font-semibold">
                        {dateFormat.format(new Date(`${row.planDate}T00:00:00`))}
                      </span>
                      {row.timeText && (
                        <span className="block text-xs text-[var(--app-muted)]">{row.timeText}</span>
                      )}
                    </>
                  ) : (
                    <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                      {t('table.noPlanDate')}
                    </span>
                  )}
                </td>

                <td className="px-3 py-2">
                  <span className="block max-w-[18rem] truncate" title={row.visitName ?? undefined}>
                    {row.visitName ?? '—'}
                  </span>
                  <span className="text-xs text-[var(--app-muted)]">{row.serviceLine}</span>
                </td>

                <td className="px-3 py-2">
                  <span className="block max-w-[18rem] truncate font-semibold" title={row.contractName ?? undefined}>
                    {row.contractName ?? row.customerName ?? '—'}
                  </span>
                  {row.project && (
                    <span className="block max-w-[18rem] truncate text-xs text-[var(--app-muted)]">
                      {row.project}
                    </span>
                  )}
                </td>

                <td className="px-3 py-2 text-xs">
                  <span className="block">{row.province ?? '—'}</span>
                  <span className="block text-[var(--app-muted)]">{row.region ?? '—'}</span>
                </td>

                <td className="px-3 py-2 text-xs">
                  <span className="block">{row.robotModel ?? '—'}</span>
                  {row.robotCount != null && (
                    <span className="block text-[var(--app-muted)]">×{row.robotCount}</span>
                  )}
                </td>

                <td className="px-3 py-2 text-xs">{row.ownerNames ?? '—'}</td>

                <td className="whitespace-nowrap px-3 py-2">
                  <StatusBadge tone={PM_STATUS_TONE[status]}>
                    {t(`status.${PM_STATUS_LABEL_KEY[status]}`)}
                  </StatusBadge>
                  {row.daysOverdue != null && (
                    <span className="mt-1 block text-xs font-semibold text-red-600 dark:text-red-400">
                      {t('table.daysLate', { days: row.daysOverdue })}
                    </span>
                  )}
                  {nearDue && (
                    <span className="mt-1 block text-xs font-semibold text-orange-600 dark:text-orange-400">
                      {t('table.dueSoon')}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
