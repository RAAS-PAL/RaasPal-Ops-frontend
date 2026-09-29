'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CalendarDays,
  Clock,
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
import type { CaseBoard, CaseReportRow, CaseReportRunInfo, CaseRowEdit, SlaStatus } from '@/types/api';
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
 * <p>The Reports tab shows only the counts (CasePendingSummary); this sheet is the
 * details page it links to, at /reports/cases/[slug]?date=.
 *
 * <p>Delivery is still by hand — nothing here sends anything.
 */

/** The `<b>` of a rich message: a figure set in the app's ink inside a muted sentence. */
export const boldText = (chunks: React.ReactNode) => (
  <span className="font-semibold text-[var(--app-text)]">{chunks}</span>
);

export function errorMessage(e: unknown, fallback: string): string {
  const detail =
    typeof e === 'object' && e !== null && 'response' in e
      ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (e as any).response?.data?.message
      : undefined;
  return typeof detail === 'string' && detail.trim() !== '' ? detail : fallback;
}

/** Today in Bangkok, as yyyy-MM-dd — the business day, not the browser's. */
export function todayInBangkok(): string {
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

export function SlaCell({ row }: { row: CaseReportRow }) {
  const t = useTranslations('pendingCases');
  // A blank verdict is a question, not a value: say what is missing so somebody can fix
  // it, rather than showing an empty cell that reads as a rendering bug.
  if (row.sla === 'UNKNOWN') {
    const why = !row.openDate ? t('sla.noOpenDate') : !row.province ? t('sla.noProvince') : t('sla.notDeterminable');
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
      {t(`sla.${row.sla}`)}
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
  /** One line under the controls: what is on the sheet and the SLA rule (`pendingCases.hint.*`). */
  hintKey: string;
  /** Pre-filled on "Add row". */
  newRow: { project: string; robot: string };
  /**
   * Whose name goes on the customer's on-hold count: "MK on hold". The generic sheets
   * say "Customer", since their rows belong to many.
   */
  holdOwner: string;
  /**
   * True where held cases leave this sheet for On Hold, so its on-hold counts are always
   * zero and the summary says where they went instead of implying there are none.
   */
  heldElsewhere?: boolean;
}

export const CASE_REPORTS: Record<CaseReportSlug, CaseReportSpec> = {
  mk: {
    slug: 'mk',
    boardId: '1647612496',
    columns: ['project', 'branch'],
    layout: 'sla',
    hintKey: 'hint.mk',
    newRow: { project: 'MK', robot: 'Pudu 1' },
    holdOwner: 'MK',
  },
  cleaning: {
    slug: 'cleaning',
    boardId: '3451717331',
    columns: ['project'],
    layout: 'sla',
    hintKey: 'hint.cleaning',
    newRow: { project: '', robot: 'M50' },
    holdOwner: 'Customer',
    heldElsewhere: true,
  },
  makro: {
    slug: 'makro',
    boardId: '3451717331',
    columns: ['branch'],
    layout: 'sla',
    hintKey: 'hint.makro',
    newRow: { project: 'Makro', robot: 'Omnie' },
    holdOwner: 'Makro',
    heldElsewhere: true,
  },
  aotga: {
    slug: 'aotga',
    boardId: '3451717331',
    columns: ['project'],
    layout: 'parts',
    hintKey: 'hint.aotga',
    newRow: { project: 'AOTGA-', robot: 'M75' },
    holdOwner: 'AOTGA',
  },
  delivery: {
    slug: 'delivery',
    boardId: '1647612496',
    columns: ['project', 'branch'],
    layout: 'sla',
    hintKey: 'hint.delivery',
    newRow: { project: '', robot: 'Pudu 1' },
    holdOwner: 'Customer',
    heldElsewhere: true,
  },
  'on-hold': {
    slug: 'on-hold',
    boardId: '3451717331',
    boardFilter: true,
    columns: ['project', 'branch'],
    layout: 'sla',
    hintKey: 'hint.onHold',
    newRow: { project: '', robot: '' },
    holdOwner: 'Customer',
  },
};

/** Cleaning and delivery are different monday boards; the ticket link needs the right one. */
export const BOARD_IDS: Record<CaseBoard, string> = {
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
export function TicketLink({ row, boardId }: { row: CaseReportRow; boardId: string }) {
  const t = useTranslations('pendingCases');
  if (!row.sourceItemId || isManualCaseRow(row)) return null;
  return (
    <a
      href={`https://raaspal.monday.com/boards/${boardId}/pulses/${row.sourceItemId}`}
      target="_blank"
      rel="noreferrer"
      title={t('ticketLinkTitle')}
      className="text-[var(--app-muted)] transition hover:text-[var(--app-brand-dark)]"
    >
      <ExternalLink className="h-3.5 w-3.5" />
    </a>
  );
}

/** The sheet's totals, as the summary tiles and the details chips both print them. */
export interface CaseCounts {
  total: number;
  within: number;
  breached: number;
  /** Held on the board's Status column: the customer's hold. */
  heldByCustomer: number;
  /**
   * Held on Sup Status only. Not a hold in the team's sense — RAASPAL does not put a
   * customer's case on hold — so it is counted in {@link raaspalPending}.
   */
  heldByRaaspal: number;
  /** Held on a row frozen before the owner was recorded, or set to On Hold by hand. */
  heldUnsplit: number;
  unknown: number;
  /**
   * Every case waiting on RAASPAL's action — a technician's schedule, a spare part:
   * within SLA, over SLA, no verdict, and Sup Status holds. With the customer's holds
   * and the unsplit ones, it makes up the total.
   */
  raaspalPending: number;
}

/** Counts the rows on the sheet. Pass the sheet, not the stored list: removed rows are not cases. */
export function countCases(sheet: CaseReportRow[]): CaseCounts {
  const held = sheet.filter((r) => r.sla === 'ON_HOLD');
  const heldByCustomer = held.filter((r) => r.heldBy === 'CUSTOMER').length;
  const heldByRaaspal = held.filter((r) => r.heldBy === 'RAASPAL').length;
  const within = sheet.filter((r) => r.sla === 'WITHIN').length;
  const breached = sheet.filter((r) => r.sla === 'BREACHED').length;
  const unknown = sheet.filter((r) => r.sla === 'UNKNOWN').length;
  return {
    total: sheet.length,
    within,
    breached,
    heldByCustomer,
    heldByRaaspal,
    heldUnsplit: held.length - heldByCustomer - heldByRaaspal,
    unknown,
    raaspalPending: within + breached + unknown + heldByRaaspal,
  };
}

/**
 * How one date's stored sheet is read. Shared by every view that shows it, so the
 * combined views (Internal, PCS, ...) and a sheet's details page read one cached copy.
 */
export function caseSheetQuery(slug: CaseReportSlug, asOf: string) {
  // Today's sheet is regenerated on the server every 15 minutes. Reading the stored copy
  // is cheap (no monday call), so an open page re-reads it every minute and is never far
  // behind the server. Only while the tab is in front — the query layer's default — and
  // never for a past date, which is settled.
  const live = asOf === todayInBangkok();
  return {
    queryKey: ['case-report', slug, asOf],
    queryFn: async () => (await caseReportApi.rows(slug, asOf)).data.data ?? [],
    staleTime: 0,
    refetchOnWindowFocus: false,
    refetchInterval: live ? LIVE_POLL_MS : (false as const),
    // The first call for a date generates the sheet: minutes of monday and model calls.
    // A timeout is "still working", not a blip, and the query layer's default three
    // retries fired three more generations of the same sheet. The server now joins a
    // duplicate onto the running one, but the client should not send it at all.
    retry: false,
  };
}

/**
 * One date's stored sheet, and the two whole-sheet actions the summary and the details
 * page both offer. One query key for both, so opening the details after Generate reads
 * the cached rows instead of asking again.
 */
export function useCaseReport(report: CaseReportSpec, asOf: string) {
  const queryClient = useQueryClient();
  const sheet = caseSheetQuery(report.slug, asOf);
  const queryKey = sheet.queryKey;
  const runKey = ['case-report-run', report.slug, asOf];
  const live = asOf === todayInBangkok();

  const query = useQuery(sheet);

  // Re-read the board into the stored draft. Edited rows come through untouched, which
  // is why this needs no confirmation: it cannot undo anyone's work.
  const regenerate = useMutation({
    mutationFn: async () => (await caseReportApi.rows(report.slug, asOf, true)).data.data ?? [],
    onSuccess: (fresh) => {
      queryClient.setQueryData(queryKey, fresh);
      void queryClient.invalidateQueries({ queryKey: runKey });
    },
  });

  // When the stored copy was last generated, for "Updated 10:45". Polled with the rows.
  const runInfo = useQuery({
    queryKey: runKey,
    queryFn: async () => (await caseReportApi.run(report.slug, asOf)).data.data ?? null,
    staleTime: 0,
    refetchOnWindowFocus: false,
    refetchInterval: live ? LIVE_POLL_MS : false,
  });

  const exportExcel = useMutation({ mutationFn: () => downloadCaseSheet(report.slug, asOf) });

  return { queryKey, query, regenerate, exportExcel, runInfo: runInfo.data ?? null, live };
}

/**
 * One sheet's Excel for one date, exactly as stored — corrections included.
 *
 * <p>Download, not a link: the token lives in localStorage and only the axios
 * interceptor attaches it, so an <a href> to the endpoint would arrive anonymous.
 */
export async function downloadCaseSheet(slug: CaseReportSlug, asOf: string): Promise<void> {
  const res = await caseReportApi.exportExcel(slug, asOf);
  const disposition = String(res.headers['content-disposition'] ?? '');
  const named = /filename="?([^";]+)"?/.exec(disposition)?.[1];
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = named ?? `${slug}-pending-${asOf}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

/** How often an open page re-reads today's stored sheet. The server refreshes it every 15 min. */
const LIVE_POLL_MS = 60_000;

/**
 * How fresh the sheet on screen is: "Updated 10:45 · refreshes from monday every 15
 * minutes" for today, "Final — last updated 23:45" for a settled date. Nothing until the
 * date has been generated.
 */
export function CaseReportFreshness({ info, live }: { info: CaseReportRunInfo | null; live: boolean }) {
  const t = useTranslations('pendingCases');
  if (!info?.exists || !info.generatedAt) return null;
  const at = new Date(info.generatedAt);
  if (Number.isNaN(at.getTime())) return null;
  const time = at.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok' });
  return (
    <p className="flex items-center gap-1.5 text-xs text-[var(--app-muted)]">
      <Clock className="h-3.5 w-3.5 shrink-0" />
      <span>{t.rich(live ? 'sheet.updatedLive' : 'sheet.finalFor', { time, b: boldText })}</span>
    </p>
  );
}

/**
 * The full sheet for one date: every row, with the tools to correct it.
 *
 * @param initialDate the date the summary linked from; the picker here keeps the URL in step.
 */
export function CaseReportSheet({ report, initialDate }: { report: CaseReportSpec; initialDate?: string | null }) {
  const t = useTranslations('pendingCases');
  const { confirm, confirmDialog } = useConfirm();
  const [asOf, setAsOfState] = useState<string>(initialDate ?? todayInBangkok());
  // Keep the date in the URL, so a reload or a shared link opens the same sheet.
  const setAsOf = (next: string) => {
    setAsOfState(next);
    window.history.replaceState(null, '', `?date=${next}`);
  };
  // The row being corrected, 'new' for one being added, null when the dialog is closed.
  const [editing, setEditing] = useState<CaseReportRow | 'new' | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  // On Hold only. 'all' is the default: the sheet's point is both boards at once.
  const [boardFilter, setBoardFilter] = useState<CaseBoard | 'all'>('all');
  // Removed rows are hidden by default; the chip toggles them into view for restoring.
  const [showRemoved, setShowRemoved] = useState(false);
  const queryClient = useQueryClient();
  const { queryKey, query, regenerate, exportExcel, runInfo, live } = useCaseReport(report, asOf);
  const { data: rows = [], isFetching, isError, error, refetch } = query;

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
    onError: (e) => setEditError(errorMessage(e, t('sheet.saveFailed'))),
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
    onError: (e) => setEditError(errorMessage(e, t('sheet.removeFailed'))),
  });

  const restore = useMutation({
    mutationFn: (sourceItemId: string) => caseReportApi.restoreRow(report.slug, asOf, sourceItemId),
    onSuccess: (_, sourceItemId) => {
      queryClient.setQueryData<CaseReportRow[]>(queryKey, (current) =>
        renumber((current ?? []).map((r) => (r.sourceItemId === sourceItemId ? { ...r, removed: false } : r))),
      );
    },
    onError: (e) => setEditError(errorMessage(e, t('sheet.restoreFailed'))),
  });

  const askRemove = (row: CaseReportRow) =>
    void confirm({
      title: t('sheet.confirmTitle'),
      kind: 'delete',
      confirmLabel: t('sheet.confirmLabel'),
      message: t(isManualCaseRow(row) ? 'sheet.confirmManual' : 'sheet.confirmBoard', { no: row.no }),
    }).then((ok) => ok && remove.mutate(row.sourceItemId!));

  const busy = isFetching || regenerate.isPending;

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
  const { breached, heldByCustomer, heldUnsplit, unknown, raaspalPending } = countCases(sheet);
  const ownerName = report.holdOwner === 'Customer' ? t('owner.customer') : report.holdOwner;
  const edited = sheet.filter((r) => r.edited && !isManualCaseRow(r)).length;
  const added = sheet.filter(isManualCaseRow).length;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--app-muted)]">
            {t('sheet.reportDate')}
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
          {isFetching ? t('sheet.loading') : t('sheet.generate')}
        </button>

        <button
          type="button"
          onClick={() => regenerate.mutate()}
          disabled={busy || rows.length === 0}
          title={t('sheet.regenerateTitle')}
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] px-4 py-2 text-sm font-semibold text-[var(--app-text)] transition hover:bg-[var(--app-faint)] disabled:opacity-60"
        >
          {regenerate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {regenerate.isPending ? t('sheet.regenerating') : t('sheet.regenerate')}
        </button>

        {showBoard && (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--app-muted)]">
              {t('sheet.boardLabel')}
            </span>
            <div
              role="radiogroup"
              aria-label={t('sheet.filterByBoard')}
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
                    {option === 'all' ? t('sheet.all') : BOARD_LABEL[option]}
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
          title={t('sheet.addRowTitle')}
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] px-4 py-2 text-sm font-semibold text-[var(--app-text)] transition hover:bg-[var(--app-faint)] disabled:opacity-60"
        >
          <Plus className="h-4 w-4" />
          {t('sheet.addRow')}
        </button>

        <button
          type="button"
          onClick={() => exportExcel.mutate()}
          disabled={busy || exportExcel.isPending || rows.length === 0}
          title={t('sheet.exportTitle')}
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] px-4 py-2 text-sm font-semibold text-[var(--app-text)] transition hover:bg-[var(--app-faint)] disabled:opacity-60"
        >
          {exportExcel.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {exportExcel.isPending ? t('sheet.preparing') : t('sheet.exportExcel')}
        </button>

        <p className="ml-auto max-w-md text-xs text-[var(--app-muted)]">
          {t('sheet.hintWithPencil', { hint: t(report.hintKey) })}
        </p>
      </div>

      {(isError || regenerate.isError) && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {errorMessage(
              isError ? error : regenerate.error,
              t('sheet.generateFailed'),
            )}
          </span>
        </div>
      )}

      <CaseReportFreshness info={runInfo} live={live} />

      {/* Totals. Deliberately above the table: on a 30-row report the count of breached
          cases is the thing someone wants first, and scrolling to tally them by eye is
          how a red row gets missed. */}
      {rows.length > 0 && (
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)] px-3 py-1.5">
            {t('caseCount', { count: sheet.length })}
          </span>
          {removedRows.length > 0 && (
            <button
              type="button"
              onClick={() => setShowRemoved((v) => !v)}
              aria-pressed={showRemoved}
              title={showRemoved ? t('sheet.hideRemoved') : t('sheet.showRemoved')}
              className={`rounded-lg border px-3 py-1.5 transition ${
                showRemoved
                  ? 'border-[var(--app-brand)] bg-[var(--app-brand-soft)] text-[var(--app-brand-dark)]'
                  : 'border-[var(--app-border)] text-[var(--app-muted)] hover:bg-[var(--app-faint)]'
              }`}
            >
              {t('sheet.removedByHand', { count: removedRows.length })}
            </button>
          )}
          {raaspalPending > 0 && (
            <span className="rounded-lg bg-[var(--app-brand-soft)] px-3 py-1.5 font-semibold text-[var(--app-brand-dark)]">
              {t('sheet.pendingCount', { count: raaspalPending })}
            </span>
          )}
          {breached > 0 && (
            <span className="rounded-lg bg-red-50 px-3 py-1.5 font-semibold text-red-700 ring-1 ring-inset ring-red-200 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900">
              {t('sheet.overSla', { count: breached })}
            </span>
          )}
          {(
            [
              ['owner', heldByCustomer, t('sheet.heldOwner', { count: heldByCustomer, owner: ownerName })],
              ['plain', heldUnsplit, t('sheet.heldPlain', { count: heldUnsplit })],
            ] as const
          ).map(([kind, count, label]) =>
            count > 0 ? (
              <span
                key={kind}
                className="rounded-lg bg-amber-50 px-3 py-1.5 font-semibold text-amber-700 ring-1 ring-inset ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900"
              >
                {label}
              </span>
            ) : null,
          )}
          {unknown > 0 && (
            <span className="rounded-lg border border-[var(--app-border)] px-3 py-1.5 text-[var(--app-muted)]">
              {t('sheet.withoutVerdict', { count: unknown })}
            </span>
          )}
          {edited > 0 && (
            <span className="rounded-lg border border-[var(--app-border)] px-3 py-1.5 text-[var(--app-muted)]">
              {t('sheet.editedByHand', { count: edited })}
            </span>
          )}
          {added > 0 && (
            <span className="rounded-lg border border-[var(--app-border)] px-3 py-1.5 text-[var(--app-muted)]">
              {t('sheet.addedByHand', { count: added })}
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
                <span className="sr-only">{t('sheet.editColumn')}</span>
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
                      title={t('sheet.removedTitle')}
                      className="inline-block rounded bg-[var(--app-bg)] px-1 text-[10px] font-semibold uppercase ring-1 ring-inset ring-[var(--app-border)]"
                    >
                      {t('sheet.removedBadge')}
                    </span>
                  ) : (
                    row.no
                  )}
                  {row.edited && (
                    // A corrected row looks like any other, so say so: the reader comparing
                    // against the board needs to know this cell is a person's word, not monday's.
                    <span
                      title={isManualCaseRow(row) ? t('sheet.addedTitle') : t('sheet.editedTitle')}
                      className="ml-1 inline-block rounded bg-[var(--app-brand-soft)] px-1 text-[10px] font-semibold uppercase text-[var(--app-brand-dark)]"
                    >
                      {isManualCaseRow(row) ? t('sheet.addedBadge') : t('sheet.editedBadge')}
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
                        clamped - every entry is there to be checked - but capped at about
                        eight lines with a scrollbar, so a case held for a year (a dozen
                        entries) does not stretch the row and push the sheet off screen. */}
                    {row.solution ? (
                      <span
                        className="scroll-quiet block max-h-56 overflow-y-auto whitespace-pre-line pr-2"
                        title={row.solution}
                      >
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
                      title={t('sheet.restoreTitle')}
                      aria-label={t('sheet.restoreAria', { id: row.sourceItemId })}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-[var(--app-brand-dark)] transition hover:bg-[var(--app-brand-soft)] disabled:opacity-60"
                    >
                      <Undo2 className="h-3.5 w-3.5" />
                      {t('sheet.restore')}
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
                      title={t('sheet.editTitle')}
                      aria-label={t('sheet.editAria', { no: row.no })}
                      className="rounded-lg p-1.5 text-[var(--app-muted)] transition hover:bg-[var(--app-faint)] hover:text-[var(--app-brand-dark)]"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => askRemove(row)}
                      disabled={remove.isPending}
                      title={t('sheet.removeTitle')}
                      aria-label={t('sheet.removeAria', { no: row.no })}
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
                  {t('sheet.emptyGenerate')}
                </td>
              </tr>
            )}
            {rows.length > 0 && visible.length === 0 && (
              <tr>
                <td colSpan={(parts ? 12 : 10) + report.columns.length + 1} className="px-3 py-10 text-center text-sm text-[var(--app-muted)]">
                  {boardFilter === 'all'
                    ? t('sheet.emptyHoldAll')
                    : t('sheet.emptyHoldBoard', { board: BOARD_LABEL[boardFilter].toLowerCase() })}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-[var(--app-muted)]">
        {t(parts ? 'sheet.footnoteParts' : 'sheet.footnoteSla')}
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
