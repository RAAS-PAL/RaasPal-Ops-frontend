'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ChevronDown, ChevronRight, ExternalLink, MessageSquare } from 'lucide-react';
import type { BrandTicket } from '@/lib/tickets/types';
import { PanelEmpty } from './TicketPanel';

/**
 * The tickets behind the numbers. One row each; click to open the comment
 * thread beneath it. Age is coloured as a status (icon + text, never colour
 * alone) so an old open case is visible from across the room.
 */
export function TicketTable({ tickets, loading }: { tickets: BrandTicket[]; loading: boolean }) {
  const t = useTranslations('tickets.table');
  const locale = useLocale();
  const [openId, setOpenId] = useState<string | null>(null);

  if (!loading && tickets.length === 0) return <PanelEmpty>{t('empty')}</PanelEmpty>;

  const day = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' });
  const stamp = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
  const fmtDay = (s: string | null) => (s ? day.format(new Date(s)) : '—');

  return (
    <div className="-mx-4 overflow-x-auto sm:-mx-5">
      <table className="w-full min-w-[960px] text-sm">
        <thead>
          <tr className="border-b border-[var(--app-border)] text-left text-xs font-semibold uppercase tracking-wide text-[var(--app-muted)]">
            <th className="w-8 px-2 py-2" />
            <th className="px-2 py-2">{t('ticket')}</th>
            <th className="px-2 py-2">{t('site')}</th>
            <th className="px-2 py-2">{t('robot')}</th>
            <th className="px-2 py-2">{t('rootCause')}</th>
            <th className="px-2 py-2">{t('status')}</th>
            <th className="px-2 py-2">{t('re')}</th>
            <th className="px-2 py-2">{t('opened')}</th>
            <th className="px-2 py-2 text-right">{t('age')}</th>
            <th className="w-16 px-2 py-2 text-right">
              <span className="sr-only">{t('comments')}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((row) => {
            const expanded = openId === row.id;
            return (
              <TicketRow
                key={row.id}
                row={row}
                expanded={expanded}
                onToggle={() => setOpenId(expanded ? null : row.id)}
                fmtDay={fmtDay}
                stamp={stamp}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TicketRow({
  row,
  expanded,
  onToggle,
  fmtDay,
  stamp,
}: {
  row: BrandTicket;
  expanded: boolean;
  onToggle: () => void;
  fmtDay: (s: string | null) => string;
  stamp: Intl.DateTimeFormat;
}) {
  const t = useTranslations('tickets.table');
  const site = [row.project, row.branch].filter(Boolean).join(' · ');
  const robot = [row.model, row.serial].filter(Boolean).join(' · ');

  return (
    <>
      <tr
        className={`cursor-pointer border-b border-[var(--app-border)] align-top transition hover:bg-[var(--app-panel-alt)] ${
          expanded ? 'bg-[var(--app-panel-alt)]' : ''
        }`}
        onClick={onToggle}
      >
        <td className="px-2 py-2.5 text-[var(--app-muted)]">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </td>
        <td className="max-w-[320px] px-2 py-2.5">
          <p className="truncate font-medium text-[var(--app-text)]" title={row.name ?? ''}>
            {row.name ?? row.itemId}
          </p>
          <p className="truncate text-xs text-[var(--app-muted)]">
            #{row.itemId}
            {row.mainIssue && <> · {row.mainIssue}</>}
          </p>
        </td>
        <td className="max-w-[180px] truncate px-2 py-2.5 text-[var(--app-text)]" title={site}>
          {site || '—'}
        </td>
        <td className="max-w-[180px] truncate px-2 py-2.5 text-[var(--app-text)]" title={robot}>
          {robot || '—'}
        </td>
        <td className="px-2 py-2.5 text-[var(--app-text)]">{row.rootCause ?? '—'}</td>
        <td className="px-2 py-2.5">
          <StatusPill open={row.open} status={row.status} />
          {row.supStatus && <p className="mt-0.5 truncate text-xs text-[var(--app-muted)]">{row.supStatus}</p>}
        </td>
        <td className="px-2 py-2.5 text-[var(--app-text)]">{row.reOwner ?? '—'}</td>
        <td className="whitespace-nowrap px-2 py-2.5 text-[var(--app-text)]">{fmtDay(row.openDate)}</td>
        <td className="whitespace-nowrap px-2 py-2.5 text-right">
          <AgeCell open={row.open} age={row.ageDays} daysToAction={row.daysToAction} />
        </td>
        <td className="whitespace-nowrap px-2 py-2.5 text-right text-xs text-[var(--app-muted)]">
          <span className="inline-flex items-center gap-1">
            <MessageSquare className="h-3.5 w-3.5" />
            {row.comments.length}
          </span>
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-[var(--app-border)] bg-[var(--app-panel-soft)]">
          <td />
          <td colSpan={9} className="px-2 py-3">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                <Fact label={t('group')} value={row.group} />
                <Fact label={t('caseType')} value={row.caseType} />
                <Fact label={t('level')} value={row.level} />
                <Fact label={t('channel')} value={row.channel} />
                <Fact label={t('province')} value={row.province} />
                <Fact label={t('warranty')} value={row.underWarranty} />
                <Fact label={t('reAction')} value={fmtDay(row.reActionDate)} />
                <Fact label={t('solution')} value={row.solution} />
                {row.mondayUrl && (
                  <>
                    <dt className="text-[var(--app-muted)]">monday</dt>
                    <dd>
                      <a
                        href={row.mondayUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-[var(--app-brand-dark)] hover:underline"
                      >
                        {t('openInMonday')} <ExternalLink className="h-3 w-3" />
                      </a>
                    </dd>
                  </>
                )}
              </dl>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--app-muted)]">
                  {t('thread', { n: row.comments.length })}
                </p>
                {row.comments.length === 0 ? (
                  <p className="text-xs text-[var(--app-muted)]">{t('noComments')}</p>
                ) : (
                  <ol className="max-h-72 space-y-2 overflow-y-auto pr-1">
                    {row.comments.map((c) => (
                      <li
                        key={c.id}
                        className={`rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)] px-3 py-2 text-xs ${
                          c.parentId ? 'ml-5' : ''
                        }`}
                      >
                        <p className="mb-1 flex items-center gap-2 text-[var(--app-muted)]">
                          <span className="font-semibold text-[var(--app-text)]">{c.author ?? 'unknown'}</span>
                          {c.parentId && <span>↳ {t('reply')}</span>}
                          <span className="ml-auto whitespace-nowrap">{c.postedAt ? stamp.format(new Date(c.postedAt)) : ''}</span>
                        </p>
                        <p className="whitespace-pre-wrap text-[var(--app-text)]">{c.body?.trim() || '—'}</p>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function Fact({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <>
      <dt className="text-[var(--app-muted)]">{label}</dt>
      <dd className="min-w-0 break-words text-[var(--app-text)]">{value}</dd>
    </>
  );
}

function StatusPill({ open, status }: { open: boolean; status: string | null }) {
  const cls = open
    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400';
  return (
    <span className={`inline-flex max-w-[160px] items-center gap-1 truncate rounded-md px-1.5 py-0.5 text-xs font-medium ${cls}`}>
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${open ? 'bg-amber-500' : 'bg-emerald-500'}`} />
      <span className="truncate">{status ?? (open ? 'Open' : 'Done')}</span>
    </span>
  );
}

/** Open: days since opened, coloured by how long. Done: how long the RE action took. */
function AgeCell({ open, age, daysToAction }: { open: boolean; age: number | null; daysToAction: number | null }) {
  const t = useTranslations('tickets.table');
  if (open) {
    if (age == null) return <span className="text-[var(--app-muted)]">—</span>;
    const cls = age > 30 ? 'text-red-600 dark:text-red-400' : age > 14 ? 'text-amber-700 dark:text-amber-300' : 'text-[var(--app-text)]';
    return (
      <span className={`font-semibold tabular-nums ${cls}`} title={t('ageOpen')}>
        {age > 30 ? '⚠ ' : ''}
        {t('daysShort', { n: age })}
      </span>
    );
  }
  return (
    <span className="tabular-nums text-[var(--app-muted)]" title={t('ageDone')}>
      {daysToAction == null ? '—' : t('daysShort', { n: daysToAction })}
    </span>
  );
}
