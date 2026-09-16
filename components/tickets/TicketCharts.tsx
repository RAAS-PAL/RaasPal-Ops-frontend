'use client';

import { useLocale, useTranslations } from 'next-intl';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { CountPoint, MonthPoint } from '@/lib/tickets/types';
import { PanelEmpty } from './TicketPanel';

/*
 * Series colours are the two validated chart tokens from globals.css; every
 * label, tick and tooltip wears an --app-* ink token, never the series colour.
 */
const SERIES_DONE = 'var(--viz-series-1)';
const SERIES_OPEN = 'var(--viz-series-2)';
const INK_MUTED = 'var(--app-muted)';
const GRID = 'var(--viz-grid)';

const tick = { fill: INK_MUTED, fontSize: 11 } as const;

function monthLabel(month: string, locale: string): string {
  const [y, m] = month.split('-').map(Number);
  return new Intl.DateTimeFormat(locale, { month: 'short', year: '2-digit' }).format(new Date(Date.UTC(y, m - 1, 1)));
}

function TooltipBox({ title, rows }: { title: string; rows: { label: string; value: number; swatch?: string }[] }) {
  return (
    <div className="rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)] px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-semibold text-[var(--app-text)]">{title}</p>
      {rows.map((r) => (
        <p key={r.label} className="flex items-center gap-2 text-[var(--app-muted)]">
          {r.swatch && <span className="h-2.5 w-2.5 rounded-sm" style={{ background: r.swatch }} />}
          <span className="flex-1">{r.label}</span>
          <span className="tabular-nums font-medium text-[var(--app-text)]">{r.value}</span>
        </p>
      ))}
    </div>
  );
}

/**
 * Tickets opened per month, each bar split into the ones since closed and the
 * ones still open today. Stacked because the question is "how many, and how many
 * are still with us" — the total is the bar, the orange is the debt.
 */
export function MonthlyVolumeChart({ points }: { points: MonthPoint[] }) {
  const t = useTranslations('tickets.charts');
  const locale = useLocale();
  if (points.length === 0) return <PanelEmpty>{t('empty')}</PanelEmpty>;

  const data = points.map((p) => ({ ...p, label: monthLabel(p.month, locale) }));
  const dense = data.length > 14;

  return (
    <div className="w-full">
      <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }} barCategoryGap="28%">
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis
            dataKey="label"
            tick={tick}
            tickLine={false}
            axisLine={{ stroke: GRID }}
            interval={dense ? Math.ceil(data.length / 12) - 1 : 0}
          />
          <YAxis tick={tick} tickLine={false} axisLine={false} allowDecimals={false} width={40} />
          <Tooltip
            cursor={{ fill: 'var(--viz-hover)' }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0].payload as (typeof data)[number];
              return (
                <TooltipBox
                  title={p.label}
                  rows={[
                    { label: t('opened'), value: p.opened },
                    { label: t('done'), value: p.done, swatch: SERIES_DONE },
                    { label: t('stillOpen'), value: p.open, swatch: SERIES_OPEN },
                  ]}
                />
              );
            }}
          />
          {/* 2px surface gap between the stacked segments: the open segment is drawn with a panel-coloured stroke. */}
          <Bar dataKey="done" stackId="m" fill={SERIES_DONE} radius={[0, 0, 0, 0]} isAnimationActive={false} />
          <Bar
            dataKey="open"
            stackId="m"
            fill={SERIES_OPEN}
            stroke="var(--app-panel)"
            strokeWidth={2}
            radius={[4, 4, 0, 0]}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
      </div>
      <Legend
        items={[
          { label: t('done'), swatch: SERIES_DONE },
          { label: t('stillOpen'), swatch: SERIES_OPEN },
        ]}
      />
    </div>
  );
}

/**
 * Root causes, most common first, as horizontal bars. One series, one colour;
 * the length carries the number, the number is printed at the end of each bar.
 */
export function RootCauseChart({ counts }: { counts: CountPoint[] }) {
  const t = useTranslations('tickets.charts');
  if (counts.length === 0) return <PanelEmpty>{t('empty')}</PanelEmpty>;

  const MAX = 8;
  const head = counts.slice(0, MAX);
  const tail = counts.slice(MAX);
  const data = tail.length
    ? [...head, { label: t('other'), count: tail.reduce((s, c) => s + c.count, 0) }]
    : head;
  const height = Math.max(160, data.length * 30 + 16);

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 32, left: 8, bottom: 0 }} barCategoryGap="30%">
          <CartesianGrid horizontal={false} stroke={GRID} />
          <XAxis type="number" hide allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="label"
            tick={{ ...tick, fill: 'var(--app-text)' }}
            tickLine={false}
            axisLine={false}
            width={128}
            tickFormatter={(v: string) => (v.length > 18 ? `${v.slice(0, 17)}…` : v)}
          />
          <Tooltip
            cursor={{ fill: 'var(--viz-hover)' }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0].payload as CountPoint;
              return <TooltipBox title={p.label} rows={[{ label: t('tickets'), value: p.count }]} />;
            }}
          />
          <Bar
            dataKey="count"
            fill={SERIES_DONE}
            radius={[0, 4, 4, 0]}
            isAnimationActive={false}
            label={{ position: 'right', fill: INK_MUTED, fontSize: 11 }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function Legend({ items }: { items: { label: string; swatch: string }[] }) {
  return (
    <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--app-muted)]" aria-label="Legend">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: i.swatch }} />
          {i.label}
        </li>
      ))}
    </ul>
  );
}
