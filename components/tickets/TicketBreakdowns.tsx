'use client';

import { useLocale, useTranslations } from 'next-intl';
import type { CountPoint, RobotCount, SiteCount } from '@/lib/tickets/types';
import { PanelEmpty } from './TicketPanel';

/**
 * A ranked list with an inline bar behind each value. Used where the reader
 * wants the names as much as the numbers — sites, robots, age buckets — so a
 * chart's axis would just be a worse table.
 */
function BarList({
  rows,
  max,
  tone = 'brand',
}: {
  rows: { key: string; label: string; sub?: string; value: number; tail?: string; tone?: 'brand' | 'warn' | 'bad' }[];
  max: number;
  tone?: 'brand' | 'warn' | 'bad';
}) {
  const fill = {
    brand: 'var(--viz-series-1)',
    warn: '#fab219',
    bad: '#d03b3b',
  };
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.key} className="group">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-[var(--app-text)]" title={r.label}>
              {r.label}
              {r.sub && <span className="ml-1.5 text-xs text-[var(--app-muted)]">{r.sub}</span>}
            </span>
            <span className="shrink-0 tabular-nums font-semibold text-[var(--app-text)]">
              {r.value}
              {r.tail && <span className="ml-1 text-xs font-normal text-[var(--app-muted)]">{r.tail}</span>}
            </span>
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[var(--app-faint)]">
            <div
              className="h-full rounded-full transition-[width]"
              style={{ width: `${max === 0 ? 0 : Math.max(2, (r.value / max) * 100)}%`, background: fill[r.tone ?? tone] }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * Open tickets by days since Open Date. Ordinal buckets, so the colour steps from
 * brand to warning to critical as the bucket ages — a status, not an identity.
 */
export function AgingList({ buckets }: { buckets: CountPoint[] }) {
  const t = useTranslations('tickets.breakdowns');
  const total = buckets.reduce((s, b) => s + b.count, 0);
  if (total === 0) return <PanelEmpty>{t('noOpen')}</PanelEmpty>;
  const tones: ('brand' | 'warn' | 'bad')[] = ['brand', 'brand', 'warn', 'bad'];
  return (
    <BarList
      max={Math.max(...buckets.map((b) => b.count))}
      rows={buckets.map((b, i) => ({
        key: b.label,
        label: t('days', { range: b.label }),
        value: b.count,
        tone: tones[i] ?? 'bad',
      }))}
    />
  );
}

export function TopSitesList({ sites }: { sites: SiteCount[] }) {
  const t = useTranslations('tickets.breakdowns');
  if (sites.length === 0) return <PanelEmpty>{t('empty')}</PanelEmpty>;
  return (
    <BarList
      max={sites[0].count}
      rows={sites.map((s) => ({
        key: s.label,
        label: s.label,
        value: s.count,
        tail: s.open > 0 ? t('openTail', { n: s.open }) : undefined,
      }))}
    />
  );
}

export function RepeatRobotsList({ robots }: { robots: RobotCount[] }) {
  const t = useTranslations('tickets.breakdowns');
  const locale = useLocale();
  if (robots.length === 0) return <PanelEmpty>{t('noRepeats')}</PanelEmpty>;
  const fmt = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: '2-digit' });
  return (
    <BarList
      max={robots[0].count}
      rows={robots.map((r) => ({
        key: r.serial,
        label: r.serial,
        sub: [r.model, r.site].filter(Boolean).join(' · '),
        value: r.count,
        tail: r.lastOpenDate ? fmt.format(new Date(r.lastOpenDate)) : undefined,
      }))}
    />
  );
}
