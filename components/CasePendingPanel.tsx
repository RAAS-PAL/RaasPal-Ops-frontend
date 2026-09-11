'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CalendarDays,
  ExternalLink,
  Loader2,
  Pencil,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { caseReportApi } from '@/lib/api';
import type { CaseReportRow, CaseRowEdit, SlaStatus } from '@/types/api';
import { CaseRowEditDialog } from './CaseRowEditDialog';

/**
 * The Daily Pending Case Report, for checking and correcting before it is sent.
 *
 * <p>The first Generate for a date reads monday and freezes the rows; every later
 * open of that date shows the stored copy. That is what lets the team correct it: a
 * row's pencil opens every printed cell, and what they save is written into the
 * stored report and kept even if the board is re-read. Regenerate re-reads monday
 * for the rows nobody has touched.
 *
 * <p>Delivery is still by hand — nothing here sends anything.
 */

function errorMessage(e: unknown, fallback: string): string {
  const detail =
    typeof e === 'object' && e !== null && 'response' in e
      ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (e as any).response?.data?.message
      : undefined;
  return typeof detail === 'string' && detail.trim() !== '' ? detail : fallback;
}

/** Today in Bangkok, as yyyy-MM-dd — the business day, not the browser's. */
function todayInBangkok(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/**
 * Colour carries the SLA verdict, but never alone — the label sits beside it.
 *
 * <p>"over SLA" is a public statement that RAASPAL is late, so it should be legible to
 * someone printing in monochrome or reading with a colour deficiency, not encoded in a
 * red dot.
 */
const SLA_STYLE: Record<SlaStatus, string> = {
  BREACHED: 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900',
  WITHIN: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900',
  ON_HOLD: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900',
  UNKNOWN: 'bg-[var(--app-bg)] text-[var(--app-muted)] ring-[var(--app-border)]',
};

function SlaCell({ row }: { row: CaseReportRow }) {
  // A blank verdict is a question, not a value: say what is missing so somebody can fix
  // it, rather than showing an empty cell that reads as a rendering bug.
  if (row.sla === 'UNKNOWN') {
    const why = !row.openDate ? 'no open date' : !row.province ? 'no province' : 'not determinable';
    return (
      <span className="inline-flex items-center gap-1 text-xs text-[var(--app-muted)]" title={why}>
        <AlertTriangle className="h-3.5 w-3.5" />
        {why}
      </span>
    );
  }
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${SLA_STYLE[row.sla]}`}
    >
      {row.slaLabel}
    </span>
  );
}

export function CasePendingPanel() {
  const [asOf, setAsOf] = useState<string>(todayInBangkok());
  const [editing, setEditing] = useState<CaseReportRow | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const queryKey = ['case-report', 'mk', asOf];

  const { data: rows = [], isFetching, isError, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => (await caseReportApi.mk(asOf)).data.data ?? [],
    staleTime: 0,
    refetchOnWindowFocus: false,
  });

  // Re-read the board into the stored draft. Edited rows come through untouched, which
  // is why this needs no confirmation: it cannot undo anyone's work.
  const regenerate = useMutation({
    mutationFn: async () => (await caseReportApi.mk(asOf, true)).data.data ?? [],
    onSuccess: (fresh) => queryClient.setQueryData(queryKey, fresh),
  });

  const save = useMutation({
    mutationFn: (edit: CaseRowEdit) =>
      caseReportApi.editMkRow(asOf, editing!.sourceItemId!, edit).then((r) => r.data.data),
    onSuccess: (saved) => {
      queryClient.setQueryData<CaseReportRow[]>(queryKey, (current) =>
        (current ?? []).map((r) => (r.sourceItemId === saved.sourceItemId ? saved : r)),
      );
      setEditing(null);
      setEditError(null);
    },
    onError: (e) => setEditError(errorMessage(e, 'Could not save the row.')),
  });

  const busy = isFetching || regenerate.isPending;
  const breached = rows.filter((r) => r.sla === 'BREACHED').length;
  const onHold = rows.filter((r) => r.sla === 'ON_HOLD').length;
  const unknown = rows.filter((r) => r.sla === 'UNKNOWN').length;
  const edited = rows.filter((r) => r.edited).length;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--app-muted)]">
            Report date
          </span>
          <span className="relative">
            <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--app-muted)]" />
            <input
              type="date"
              value={asOf}
              onChange={(e) => setAsOf(e.target.value)}
              className="rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] py-2 pl-9 pr-3 text-sm text-[var(--app-text)]"
            />
          </span>
        </label>

        <button
          type="button"
          onClick={() => void refetch()}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--app-brand)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-60"
        >
          {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {isFetching ? 'Loading…' : 'Generate'}
        </button>

        <button
          type="button"
          onClick={() => regenerate.mutate()}
          disabled={busy || rows.length === 0}
          title="Re-read the monday board for this date. Rows you have edited are kept as they are."
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] px-4 py-2 text-sm font-semibold text-[var(--app-text)] transition hover:bg-[var(--app-faint)] disabled:opacity-60"
        >
          {regenerate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {regenerate.isPending ? 'Regenerating…' : 'Regenerate from monday'}
        </button>

        <p className="ml-auto max-w-md text-xs text-[var(--app-muted)]">
          MK, Yayoi and Bonus Suki delivery cases. Days counts from the day after the case
          opened (opened today = 0); the SLA is 3 days inside greater Bangkok, 5 elsewhere.
          Click a row&apos;s pencil to correct it.
        </p>
      </div>

      {(isError || regenerate.isError) && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {errorMessage(
              isError ? error : regenerate.error,
              'Could not generate the report. Check that the backend is running and that MONDAY_API_TOKEN is set.',
            )}
          </span>
        </div>
      )}

      {/* Totals. Deliberately above the table: on a 30-row report the count of breached
          cases is the thing someone wants first, and scrolling to tally them by eye is
          how a red row gets missed. */}
      {rows.length > 0 && (
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)] px-3 py-1.5">
            {rows.length} case{rows.length === 1 ? '' : 's'}
          </span>
          {breached > 0 && (
            <span className="rounded-lg bg-red-50 px-3 py-1.5 font-semibold text-red-700 ring-1 ring-inset ring-red-200 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900">
              {breached} over SLA
            </span>
          )}
          {onHold > 0 && (
            <span className="rounded-lg bg-amber-50 px-3 py-1.5 font-semibold text-amber-700 ring-1 ring-inset ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900">
              {onHold} on hold
            </span>
          )}
          {unknown > 0 && (
            <span className="rounded-lg border border-[var(--app-border)] px-3 py-1.5 text-[var(--app-muted)]">
              {unknown} without a verdict
            </span>
          )}
          {edited > 0 && (
            <span className="rounded-lg border border-[var(--app-border)] px-3 py-1.5 text-[var(--app-muted)]">
              {edited} edited by hand
            </span>
          )}
        </div>
      )}

      {/* The sheet. Column order matches Raw_Delivery so it can be read side by side
          with the file the team sends today. */}
      <div className="overflow-x-auto rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)]">
        <table className="w-full min-w-[70rem] text-left text-sm">
          <thead className="border-b border-[var(--app-border)] text-xs uppercase tracking-wide text-[var(--app-muted)]">
            <tr>
              <th className="px-3 py-2.5 font-semibold">No</th>
              <th className="px-3 py-2.5 font-semibold">Project</th>
              <th className="px-3 py-2.5 font-semibold">Branch</th>
              <th className="px-3 py-2.5 font-semibold">Robot</th>
              <th className="px-3 py-2.5 font-semibold">SN</th>
              <th className="px-3 py-2.5 font-semibold">Problem</th>
              <th className="px-3 py-2.5 font-semibold">Solution</th>
              <th className="px-3 py-2.5 font-semibold">Open Date</th>
              <th className="px-3 py-2.5 font-semibold">RE On Site</th>
              <th className="px-3 py-2.5 text-right font-semibold">Days</th>
              <th className="px-3 py-2.5 font-semibold">SLA</th>
              <th className="px-3 py-2.5">
                <span className="sr-only">Edit</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--app-border)]">
            {rows.map((row) => (
              <tr key={row.sourceItemId ?? row.no} className="align-top">
                <td className="px-3 py-2.5 tabular-nums text-[var(--app-muted)]">
                  {row.no}
                  {row.edited && (
                    // A corrected row looks like any other, so say so: the reader comparing
                    // against the board needs to know this cell is a person's word, not monday's.
                    <span
                      title="Edited by hand. Kept as is when the report is regenerated."
                      className="ml-1 inline-block rounded bg-[var(--app-brand-soft)] px-1 text-[10px] font-semibold uppercase text-[var(--app-brand-dark)]"
                    >
                      edited
                    </span>
                  )}
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap font-medium">{row.project ?? '—'}</td>
                <td className="px-3 py-2.5">{row.branch ?? '—'}</td>
                <td className="px-3 py-2.5 whitespace-nowrap">{row.robot ?? '—'}</td>
                <td className="px-3 py-2.5 whitespace-nowrap font-mono text-xs">
                  {row.serialNumber ?? '—'}
                </td>
                {/* Long Thai prose. Clamped so one verbose ticket does not push the SLA
                    column off the screen; the full text is in the title attribute. */}
                <td className="max-w-[18rem] px-3 py-2.5">
                  <span className="line-clamp-3" title={row.problem ?? undefined}>
                    {row.problem ?? '—'}
                  </span>
                </td>
                <td className="max-w-[18rem] px-3 py-2.5">
                  {row.solution ? (
                    <span className="line-clamp-3" title={row.solution}>
                      {row.solution}
                    </span>
                  ) : (
                    <span className="text-xs text-[var(--app-muted)]">—</span>
                  )}
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap tabular-nums">{row.openDate ?? '—'}</td>
                <td className="px-3 py-2.5 whitespace-nowrap tabular-nums">{row.reOnSite ?? '—'}</td>
                <td className="px-3 py-2.5 text-right font-semibold tabular-nums">
                  {row.days ?? '—'}
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <SlaCell row={row} />
                    {row.sourceItemId && (
                      // Where a wrong value actually gets fixed. Without this, a reviewer
                      // who spots a bad province has to go and find the ticket by hand.
                      <a
                        href={`https://raaspal.monday.com/boards/1647612496/pulses/${row.sourceItemId}`}
                        target="_blank"
                        rel="noreferrer"
                        title="Open this ticket on monday.com"
                        className="text-[var(--app-muted)] transition hover:text-[var(--app-brand-dark)]"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                </td>
                <td className="px-2 py-2.5">
                  {row.sourceItemId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditError(null);
                        setEditing(row);
                      }}
                      title="Correct this row"
                      aria-label={`Edit row ${row.no}`}
                      className="rounded-lg p-1.5 text-[var(--app-muted)] transition hover:bg-[var(--app-faint)] hover:text-[var(--app-brand-dark)]"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
                </td>
              </tr>
            ))}

            {rows.length === 0 && !isFetching && !isError && (
              <tr>
                <td colSpan={12} className="px-3 py-10 text-center text-sm text-[var(--app-muted)]">
                  No cases generated yet. Pick a date and press Generate.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-[var(--app-muted)]">
        Solution is written from each ticket&apos;s comment thread, in the team&apos;s wording. The
        board&apos;s own Solution cell wins where somebody typed one. Corrections made here are
        saved to this date&apos;s report only; the monday ticket is never changed.
      </p>

      {editing && (
        <CaseRowEditDialog
          key={editing.sourceItemId ?? editing.no}
          row={editing}
          saving={save.isPending}
          error={editError}
          onSave={(edit) => save.mutate(edit)}
          onClose={() => {
            if (!save.isPending) setEditing(null);
          }}
        />
      )}
    </div>
  );
}
