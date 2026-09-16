'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CalendarDays,
  Download,
  ExternalLink,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  Undo2,
} from 'lucide-react';
import { caseReportApi } from '@/lib/api';
import { useConfirm } from '@/components/ui/confirm-dialog';
import type { CaseReportSlug } from '@/lib/api';
import { isManualCaseRow } from '@/types/api';
import type { CaseBoard, CaseReportRow, CaseRowEdit, SlaStatus } from '@/types/api';
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

/**
 * What differs between the sheets: where the rows come from, which of Project/Branch
 * the sheet prints, and the defaults a new row starts with.
 */
export interface CaseReportSpec {
  slug: CaseReportSlug;
  /**
   * The monday board the rows come from, for the per-row ticket link. On Hold reads
   * both boards, so its rows carry their own `board` and this is only the fallback.
   */
  boardId: string;
  /**
   * On Hold only: the sheet mixes two boards, so it prints a Board column and offers a
   * Cleaning / Delivery filter. One sheet with a filter rather than two blocks, as the RE
   * team asked — the reader wants "what is waiting longest" across both.
   */
  boardFilter?: boolean;
  /** Which of the two site columns this sheet prints; the other is hidden. */
  columns: ('project' | 'branch')[];
  /**
   * What the sheet is judging. `sla` prints Solution, RE On Site and an SLA verdict;
   * `parts` (RAW_AOTGA) prints what was ordered, who it is waited on and when it arrived,
   * and no verdict at all.
   */
  layout: 'sla' | 'parts';
  /** One line under the controls: what is on the sheet and the SLA rule. */
  hint: string;
  /** Pre-filled on "Add row". */
  newRow: { project: string; robot: string };
}

export const CASE_REPORTS: Record<CaseReportSlug, CaseReportSpec> = {
  mk: {
    slug: 'mk',
    boardId: '1647612496',
    columns: ['project', 'branch'],
    layout: 'sla',
    hint: 'MK, Yayoi and Bonus Suki delivery cases. Days counts from the day after the case opened (opened today = 0); the SLA is 3 days inside greater Bangkok, 5 elsewhere.',
    newRow: { project: 'MK', robot: 'Pudu 1' },
  },
  cleaning: {
    slug: 'cleaning',
    boardId: '3451717331',
    columns: ['project'],
    layout: 'sla',
    hint: 'Every open cleaning case except Makro’s and the airports’, which have their own sheets, and except held cases (see On Hold). Days counts from the day after the case opened (opened today = 0); the SLA is 3 days everywhere.',
    newRow: { project: '', robot: 'M50' },
  },
  makro: {
    slug: 'makro',
    boardId: '3451717331',
    columns: ['branch'],
    layout: 'sla',
    hint: 'Makro’s cleaning cases, minus held cases (see On Hold). Days counts from the day after the case opened (opened today = 0); the SLA is 3 days everywhere.',
    newRow: { project: 'Makro', robot: 'Omnie' },
  },
  aotga: {
    slug: 'aotga',
    boardId: '3451717331',
    columns: ['project'],
    layout: 'parts',
    hint: 'The airports’ open cleaning cases, tracked by spare-part turnaround rather than SLA. Days and Aging After Received both count from the day after (opened or received today = 0). The 3-day SLA is computed but the sheet does not print it.',
    newRow: { project: 'AOTGA-', robot: 'M75' },
  },
  delivery: {
    slug: 'delivery',
    boardId: '1647612496',
    columns: ['project', 'branch'],
    layout: 'sla',
    hint: 'Every open delivery case that is not MK’s, minus held cases (see On Hold). Days counts from the day after the case opened (opened today = 0); the SLA is 3 days inside greater Bangkok, 5 elsewhere.',
    newRow: { project: '', robot: 'Pudu 1' },
  },
  'on-hold': {
    slug: 'on-hold',
    boardId: '3451717331',
    boardFilter: true,
    columns: ['project', 'branch'],
    layout: 'sla',
    hint: 'Every held case on the cleaning and delivery boards, except the airports’. A held case has no SLA: the clock is not RAASPAL’s to run. MK’s held cases are also still on the MK sheet, by request.',
    newRow: { project: '', robot: '' },
  },
};

/** Cleaning and delivery are different monday boards; the ticket link needs the right one. */
const BOARD_IDS: Record<CaseBoard, string> = {
  CLEANING: '3451717331',
  DELIVERY: '1647612496',
};

const BOARD_LABEL: Record<CaseBoard, string> = { CLEANING: 'Cleaning', DELIVERY: 'Delivery' };

/** "A, B, C" or one per line on the board -> ["A", "B", "C"]. A lone serial is itself. */
function serialLines(serialNumber: string): string[] {
  return serialNumber.split(/\s*[,\n]\s*/).map((s) => s.trim()).filter(Boolean);
}

/**
 * Where a wrong value actually gets fixed. Without this, a reviewer who spots a bad
 * value has to go and find the ticket by hand. A row added by hand has no ticket to open.
 */
function TicketLink({ row, boardId }: { row: CaseReportRow; boardId: string }) {
  if (!row.sourceItemId || isManualCaseRow(row)) return null;
  return (
    <a
      href={`https://raaspal.monday.com/boards/${boardId}/pulses/${row.sourceItemId}`}
      target="_blank"
      rel="noreferrer"
      title="Open this ticket on monday.com"
      className="text-[var(--app-muted)] transition hover:text-[var(--app-brand-dark)]"
    >
      <ExternalLink className="h-3.5 w-3.5" />
    </a>
  );
}

export function CasePendingPanel({ report }: { report: CaseReportSpec }) {
  const { confirm, confirmDialog } = useConfirm();
  const [asOf, setAsOf] = useState<string>(todayInBangkok());
  // The row being corrected, 'new' for one being added, null when the dialog is closed.
  const [editing, setEditing] = useState<CaseReportRow | 'new' | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  // On Hold only. 'all' is the default: the sheet's point is both boards at once.
  const [boardFilter, setBoardFilter] = useState<CaseBoard | 'all'>('all');
  // Removed rows are hidden by default; the chip toggles them into view for restoring.
  const [showRemoved, setShowRemoved] = useState(false);
  const queryClient = useQueryClient();
  const queryKey = ['case-report', report.slug, asOf];

  const { data: rows = [], isFetching, isError, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => (await caseReportApi.rows(report.slug, asOf)).data.data ?? [],
    staleTime: 0,
    refetchOnWindowFocus: false,
    // The first call for a date generates the sheet: minutes of monday and model calls.
    // A timeout is "still working", not a blip, and the query layer's default three
    // retries fired three more generations of the same sheet. The server now joins a
    // duplicate onto the running one, but the client should not send it at all.
    retry: false,
  });

  // Re-read the board into the stored draft. Edited rows come through untouched, which
  // is why this needs no confirmation: it cannot undo anyone's work.
  const regenerate = useMutation({
    mutationFn: async () => (await caseReportApi.rows(report.slug, asOf, true)).data.data ?? [],
    onSuccess: (fresh) => queryClient.setQueryData(queryKey, fresh),
  });

  const closeDialog = () => {
    setEditing(null);
    setEditError(null);
  };

  const save = useMutation({
    mutationFn: (edit: CaseRowEdit) =>
      editing === 'new'
        ? caseReportApi.addRow(report.slug, asOf, edit).then((r) => r.data.data)
        : caseReportApi.editRow(report.slug, asOf, editing!.sourceItemId!, edit).then((r) => r.data.data),
    onSuccess: (saved) => {
      queryClient.setQueryData<CaseReportRow[]>(queryKey, (current) => {
        const list = current ?? [];
        return list.some((r) => r.sourceItemId === saved.sourceItemId)
          ? list.map((r) => (r.sourceItemId === saved.sourceItemId ? saved : r))
          : [...list, saved];
      });
      closeDialog();
    },
    onError: (e) => setEditError(errorMessage(e, 'Could not save the row.')),
  });

  // Mirror the backend's numbering: 1..n over the rows on the sheet, 0 for a removed one.
  const renumber = (list: CaseReportRow[]) => {
    let next = 1;
    return list.map((r) => ({ ...r, no: r.removed ? 0 : next++ }));
  };

  const remove = useMutation({
    mutationFn: (sourceItemId: string) => caseReportApi.removeRow(report.slug, asOf, sourceItemId),
    onSuccess: (_, sourceItemId) => {
      // A row added by hand is gone; a board row stays, hidden, so it can be restored.
      queryClient.setQueryData<CaseReportRow[]>(queryKey, (current) =>
        renumber(
          (current ?? [])
            .filter((r) => !(r.sourceItemId === sourceItemId && isManualCaseRow(r)))
            .map((r) => (r.sourceItemId === sourceItemId ? { ...r, removed: true } : r)),
        ),
      );
      closeDialog();
    },
    onError: (e) => setEditError(errorMessage(e, 'Could not remove the row.')),
  });

  const restore = useMutation({
    mutationFn: (sourceItemId: string) => caseReportApi.restoreRow(report.slug, asOf, sourceItemId),
    onSuccess: (_, sourceItemId) => {
      queryClient.setQueryData<CaseReportRow[]>(queryKey, (current) =>
        renumber((current ?? []).map((r) => (r.sourceItemId === sourceItemId ? { ...r, removed: false } : r))),
      );
    },
    onError: (e) => setEditError(errorMessage(e, 'Could not restore the row.')),
  });

  const askRemove = (row: CaseReportRow) =>
    void confirm({
      title: 'Remove this row?',
      kind: 'delete',
      confirmLabel: 'Remove row',
      message: isManualCaseRow(row)
        ? `Row ${row.no} is taken off this date's report. It was added by hand, so nothing on monday changes.`
        : `Row ${row.no} is taken off this date's report and stays off if the report is regenerated. The monday ticket is not changed, and you can put the row back from the "removed" chip.`,
    }).then((ok) => ok && remove.mutate(row.sourceItemId!));

  const busy = isFetching || regenerate.isPending;

  // Download, not a link: the token lives in localStorage and only the axios
  // interceptor attaches it, so an <a href> to the endpoint would arrive anonymous.
  const exportExcel = useMutation({
    mutationFn: async () => {
      const res = await caseReportApi.exportExcel(report.slug, asOf);
      const disposition = String(res.headers['content-disposition'] ?? '');
      const named = /filename="?([^";]+)"?/.exec(disposition)?.[1];
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = named ?? `${report.slug}-pending-${asOf}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    },
  });
  const showProject = report.columns.includes('project');
  const showBranch = report.columns.includes('branch');
  const showBoard = report.boardFilter === true;
  const parts = report.layout === 'parts';
  // What is stored includes rows a person removed; the sheet is the rest. Every total
  // below is of the sheet, so "12 cases" is what the customer would get.
  const sheet = rows.filter((r) => !r.removed);
  const removedRows = rows.filter((r) => r.removed);
  // The filter narrows what is shown, not what is stored: the totals and the download
  // stay whole-sheet, so "12 cases" means the report, not the current view.
  const onBoard = showBoard && boardFilter !== 'all' ? sheet.filter((r) => r.board === boardFilter) : sheet;
  const visible = showRemoved ? [...onBoard, ...removedRows] : onBoard;
  const breached = sheet.filter((r) => r.sla === 'BREACHED').length;
  const onHold = sheet.filter((r) => r.sla === 'ON_HOLD').length;
  const unknown = sheet.filter((r) => r.sla === 'UNKNOWN').length;
  const edited = sheet.filter((r) => r.edited && !isManualCaseRow(r)).length;
  const added = sheet.filter(isManualCaseRow).length;

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

        {showBoard && (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--app-muted)]">
              Board
            </span>
            <div
              role="radiogroup"
              aria-label="Filter by board"
              className="inline-flex overflow-hidden rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] text-sm"
            >
              {(['all', 'CLEANING', 'DELIVERY'] as const).map((option) => {
                const count = option === 'all' ? sheet.length : sheet.filter((r) => r.board === option).length;
                const active = boardFilter === option;
                return (
                  <button
                    key={option}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setBoardFilter(option)}
                    className={`px-3 py-2 font-semibold transition ${
                      active
                        ? 'bg-[var(--app-brand)] text-white'
                        : 'text-[var(--app-text)] hover:bg-[var(--app-faint)]'
                    }`}
                  >
                    {option === 'all' ? 'All' : BOARD_LABEL[option]}
                    {sheet.length > 0 && <span className="ml-1.5 tabular-nums opacity-70">{count}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            setEditError(null);
            setEditing('new');
          }}
          disabled={busy || rows.length === 0}
          title="Add a case the board does not list. Generate the report first."
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] px-4 py-2 text-sm font-semibold text-[var(--app-text)] transition hover:bg-[var(--app-faint)] disabled:opacity-60"
        >
          <Plus className="h-4 w-4" />
          Add row
        </button>

        <button
          type="button"
          onClick={() => exportExcel.mutate()}
          disabled={busy || exportExcel.isPending || rows.length === 0}
          title="Download this sheet as Excel, exactly as shown - corrections included."
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] px-4 py-2 text-sm font-semibold text-[var(--app-text)] transition hover:bg-[var(--app-faint)] disabled:opacity-60"
        >
          {exportExcel.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {exportExcel.isPending ? 'Preparing…' : 'Export Excel'}
        </button>

        <p className="ml-auto max-w-md text-xs text-[var(--app-muted)]">
          {report.hint} Click a row&apos;s pencil to correct it.
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
            {sheet.length} case{sheet.length === 1 ? '' : 's'}
          </span>
          {removedRows.length > 0 && (
            <button
              type="button"
              onClick={() => setShowRemoved((v) => !v)}
              aria-pressed={showRemoved}
              title={showRemoved ? 'Hide the removed rows' : 'Show the removed rows, to put one back'}
              className={`rounded-lg border px-3 py-1.5 transition ${
                showRemoved
                  ? 'border-[var(--app-brand)] bg-[var(--app-brand-soft)] text-[var(--app-brand-dark)]'
                  : 'border-[var(--app-border)] text-[var(--app-muted)] hover:bg-[var(--app-faint)]'
              }`}
            >
              {removedRows.length} removed by hand
            </button>
          )}
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
          {added > 0 && (
            <span className="rounded-lg border border-[var(--app-border)] px-3 py-1.5 text-[var(--app-muted)]">
              {added} added by hand
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
              {showBoard && <th className="px-3 py-2.5 font-semibold">Board</th>}
              {showProject && <th className="px-3 py-2.5 font-semibold">Project</th>}
              {showBranch && <th className="px-3 py-2.5 font-semibold">Branch</th>}
              <th className="px-3 py-2.5 font-semibold">Robot</th>
              <th className="px-3 py-2.5 font-semibold">SN</th>
              <th className="px-3 py-2.5 font-semibold">Problem</th>
              {parts ? (
                <>
                  <th className="px-3 py-2.5 font-semibold">Required Part</th>
                  <th className="px-3 py-2.5 font-semibold">Waiting</th>
                  <th className="px-3 py-2.5 font-semibold">Waiting From</th>
                </>
              ) : (
                <th className="px-3 py-2.5 font-semibold">Solution</th>
              )}
              <th className="px-3 py-2.5 font-semibold">Open Date</th>
              {!parts && <th className="px-3 py-2.5 font-semibold">RE On Site</th>}
              <th className="px-3 py-2.5 text-right font-semibold">Days</th>
              {parts ? (
                <>
                  <th className="px-3 py-2.5 font-semibold">Part Received</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Aging After Received</th>
                </>
              ) : (
                <th className="px-3 py-2.5 font-semibold">SLA</th>
              )}
              <th className="px-3 py-2.5">
                <span className="sr-only">Edit</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--app-border)]">
            {visible.map((row) => (
              <tr
                key={row.sourceItemId ?? row.no}
                className={`align-top ${row.removed ? 'bg-[var(--app-faint)] text-[var(--app-muted)] opacity-70' : ''}`}
              >
                <td className="px-3 py-2.5 tabular-nums text-[var(--app-muted)]">
                  {row.removed ? (
                    <span
                      title="Removed from this date's report by hand. Not on the Excel; stays off if regenerated."
                      className="inline-block rounded bg-[var(--app-bg)] px-1 text-[10px] font-semibold uppercase ring-1 ring-inset ring-[var(--app-border)]"
                    >
                      removed
                    </span>
                  ) : (
                    row.no
                  )}
                  {row.edited && (
                    // A corrected row looks like any other, so say so: the reader comparing
                    // against the board needs to know this cell is a person's word, not monday's.
                    <span
                      title={
                        isManualCaseRow(row)
                          ? 'Added by hand — not on the monday board. Kept when the report is regenerated.'
                          : 'Edited by hand. Kept as is when the report is regenerated.'
                      }
                      className="ml-1 inline-block rounded bg-[var(--app-brand-soft)] px-1 text-[10px] font-semibold uppercase text-[var(--app-brand-dark)]"
                    >
                      {isManualCaseRow(row) ? 'added' : 'edited'}
                    </span>
                  )}
                </td>
                {showBoard && (
                  <td className="px-3 py-2.5 whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-[var(--app-muted)]">
                    {row.board ? BOARD_LABEL[row.board] : '—'}
                  </td>
                )}
                {showProject && (
                  <td className="px-3 py-2.5 font-medium">{row.project ?? '—'}</td>
                )}
                {showBranch && <td className="px-3 py-2.5">{row.branch ?? '—'}</td>}
                <td className="px-3 py-2.5 whitespace-nowrap">{row.robot ?? '—'}</td>
                {/* A cleaning case can name several robots, typed into one board field
                    as "A, B, C". One per line, each unbroken, so three serials do not
                    stretch the column across the screen or snap in the middle. */}
                <td className="px-3 py-2.5 font-mono text-xs">
                  {row.serialNumber
                    ? serialLines(row.serialNumber).map((sn) => (
                        <span key={sn} className="block whitespace-nowrap">{sn}</span>
                      ))
                    : '—'}
                </td>
                {/* Long Thai prose. Clamped so one verbose ticket does not push the SLA
                    column off the screen; the full text is in the title attribute. */}
                <td className="max-w-[18rem] px-3 py-2.5">
                  <span className="line-clamp-3" title={row.problem ?? undefined}>
                    {row.problem ?? '—'}
                  </span>
                </td>
                {parts ? (
                  <>
                    <td className="max-w-[14rem] px-3 py-2.5">{row.requiredPart ?? '—'}</td>
                    <td className="max-w-[18rem] px-3 py-2.5">
                      {row.waiting ? (
                        <span className="line-clamp-3" title={row.waiting}>
                          {row.waiting}
                        </span>
                      ) : (
                        <span className="text-xs text-[var(--app-muted)]">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{row.waitingFrom ?? '—'}</td>
                  </>
                ) : (
                  <td className="max-w-[22rem] px-3 py-2.5">
                    {/* One dated entry per line, as the RE team's sheet lays it out. Not
                        clamped: the reviewer is checking every line, and a hidden fourth
                        entry is the one that would have needed correcting. */}
                    {row.solution ? (
                      <span className="block whitespace-pre-line" title={row.solution}>
                        {row.solution}
                      </span>
                    ) : (
                      <span className="text-xs text-[var(--app-muted)]">—</span>
                    )}
                  </td>
                )}
                <td className="px-3 py-2.5 whitespace-nowrap tabular-nums">{row.openDate ?? '—'}</td>
                {!parts && (
                  <td className="px-3 py-2.5 whitespace-nowrap tabular-nums">{row.reOnSite ?? '—'}</td>
                )}
                <td className="px-3 py-2.5 text-right font-semibold tabular-nums">
                  {row.days ?? '—'}
                </td>
                {parts ? (
                  <>
                    <td className="px-3 py-2.5 whitespace-nowrap tabular-nums">{row.partReceived ?? '—'}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-end gap-2 font-semibold tabular-nums">
                        {row.agingAfterReceived ?? '—'}
                        <TicketLink row={row} boardId={row.board ? BOARD_IDS[row.board] : report.boardId} />
                      </div>
                    </td>
                  </>
                ) : (
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <SlaCell row={row} />
                      <TicketLink row={row} boardId={row.board ? BOARD_IDS[row.board] : report.boardId} />
                    </div>
                  </td>
                )}
                <td className="px-2 py-2.5">
                  {row.sourceItemId && row.removed && (
                    <button
                      type="button"
                      onClick={() => restore.mutate(row.sourceItemId!)}
                      disabled={restore.isPending}
                      title="Put this row back on the report"
                      aria-label={`Restore row for ticket ${row.sourceItemId}`}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-[var(--app-brand-dark)] transition hover:bg-[var(--app-brand-soft)] disabled:opacity-60"
                    >
                      <Undo2 className="h-3.5 w-3.5" />
                      Restore
                    </button>
                  )}
                  {row.sourceItemId && !row.removed && (
                    <span className="inline-flex items-center">
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
                    <button
                      type="button"
                      onClick={() => askRemove(row)}
                      disabled={remove.isPending}
                      title="Remove this row from the report"
                      aria-label={`Remove row ${row.no}`}
                      className="rounded-lg p-1.5 text-[var(--app-muted)] transition hover:bg-red-50 hover:text-red-700 disabled:opacity-60 dark:hover:bg-red-950/40 dark:hover:text-red-300"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    </span>
                  )}
                </td>
              </tr>
            ))}

            {rows.length === 0 && !isFetching && !isError && (
              <tr>
                <td colSpan={(parts ? 12 : 10) + report.columns.length + (showBoard ? 1 : 0)} className="px-3 py-10 text-center text-sm text-[var(--app-muted)]">
                  No cases generated yet. Pick a date and press Generate.
                </td>
              </tr>
            )}
            {rows.length > 0 && visible.length === 0 && (
              <tr>
                <td colSpan={(parts ? 12 : 10) + report.columns.length + 1} className="px-3 py-10 text-center text-sm text-[var(--app-muted)]">
                  No {boardFilter === 'all' ? '' : BOARD_LABEL[boardFilter].toLowerCase() + ' '}cases on hold for this date.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-[var(--app-muted)]">
        {parts
          ? 'Required Part, Waiting, Waiting From and Part Received are written from each ticket’s comment thread, in the team’s wording; a value typed into the board’s own columns wins. A blank cell means the thread did not say. Corrections made here are saved to this date’s report only; the monday ticket is never changed.'
          : 'Solution is written from each ticket’s comment thread, in the team’s wording. The board’s own Solution cell wins where somebody typed one. Corrections made here are saved to this date’s report only; the monday ticket is never changed.'}
      </p>

      {editing && (
        <CaseRowEditDialog
          key={editing === 'new' ? 'new' : (editing.sourceItemId ?? editing.no)}
          row={editing === 'new' ? null : editing}
          newRow={report.newRow}
          saving={save.isPending || remove.isPending}
          error={editError}
          onSave={(edit) => save.mutate(edit)}
          onRemove={editing !== 'new' && editing.sourceItemId ? () => askRemove(editing) : undefined}
          onClose={() => {
            if (!save.isPending && !remove.isPending) closeDialog();
          }}
        />
      )}
      {confirmDialog}
    </div>
  );
}
