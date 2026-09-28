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

/**
 * One colour per slice of the total. The bar and the box a slice belongs to share it,
 * so each box's swatch is the bar's legend entry. Checked with the dataviz palette
 * validator in both modes - light amber/emerald/red 500 on white, dark amber 600 /
 * emerald 600 / red 500 on the dark panel: neighbouring slices stay apart under
 * red-green colour blindness, helped by the 2px surface gap between them. Text never
 * takes these colours; it stays in the app's ink so it reads in either mode.
 */
const SLICE = {
  held: 'bg-amber-500 dark:bg-amber-600',
  within: 'bg-emerald-500 dark:bg-emerald-600',
  breached: 'bg-red-500',
  other: 'bg-slate-400 dark:bg-slate-500',
} as const;
type Slice = keyof typeof SLICE;

/** The soft fill behind a box, so the verdict reads at a glance as it did before. */
const BOX_TONE: Record<Slice, string> = {
  held: 'border-amber-200 bg-amber-50/70 dark:border-amber-900 dark:bg-amber-950/30',
  within: 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-900 dark:bg-emerald-950/30',
  breached: 'border-red-200 bg-red-50/70 dark:border-red-900 dark:bg-red-950/30',
  other: 'border-[var(--app-border)] bg-[var(--app-bg)]',
};

interface Part {
  slice: Slice;
  label: string;
  value: number;
}

function Swatch({ slice }: { slice: Slice }) {
  return <span aria-hidden className={`inline-block h-2.5 w-2.5 shrink-0 rounded-sm ${SLICE[slice]}`} />;
}

function PartLabel({ part }: { part: Part }) {
  return (
    <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--app-muted)]">
      <Swatch slice={part.slice} />
      {part.label}
    </span>
  );
}

/**
 * The total as one bar split into its parts, in the order of the boxes below. Sized by
 * flex-grow so the 2px gaps come out of the width instead of pushing the last slice
 * off the end; a slice of one case in hundreds keeps a 4px minimum so it stays visible.
 */
function CompositionBar({ parts, total }: { parts: Part[]; total: number }) {
  const shown = parts.filter((p) => p.value > 0);
  return (
    <div
      role="img"
      aria-label={shown.map((p) => `${p.label}: ${p.value}`).join(', ')}
      className="flex h-3 w-full gap-[2px] overflow-hidden rounded-full"
    >
      {shown.map((p) => (
        <div
          key={p.label}
          title={`${p.label}: ${p.value} of ${total} (${Math.round((p.value / total) * 100)}%)`}
          className={`min-w-1 basis-0 ${SLICE[p.slice]}`}
          style={{ flexGrow: p.value }}
        />
      ))}
    </div>
  );
}

/** One of RAASPAL Pending's parts: a compact box, number to the right of its label. */
function SubBox({ part }: { part: Part }) {
  return (
    <div className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 ${BOX_TONE[part.slice]}`}>
      <PartLabel part={part} />
      <span className="text-2xl font-semibold text-[var(--app-text)]">{part.value}</span>
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

  // The total's parts, in the order the boxes and the bar show them. The last two of
  // RAASPAL Pending appear only when there is something in them.
  const held: Part = { slice: 'held', label: `${report.holdOwner} on hold`, value: counts.heldByCustomer };
  const pendingParts: Part[] = [
    { slice: 'within', label: 'Within SLA', value: counts.within },
    { slice: 'breached', label: 'Over SLA', value: counts.breached },
    ...(counts.heldByRaaspal > 0
      ? [{ slice: 'other' as const, label: 'Sup Status On Hold', value: counts.heldByRaaspal }]
      : []),
    ...(counts.unknown > 0 ? [{ slice: 'other' as const, label: 'No SLA verdict', value: counts.unknown }] : []),
  ];
  // Held rows from before the owner was recorded: in the total, in neither part.
  const unsplit: Part[] =
    counts.heldUnsplit > 0 ? [{ slice: 'other', label: 'On hold, owner not recorded', value: counts.heldUnsplit }] : [];

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
          {/* One card. Total is the headline and the bar shows what it is made of; below,
              its two parts - the customer's holds and RAASPAL Pending - each sized to what
              it holds. Within and Over SLA are parts of RAASPAL Pending, not totals
              beside it: both are cases waiting on RAASPAL, only one of them is late. */}
          <section className="@container rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-4 sm:p-5">
            <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
              <div className="shrink-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--app-muted)]">Total cases</p>
                <p className="mt-1 text-5xl font-semibold leading-none text-[var(--app-text)]">{counts.total}</p>
              </div>
              <div className="min-w-[14rem] flex-1 space-y-2 pb-0.5">
                <p className="text-sm text-[var(--app-muted)]">
                  <span className="font-semibold text-[var(--app-text)]">{counts.heldByCustomer}</span> on hold with{' '}
                  {report.holdOwner} &middot;{' '}
                  <span className="font-semibold text-[var(--app-text)]">{counts.raaspalPending}</span> RAASPAL Pending
                </p>
                <CompositionBar parts={[held, ...pendingParts, ...unsplit]} total={counts.total} />
              </div>
            </div>

            <div className="mt-4 grid gap-3 @3xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
              <div className={`flex flex-col justify-center gap-1 rounded-xl border p-4 ${BOX_TONE.held}`}>
                <PartLabel part={held} />
                <span className="text-3xl font-semibold text-[var(--app-text)]">{held.value}</span>
                <span className="text-xs text-[var(--app-muted)]">
                  {heldNote ?? 'Status is On Hold: waiting on the customer'}
                </span>
              </div>

              <div className="@container flex flex-col gap-3 rounded-xl border border-[var(--app-border)] p-4 @xl:flex-row @xl:items-center">
                <div className="shrink-0 @xl:w-48">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--app-muted)]">RAASPAL Pending</p>
                  <p className="mt-1 text-3xl font-semibold text-[var(--app-text)]">{counts.raaspalPending}</p>
                  <p className="text-xs text-[var(--app-muted)]">Technician schedule or spare parts</p>
                </div>
                <div className="grid flex-1 gap-2 @sm:grid-cols-2">
                  {pendingParts.map((part) => (
                    <SubBox key={part.label} part={part} />
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* The tiles above should add up to the total; say what makes up any gap. */}
          {(counts.unknown > 0 || counts.heldUnsplit > 0) && (
            <p className="flex items-start gap-2 text-xs text-[var(--app-muted)]">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                {counts.unknown > 0 &&
                  `${counts.unknown} case${counts.unknown === 1 ? ' has' : 's have'} no SLA verdict (no open date or province). `}
                {counts.heldUnsplit > 0 &&
                  `${counts.heldUnsplit} held case${counts.heldUnsplit === 1 ? ' is' : 's are'} in neither count: generated before ${report.holdOwner} on hold and RAASPAL Pending were told apart, or set to On Hold by hand. Regenerate from monday to sort the unedited ones.`}
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
