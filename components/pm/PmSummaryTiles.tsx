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
 *
 * <p>Kept deliberately compact. On the year view the page is exactly the height of
 * the viewport and the grid takes what is left, so every pixel this row spends is
 * one fewer row of the plan on screen.
 */
export function PmSummaryTiles({ summary }: { summary: PmSummary }) {
  const t = useTranslations('pmPlanning.tiles');

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
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
        // One line: the count and what to do about it read as a sentence, which is
        // shorter than a heading plus help text saying the same thing twice.
        <p className="col-span-3 flex flex-wrap items-baseline gap-x-2 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-400/90 sm:col-span-6">
          <CalendarOff className="h-3.5 w-3.5 shrink-0 self-center" />
          <span className="font-semibold text-amber-800 dark:text-amber-300">
            {t('undatedTitle', { count: summary.undatedBacklog })}
          </span>
          <span>{t('undatedHelp')}</span>
        </p>
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
    // Label and number on one baseline rather than stacked: same information, about
    // half the height. The number still leads on size so the row scans as figures.
    <div
      className={`flex items-baseline justify-between gap-2 rounded-lg border px-2.5 py-1.5 ${
        danger
          ? 'border-red-300 bg-red-50 dark:border-red-900/60 dark:bg-red-950/30'
          : 'border-[var(--app-border)] bg-[var(--app-panel)]'
      }`}
    >
      <p
        className={`flex min-w-0 items-center gap-1 text-[10px] font-semibold uppercase tracking-wide ${
          danger ? 'text-red-700 dark:text-red-400' : 'text-[var(--app-muted)]'
        }`}
      >
        {icon}
        <span className="truncate">{label}</span>
      </p>
      <p
        className={`shrink-0 text-lg font-bold leading-none tabular-nums ${
          danger ? 'text-red-700 dark:text-red-400' : ''
        }`}
      >
        {value.toLocaleString()}
      </p>
    </div>
  );
}
