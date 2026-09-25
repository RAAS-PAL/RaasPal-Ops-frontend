'use client';

import { useState } from 'react';
import { AlertTriangle, ArrowRight, CalendarDays, Download, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { countCases, errorMessage, todayInBangkok, useCaseReport } from './CasePendingPanel';
import type { CaseReportSpec } from './CasePendingPanel';

/**
 * A pending-case sheet reduced to its counts, with a link to the rows.
 *
 * <p>The Reports tab used to print the whole sheet. What the team reads there first is how
 * many cases are open and how many are late, so the tab shows that and nothing else; the
 * rows and the tools to correct them are one click away on the details page, for the same
 * date.
 */

const TILE_TONE = {
  neutral: 'border-[var(--app-border)] bg-[var(--app-panel)] text-[var(--app-text)]',
  within: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300',
  breached: 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300',
  held: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300',
} as const;

function Tile({
  label,
  value,
  tone,
  note,
}: {
  label: string;
  value: number;
  tone: keyof typeof TILE_TONE;
  note?: string;
}) {
  return (
    <div className={`flex flex-col gap-1 rounded-xl border p-4 ${TILE_TONE[tone]}`}>
      <span className="text-xs font-semibold uppercase tracking-wide opacity-80">{label}</span>
      <span className="text-3xl font-bold tabular-nums">{value}</span>
      {note && <span className="text-xs opacity-80">{note}</span>}
    </div>
  );
}

export function CasePendingSummary({ report }: { report: CaseReportSpec }) {
  const [asOf, setAsOf] = useState<string>(todayInBangkok());
  const { query, regenerate, exportExcel } = useCaseReport(report, asOf);
  const { data: rows = [], isFetching, isError, error, refetch } = query;
  const busy = isFetching || regenerate.isPending;

  // Removed rows are kept for restoring but are not cases; count what the Excel holds.
  const counts = countCases(rows.filter((r) => !r.removed));
  const heldNote = report.heldElsewhere ? 'Held cases are listed on the On Hold tab' : undefined;

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

        <button
          type="button"
          onClick={() => exportExcel.mutate()}
          disabled={busy || exportExcel.isPending || rows.length === 0}
          title="Download this sheet as Excel, exactly as the details page shows it - corrections included."
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] px-4 py-2 text-sm font-semibold text-[var(--app-text)] transition hover:bg-[var(--app-faint)] disabled:opacity-60"
        >
          {exportExcel.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {exportExcel.isPending ? 'Preparing…' : 'Export Excel'}
        </button>

        <p className="ml-auto max-w-md text-xs text-[var(--app-muted)]">{report.hint}</p>
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

      {rows.length === 0 ? (
        !isError && (
          <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] px-4 py-10 text-center text-sm text-[var(--app-muted)]">
            {isFetching
              ? 'Generating the report. The first run for a date reads monday and can take a few minutes.'
              : 'No cases generated yet. Pick a date and press Generate.'}
          </div>
        )
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <Tile label="Total cases" value={counts.total} tone="neutral" />
            <Tile label="Within SLA" value={counts.within} tone="within" />
            <Tile label="Over SLA" value={counts.breached} tone="breached" />
            <Tile
              label={`${report.holdOwner} on hold`}
              value={counts.heldByCustomer}
              tone="held"
              note={heldNote ?? 'Status is On Hold'}
            />
            <Tile
              label="RaasPal on hold"
              value={counts.heldByRaaspal}
              tone="held"
              note={heldNote ?? 'Sup Status is On Hold'}
            />
          </div>

          {/* The tiles above should add up to the total; say what makes up any gap. */}
          {(counts.unknown > 0 || counts.heldUnsplit > 0) && (
            <p className="flex items-start gap-2 text-xs text-[var(--app-muted)]">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                {counts.unknown > 0 &&
                  `${counts.unknown} case${counts.unknown === 1 ? ' has' : 's have'} no SLA verdict (no open date or province). `}
                {counts.heldUnsplit > 0 &&
                  `${counts.heldUnsplit} held case${counts.heldUnsplit === 1 ? '' : 's'} not split between ${report.holdOwner} and RaasPal: generated before the split existed, or set to On Hold by hand. Regenerate from monday to split the unedited ones.`}
              </span>
            </p>
          )}

          <Link
            href={{ pathname: `/reports/cases/${report.slug}`, query: { date: asOf } }}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--app-brand)] bg-[var(--app-brand-soft)] px-4 py-2.5 text-sm font-semibold text-[var(--app-brand-dark)] transition hover:opacity-90"
          >
            View case details for {asOf}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </>
      )}
    </div>
  );
}
