'use client';

/**
 * CmTicketPicker — the monday tickets a corrective maintenance report can start
 * from: the All Case group of the Cleaning and Delivery boards, as the daily sync
 * last saw them. Click a row and the report form fills itself from the ticket's
 * columns and comment thread.
 *
 * Fetched once and filtered here: a hundred-odd rows, and a search box that
 * answers on every keystroke beats one that waits for the server.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, Loader2, MessageSquare, RefreshCw, Search } from 'lucide-react';
import { cmReportApi } from '@/lib/api';
import type { CmTicketBoard, CmTicketSummary } from '@/types/api';

type BoardFilter = 'all' | CmTicketBoard;

const BOARD_BADGE: Record<CmTicketBoard, { label: string; className: string }> = {
  CLEANING: { label: 'Cleaning', className: 'bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:ring-sky-900' },
  DELIVERY: { label: 'Delivery', className: 'bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:ring-violet-900' },
};

function BoardBadge({ board }: { board: CmTicketBoard }) {
  const b = BOARD_BADGE[board] ?? BOARD_BADGE.CLEANING;
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${b.className}`}>{b.label}</span>;
}

function matches(t: CmTicketSummary, needle: string): boolean {
  return [t.caseId, t.itemName, t.project, t.branch, t.serialNumbers, t.robotModel, t.mainIssue, t.status]
    .some((v) => (v ?? '').toLowerCase().includes(needle));
}

export function CmTicketPicker({
  onPick,
  busyId,
}: {
  onPick: (ticket: CmTicketSummary) => void;
  /** The ticket being drafted right now, so its row shows a spinner and the rest wait. */
  busyId: string | null;
}) {
  const [board, setBoard] = useState<BoardFilter>('all');
  const [search, setSearch] = useState('');

  const query = useQuery({
    queryKey: ['cm-tickets'],
    queryFn: () => cmReportApi.tickets().then((r) => r.data.data ?? []),
    staleTime: 60_000,
  });
  const all = query.data ?? [];
  const counts = {
    all: all.length,
    CLEANING: all.filter((t) => t.board === 'CLEANING').length,
    DELIVERY: all.filter((t) => t.board === 'DELIVERY').length,
  };
  const needle = search.trim().toLowerCase();
  const rows = all.filter((t) => (board === 'all' || t.board === board) && (!needle || matches(t, needle)));

  const chips: { id: BoardFilter; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: counts.all },
    { id: 'CLEANING', label: 'Cleaning', count: counts.CLEANING },
    { id: 'DELIVERY', label: 'Delivery', count: counts.DELIVERY },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1 text-xs font-semibold text-[var(--app-muted)]">
          Board
          <div role="radiogroup" aria-label="Filter tickets by board" className="inline-flex overflow-hidden rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] text-sm font-normal">
            {chips.map((chip) => {
              const active = board === chip.id;
              return (
                <button
                  key={chip.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setBoard(chip.id)}
                  className={`h-9 px-3 font-semibold transition ${active ? 'bg-[var(--app-brand)] text-white' : 'text-[var(--app-text)] hover:bg-[var(--app-faint)]'}`}
                >
                  {chip.label}
                  {query.data && <span className={`ml-1.5 tabular-nums ${active ? 'opacity-80' : 'opacity-60'}`}>{chip.count}</span>}
                </button>
              );
            })}
          </div>
        </div>

        <label className="flex min-w-[14rem] flex-1 flex-col gap-1 text-xs font-semibold text-[var(--app-muted)]">
          Search
          <span className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--app-muted)]" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Case ID, ticket, customer, branch or serial…"
              className="h-9 w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-panel-alt)] pl-9 pr-3 text-sm font-normal text-[var(--app-text)] outline-none focus:border-[var(--app-brand)]"
            />
          </span>
        </label>

        <button
          type="button"
          onClick={() => query.refetch()}
          disabled={query.isFetching}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--app-border)] px-3 text-sm font-semibold text-[var(--app-text)] transition hover:border-[var(--app-brand)] disabled:opacity-50"
        >
          {query.isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Refresh
        </button>
      </div>

      {query.isError && (
        <p className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          Could not load the tickets — try again.
        </p>
      )}

      <div className="scroll-quiet max-h-[30rem] overflow-auto rounded-xl border border-[var(--app-border)]">
        <table className="w-full min-w-[56rem] text-left text-sm">
          <thead className="sticky top-0 z-10 border-b border-[var(--app-border)] bg-[var(--app-panel)] text-xs uppercase tracking-wide text-[var(--app-muted)]">
            <tr>
              <th className="px-3 py-2.5 font-semibold">Case ID</th>
              <th className="px-3 py-2.5 font-semibold">Ticket</th>
              <th className="px-3 py-2.5 font-semibold">Board</th>
              <th className="px-3 py-2.5 font-semibold">Robot</th>
              <th className="px-3 py-2.5 font-semibold">Status</th>
              <th className="px-3 py-2.5 font-semibold">Opened</th>
              <th className="px-3 py-2.5 text-right font-semibold" title="Comments on the ticket">
                <MessageSquare className="inline h-3.5 w-3.5" />
              </th>
              <th className="px-3 py-2.5 font-semibold">Report</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--app-border)]">
            {rows.map((t) => {
              const busy = busyId === t.caseTicketId;
              return (
                <tr
                  key={t.caseTicketId}
                  onClick={() => !busyId && onPick(t)}
                  aria-busy={busy}
                  className={`align-top transition ${busyId ? (busy ? 'bg-[var(--app-brand-soft)]/40' : 'opacity-50') : 'cursor-pointer hover:bg-[var(--app-faint)]'}`}
                >
                  <td className="px-3 py-2.5 font-mono text-xs font-semibold tabular-nums">
                    <span className="inline-flex items-center gap-1.5">
                      {busy && <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--app-brand-dark)]" />}
                      {t.caseId}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <p className="font-medium text-[var(--app-text)]">{t.itemName ?? '—'}</p>
                    <p className="text-xs text-[var(--app-muted)]">{[t.project, t.branch, t.province].filter(Boolean).join(' · ') || '—'}</p>
                    {t.mainIssue && <p className="line-clamp-1 text-xs text-[var(--app-muted)]" title={t.mainIssue}>{t.mainIssue}</p>}
                  </td>
                  <td className="px-3 py-2.5"><BoardBadge board={t.board} /></td>
                  <td className="px-3 py-2.5">
                    <p className="text-xs text-[var(--app-text)]">{t.robotModel ?? '—'}</p>
                    <p className="font-mono text-[11px] text-[var(--app-muted)]">{t.serialNumbers ?? ''}</p>
                  </td>
                  <td className="px-3 py-2.5 text-xs">
                    <p>{t.status ?? '—'}</p>
                    {t.supStatus && <p className="text-[var(--app-muted)]">{t.supStatus}</p>}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-xs tabular-nums">{t.openDate ?? '—'}</td>
                  <td className="px-3 py-2.5 text-right text-xs tabular-nums text-[var(--app-muted)]">{t.commentCount}</td>
                  <td className="px-3 py-2.5 text-xs">
                    {t.hasReport ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300">
                        <CheckCircle2 className="h-3.5 w-3.5" /> done
                      </span>
                    ) : (
                      <span className="text-[var(--app-muted)]">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {query.data && rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-10 text-center text-sm text-[var(--app-muted)]">
                  {all.length === 0 ? 'No tickets synced yet — the morning sync fills this list.' : 'No tickets match.'}
                </td>
              </tr>
            )}
            {query.isPending && (
              <tr>
                <td colSpan={8} className="px-3 py-10 text-center text-sm text-[var(--app-muted)]">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {query.data && (
        <p className="text-xs text-[var(--app-muted)]">
          Showing {rows.length} of {all.length} · click a ticket to draft its report. Tickets marked <b>done</b> already have one — picking them starts another.
        </p>
      )}
    </div>
  );
}
