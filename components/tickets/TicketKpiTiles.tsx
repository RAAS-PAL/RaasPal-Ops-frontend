'use client';

import { useTranslations } from 'next-intl';
import {
  AlertOctagon,
  Bot,
  CalendarDays,
  Repeat2,
  Timer,
  TrendingDown,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { BrandTicketSummary } from '@/lib/tickets/types';

/**
 * The six headline numbers. Each is a stat tile — the number is the chart — with
 * the rule behind it in the tooltip, so "SLA 71%" is never a mystery figure.
 */
export function TicketKpiTiles({
  summary,
  loading,
}: {
  summary: BrandTicketSummary | undefined;
  loading: boolean;
}) {
  const t = useTranslations('tickets.kpi');
  const k = summary?.kpis;
  const d = summary?.definitions;

  const pct = (v: number | null | undefined) => (v == null ? null : `${v}%`);
  const days = (v: number | null | undefined) => (v == null ? null : t('daysValue', { n: v }));

  const delta = k?.monthDeltaPct;
  const deltaTone: Tone = delta == null ? 'muted' : delta > 0 ? 'danger' : delta < 0 ? 'success' : 'muted';

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      <Tile
        icon={AlertOctagon}
        tone={k && k.openNow > 0 ? 'danger' : 'success'}
        label={t('openNow')}
        value={k ? String(k.openNow) : null}
        hint={k?.oldestOpenDays != null ? t('oldestOpen', { n: k.oldestOpenDays }) : t('openNowHint')}
        title={d?.open}
        loading={loading}
      />
      <Tile
        icon={CalendarDays}
        tone="brand"
        label={t('thisMonth')}
        value={k ? String(k.thisMonth) : null}
        hint={k ? t('vsLastMonth', { n: k.lastMonth }) : undefined}
        badge={
          delta == null ? undefined : (
            <span
              className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-semibold ${toneChip[deltaTone]}`}
            >
              {delta > 0 ? <TrendingUp className="h-3 w-3" /> : delta < 0 ? <TrendingDown className="h-3 w-3" /> : null}
              {delta > 0 ? '+' : ''}
              {delta}%
            </span>
          )
        }
        loading={loading}
      />
      <Tile
        icon={Timer}
        tone="brand"
        label={t('timeToAction')}
        value={days(k?.medianDaysToAction)}
        hint={k ? t('sample', { n: k.actionSample }) : undefined}
        title={t('timeToActionDef')}
        loading={loading}
      />
      <Tile
        icon={Timer}
        tone={k?.slaWithin7Pct == null ? 'muted' : k.slaWithin7Pct >= 80 ? 'success' : 'danger'}
        label={t('sla')}
        value={pct(k?.slaWithin7Pct)}
        hint={k ? t('sample', { n: k.actionSample }) : undefined}
        title={d?.slaDays}
        loading={loading}
      />
      <Tile
        icon={Repeat2}
        tone={k?.repeatRatePct == null ? 'muted' : k.repeatRatePct > 15 ? 'danger' : 'success'}
        label={t('repeat')}
        value={pct(k?.repeatRatePct)}
        hint={k ? t('sample', { n: k.repeatSample }) : undefined}
        title={d?.repeatDays}
        loading={loading}
      />
      <Tile
        icon={Bot}
        tone="muted"
        label={t('robots')}
        value={summary ? String(summary.totals.robots) : null}
        hint={summary ? t('robotsHint', { tickets: summary.totals.tickets, sites: summary.totals.sites }) : undefined}
        loading={loading}
      />
    </div>
  );
}

type Tone = 'brand' | 'success' | 'danger' | 'muted';

const toneWell: Record<Tone, string> = {
  brand: 'bg-[var(--app-brand-soft)] text-[var(--app-brand-dark)]',
  success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
  danger: 'bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400',
  muted: 'bg-[var(--app-faint)] text-[var(--app-muted)]',
};

const toneChip: Record<Tone, string> = {
  brand: 'bg-[var(--app-brand-soft)] text-[var(--app-brand-dark)]',
  success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
  danger: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400',
  muted: 'bg-[var(--app-faint)] text-[var(--app-muted)]',
};

function Tile({
  icon: Icon,
  tone,
  label,
  value,
  hint,
  title,
  badge,
  loading,
}: {
  icon: LucideIcon;
  tone: Tone;
  label: string;
  value: string | null;
  hint?: string;
  title?: string;
  badge?: React.ReactNode;
  loading: boolean;
}) {
  return (
    <div
      className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-panel)] p-4"
      title={title}
    >
      <div className="flex items-center gap-2">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${toneWell[tone]}`}>
          <Icon className="h-4 w-4" />
        </span>
        <p className="truncate text-xs font-semibold uppercase tracking-wide text-[var(--app-muted)]">{label}</p>
      </div>
      {loading ? (
        <Skeleton className="mt-3 h-8 w-16" />
      ) : (
        <div className="mt-2 flex items-baseline gap-2">
          <p className="text-3xl font-bold tabular-nums text-[var(--app-text)]">{value ?? '—'}</p>
          {badge}
        </div>
      )}
      {hint && <p className="mt-1 truncate text-xs text-[var(--app-muted)]">{hint}</p>}
    </div>
  );
}
