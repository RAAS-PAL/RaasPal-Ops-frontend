'use client';

import { AlertTriangle, ArrowRight, Download, Loader2, RefreshCw } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { type Period, describePeriod } from '@/lib/casePeriod';
import type { CaseBoard, CaseReportRow, CaseReportRunInfo } from '@/types/api';
import { boldText, countCases, errorMessage, useCaseReport } from './CasePendingPanel';
import type { CaseReportSpec } from './CasePendingPanel';

/**
 * A pending-case report as the Reports tab shows it: one card per report, its counts, and
 * the way to its rows.
 *
 * <p>The Reports tab used to print the whole sheet. What the team reads there first is how
 * many cases are open and how many are late, so the tab shows that and nothing else; the
 * rows and the tools to correct them are one click away on the details page, for the same
 * date.
 *
 * <p>One card, not several: the header says what and when, the body is divided by
 * hairlines, and nothing inside is lifted off the page again - a report built of floating
 * boxes reads as several reports.
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
  other: 'border-transparent bg-[var(--app-bg)]',
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
  const t = useTranslations('pendingCases');
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
          title={t('counts.sliceTitle', {
            label: p.label,
            value: p.value,
            total,
            percent: Math.round((p.value / total) * 100),
          })}
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

/** The small secondary button of a report card's header. */
export const cardButton =
  'inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)] px-3 text-sm font-semibold text-[var(--app-text)] transition-colors duration-150 hover:bg-[var(--app-faint)] disabled:cursor-not-allowed disabled:opacity-50';

/**
 * Whether the numbers can still move: "Live" for today, whose sheets refresh from monday
 * every 15 minutes, and "Final" for a past day.
 */
export function LiveBadge({ live, info }: { live: boolean; info?: CaseReportRunInfo | null }) {
  const t = useTranslations('pendingCases');
  const at = info?.exists && info.generatedAt ? new Date(info.generatedAt) : null;
  const time =
    at && !Number.isNaN(at.getTime())
      ? at.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok' })
      : null;
  return live ? (
    <span
      title={t('badge.liveTitle')}
      className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900"
    >
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-emerald-500 motion-safe:animate-pulse" />
      {time ? t('badge.liveUpdated', { time }) : t('badge.live')}
    </span>
  ) : (
    <span
      title={t('badge.finalTitle')}
      className="inline-flex items-center rounded-full bg-[var(--app-bg)] px-2 py-0.5 text-xs font-semibold text-[var(--app-muted)] ring-1 ring-inset ring-[var(--app-border-strong)]"
    >
      {time ? t('badge.finalUpdated', { time }) : t('badge.final')}
    </span>
  );
}

/**
 * The one card a report lives in: title, what the period means and whether it is live in
 * the header, actions on the right, and each child a band divided from the next by a
 * hairline.
 */
export function ReportCard({
  title,
  subtitle,
  badge,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="divide-y divide-[var(--app-border)] rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)]">
      <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-3.5 sm:px-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-[var(--app-text)]">{title}</h2>
            {badge}
          </div>
          {subtitle && <p className="mt-0.5 text-sm text-[var(--app-muted)]">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </section>
  );
}

/** A band of a report card, padded to the header's edges. */
export function CardBand({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`px-4 py-4 sm:px-5 ${className}`}>{children}</div>;
}

export function CardError({ error, fallback }: { error: unknown; fallback: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-inset ring-red-200 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{errorMessage(error, fallback)}</span>
    </div>
  );
}

/**
 * The counts of a set of cases: Total as the headline, a bar of what it is made of, and
 * its two parts - the customer's holds and RAASPAL Pending (Within and Over SLA inside).
 * Drawn flat, to sit inside a report card; used for one sheet and for the combined views
 * (Internal, PCS, ...) alike.
 *
 * @param rows      the cases, removed rows already left out
 * @param holdOwner whose hold the on-hold box names: "MK on hold"
 * @param heldNote  says where held cases went when this set has none by design
 */
export function CaseCountsCard({
  rows,
  holdOwner,
  heldNote,
}: {
  rows: CaseReportRow[];
  holdOwner: string;
  heldNote?: string;
}) {
  const t = useTranslations('pendingCases');
  const counts = countCases(rows);
  // "Customer" is the generic owner of a sheet's holds; the others are names (MK, Makro, …).
  const owner = holdOwner === 'Customer' ? t('owner.customer') : holdOwner;

  // The total's parts, in the order the boxes and the bar show them. The last two of
  // RAASPAL Pending appear only when there is something in them.
  const held: Part = { slice: 'held', label: t('counts.heldOwner', { owner }), value: counts.heldByCustomer };
  const pendingParts: Part[] = [
    { slice: 'within', label: t('sla.WITHIN'), value: counts.within },
    { slice: 'breached', label: t('sla.BREACHED'), value: counts.breached },
    ...(counts.heldByRaaspal > 0
      ? [{ slice: 'other' as const, label: t('counts.supOnHold'), value: counts.heldByRaaspal }]
      : []),
    ...(counts.unknown > 0 ? [{ slice: 'other' as const, label: t('counts.noVerdict'), value: counts.unknown }] : []),
  ];
  // Held rows from before the owner was recorded: in the total, in neither part.
  const unsplit: Part[] =
    counts.heldUnsplit > 0 ? [{ slice: 'other', label: t('counts.unsplit'), value: counts.heldUnsplit }] : [];

  return (
    <div className="@container space-y-4">
      {/* Total is the headline and the bar shows what it is made of; below, its two
          parts - the customer's holds and RAASPAL Pending - each sized to what it holds.
          Within and Over SLA are parts of RAASPAL Pending, not totals beside it: both are
          cases waiting on RAASPAL, only one of them is late. */}
      <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
        <div className="shrink-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--app-muted)]">{t('counts.total')}</p>
          <p className="mt-1 text-4xl font-semibold leading-none tabular-nums text-[var(--app-text)]">{counts.total}</p>
        </div>
        <div className="min-w-[14rem] flex-1 space-y-2 pb-0.5">
          <p className="text-sm text-[var(--app-muted)]">
            {t.rich('counts.summary', {
              held: counts.heldByCustomer,
              owner,
              pending: counts.raaspalPending,
              b: boldText,
            })}
          </p>
          {counts.total > 0 && <CompositionBar parts={[held, ...pendingParts, ...unsplit]} total={counts.total} />}
        </div>
      </div>

      <div className="grid gap-3 @3xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div className={`flex flex-col justify-center gap-1 rounded-lg border p-4 ${BOX_TONE.held}`}>
          <PartLabel part={held} />
          <span className="text-3xl font-semibold tabular-nums text-[var(--app-text)]">{held.value}</span>
          <span className="text-xs text-[var(--app-muted)]">{heldNote ?? t('counts.heldNote')}</span>
        </div>

        <div className="@container flex flex-col gap-3 rounded-lg bg-[var(--app-bg)] p-4 @xl:flex-row @xl:items-center">
          <div className="shrink-0 @xl:w-44">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--app-muted)]">{t('counts.raaspalPending')}</p>
            <p className="mt-1 text-3xl font-semibold tabular-nums text-[var(--app-text)]">{counts.raaspalPending}</p>
            <p className="text-xs text-[var(--app-muted)]">{t('counts.pendingSub')}</p>
          </div>
          <div className="grid flex-1 gap-2 @sm:grid-cols-2">
            {pendingParts.map((part) => (
              <SubBox key={part.label} part={part} />
            ))}
          </div>
        </div>
      </div>

      {/* The boxes above should add up to the total; say what makes up any gap. */}
      {(counts.unknown > 0 || counts.heldUnsplit > 0) && (
        <p className="flex items-start gap-2 text-xs text-[var(--app-muted)]">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            {counts.unknown > 0 && `${t('counts.noVerdictGap', { count: counts.unknown })} `}
            {counts.heldUnsplit > 0 && t('counts.unsplitGap', { count: counts.heldUnsplit, owner })}
          </span>
        </p>
      )}
    </div>
  );
}

/**
 * One pending sheet for the period's day, as one report card: counts in the body, and
 * Regenerate, Excel and the rows' details page in the header.
 *
 * @param title the report's name on this tab: "MK", "On Hold", "AOTGA — from monday"
 * @param board On Hold only: count one board's cases. The Excel and the details page stay
 *              whole-sheet, as the details page's own board filter does.
 */
export function CasePendingSummary({
  report,
  title,
  period,
  board,
}: {
  report: CaseReportSpec;
  title: string;
  period: Period;
  board?: CaseBoard;
}) {
  const t = useTranslations('pendingCases');
  const tPeriod = useTranslations('pendingCases.period');
  const locale = useLocale();
  const asOf = period.asOf;
  const { query, regenerate, exportExcel, runInfo, live } = useCaseReport(report, asOf);
  const { data: rows = [], isFetching, isError, error } = query;
  const busy = isFetching || regenerate.isPending;

  // Removed rows are kept for restoring but are not cases; count what the Excel holds.
  const sheet = rows.filter((r) => !r.removed && (board === undefined || r.board === board));
  const heldNote = report.heldElsewhere ? t('counts.heldElsewhere') : undefined;
  const failure = isError ? error : regenerate.isError ? regenerate.error : exportExcel.isError ? exportExcel.error : null;

  return (
    <ReportCard
      title={title}
      subtitle={describePeriod(period, tPeriod, locale)}
      badge={rows.length > 0 ? <LiveBadge live={live} info={runInfo} /> : undefined}
      actions={
        <>
          <button
            type="button"
            onClick={() => regenerate.mutate()}
            disabled={busy || rows.length === 0 || !live}
            aria-label={t('summary.regenerateAria')}
            title={live ? t('summary.regenerateLive') : t('summary.regeneratePast')}
            className={cardButton}
          >
            {regenerate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span className="hidden sm:inline">{regenerate.isPending ? t('summary.regenerating') : t('summary.regenerate')}</span>
          </button>
          <button
            type="button"
            onClick={() => exportExcel.mutate()}
            disabled={busy || exportExcel.isPending || rows.length === 0}
            title={t('summary.excelTitle')}
            className={cardButton}
          >
            {exportExcel.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {t('summary.excel')}
          </button>
          {rows.length > 0 && (
            <Link
              href={{ pathname: `/reports/cases/${report.slug}`, query: { date: asOf } }}
              className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-[var(--app-brand)] px-3 text-sm font-semibold text-white shadow-sm transition-opacity duration-150 hover:opacity-90"
            >
              {t('summary.caseDetails')}
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </>
      }
    >
      {failure !== null && (
        <CardBand>
          <CardError
            error={failure}
            fallback={t('summary.loadFailed')}
          />
        </CardBand>
      )}

      {rows.length === 0 ? (
        !isError && (
          <CardBand className="py-10 text-center text-sm text-[var(--app-muted)]">
            {isFetching ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('summary.loading')}
              </span>
            ) : (
              t('summary.empty')
            )}
          </CardBand>
        )
      ) : (
        <CardBand>
          {board && (
            <p className="mb-3 text-xs text-[var(--app-muted)]">
              {t('summary.boardOnly', { board: board === 'CLEANING' ? 'cleaning' : 'delivery' })}
            </p>
          )}
          <CaseCountsCard rows={sheet} holdOwner={report.holdOwner} heldNote={heldNote} />
        </CardBand>
      )}

      <CardBand className="py-3 text-xs text-[var(--app-muted)]">{t(report.hintKey)}</CardBand>
    </ReportCard>
  );
}
