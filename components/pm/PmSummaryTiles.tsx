'use client';

import { useTranslations } from 'next-intl';
import { AlertTriangle, CalendarOff } from 'lucide-react';
import type { PmSummary } from '@/lib/pm/types';

/**
 * The tile row (spec section 7).
 *
 * Two tiles are deliberately given their own treatment rather than sitting in the
 * neutral run: overdue, and the undated backlog. Both are the numbers a planner
 * is supposed to act on, and both are invisible in the grid — an overdue visit
 * looks like any other cell, and an undated one has no cell at all.
 */
export function PmSummaryTiles({ summary }: { summary: PmSummary }) {
  const t = useTranslations('pmPlanning.tiles');

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      <Tile label={t('visits')} value={summary.totalVisits} />
      <Tile label={t('customers')} value={summary.customers} />
      <Tile label={t('robots')} value={summary.robots} />
      <Tile label={t('planned')} value={summary.planned} />
      <Tile label={t('completed')} value={summary.completed} />
      <Tile
        label={t('overdue')}
        value={summary.overdue}
        tone={summary.overdue > 0 ? 'danger' : undefined}
        icon={summary.overdue > 0 ? <AlertTriangle className="h-3.5 w-3.5" /> : undefined}
      />

      {summary.undatedBacklog > 0 && (
        <div className="col-span-2 rounded-xl border border-amber-300 bg-amber-50 p-3 dark:border-amber-900/60 dark:bg-amber-950/30 sm:col-span-3 xl:col-span-6">
          <p className="flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-300">
            <CalendarOff className="h-4 w-4 shrink-0" />
            {t('undatedTitle', { count: summary.undatedBacklog })}
          </p>
          <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-400/90">{t('undatedHelp')}</p>
        </div>
      )}
    </div>
  );
}

function Tile({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: number;
  tone?: 'danger';
  icon?: React.ReactNode;
}) {
  const danger = tone === 'danger';
  return (
    <div
      className={`rounded-xl border p-3 ${
        danger
          ? 'border-red-300 bg-red-50 dark:border-red-900/60 dark:bg-red-950/30'
          : 'border-[var(--app-border)] bg-[var(--app-panel)]'
      }`}
    >
      <p
        className={`flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide ${
          danger ? 'text-red-700 dark:text-red-400' : 'text-[var(--app-muted)]'
        }`}
      >
        {icon}
        {label}
      </p>
      <p
        className={`mt-1 text-2xl font-bold tabular-nums ${
          danger ? 'text-red-700 dark:text-red-400' : ''
        }`}
      >
        {value.toLocaleString()}
      </p>
    </div>
  );
}
