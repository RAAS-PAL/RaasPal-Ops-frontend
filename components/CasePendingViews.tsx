'use client';

import { Fragment, useState } from 'react';
import { useMutation, useQueries } from '@tanstack/react-query';
import { ArrowRight, ChevronDown, ChevronRight, Download, Info, Loader2, Search } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import type { CaseReportSlug } from '@/lib/api';
import {
  type CaseCustomerView,
  type CaseScope,
  type Section,
  type Sheets,
  NEEDS,
  SHEET_LABEL,
  compose,
  inScope,
} from '@/lib/caseCustomerViews';
import { type Period, describePeriod } from '@/lib/casePeriod';
import type { CaseBoard, CaseReportRow } from '@/types/api';
import { AotSheetHelp, AotSheetPanel } from './AotSheetPanel';
import {
  BOARD_IDS,
  CASE_REPORTS,
  SlaCell,
  TicketLink,
  caseSheetQuery,
  countCases,
  downloadCaseSheet,
  errorMessage,
  todayInBangkok,
} from './CasePendingPanel';
import { CardBand, CardError, CaseCountsCard, CasePendingSummary, LiveBadge, ReportCard } from './CasePendingSummary';

/**
 * The pending cases per customer, drawn from the rules in `lib/caseCustomerViews`, each as
 * one report card: header, a strip of totals when there is more than one section, then
 * each section as a band of the same card.
 */

const VIEW_TITLE: Record<CaseCustomerView, string> = {
  internal: 'Internal',
  pcs: 'PCS',
  makro: 'Makro',
  its: 'ITS',
};

/** "Internal — all open cases", "Internal — cleaning", "PCS — delivery". */
function titleOf(view: CaseCustomerView, scope: CaseScope): string {
  if (scope === 'CLEANING') return `${VIEW_TITLE[view]} — cleaning`;
  if (scope === 'DELIVERY') return `${VIEW_TITLE[view]} — delivery`;
  return view === 'internal' ? 'Internal — all open cases' : VIEW_TITLE[view];
}

const rowsOf = (section: Section): CaseReportRow[] => section.parts.flatMap((part) => part.rows);

/** The sheets a section's rows came from, with how many each gave, merged by sheet. */
function sources(section: Section): { sheet: CaseReportSlug; count: number }[] {
  const counts = new Map<CaseReportSlug, number>();
  for (const part of section.parts) {
    counts.set(part.sheet, (counts.get(part.sheet) ?? 0) + part.rows.length);
  }
  // On Hold last: it holds both boards' held cases, so it belongs after the per-board sheets.
  return [...counts]
    .filter(([, count]) => count > 0)
    .sort(([a], [b]) => Number(a === 'on-hold') - Number(b === 'on-hold'))
    .map(([sheet, count]) => ({ sheet, count }));
}

/** One sheet a section is made of: a row of a compact list, with its details and Excel. */
function SheetSource({ sheet, count, asOf }: { sheet: CaseReportSlug; count: number; asOf: string }) {
  const exportExcel = useMutation({ mutationFn: () => downloadCaseSheet(sheet, asOf) });
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm">
      <span className="font-medium text-[var(--app-text)]">{SHEET_LABEL[sheet]}</span>
      <span className="tabular-nums text-[var(--app-muted)]">
        {count} case{count === 1 ? '' : 's'}
      </span>
      <span className="ml-auto flex items-center gap-1">
        <Link
          href={{ pathname: `/reports/cases/${sheet}`, query: { date: asOf } }}
          className="inline-flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 font-semibold text-[var(--app-brand-dark)] transition-colors duration-150 hover:bg-[var(--app-brand-soft)]"
        >
          Details <ArrowRight className="h-3.5 w-3.5" />
        </Link>
        <button
          type="button"
          onClick={() => exportExcel.mutate()}
          disabled={exportExcel.isPending}
          title={`Download the ${SHEET_LABEL[sheet]} sheet for this day as Excel - every case on it, corrections included.`}
          className="inline-flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 font-semibold text-[var(--app-text)] transition-colors duration-150 hover:bg-[var(--app-faint)] disabled:opacity-60"
        >
          {exportExcel.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Download className="h-3.5 w-3.5" />
          )}
          Excel
        </button>
      </span>
      {exportExcel.isError && (
        <span className="w-full text-xs text-red-700 dark:text-red-300">
          {errorMessage(exportExcel.error, 'Could not download the sheet.')}
        </span>
      )}
    </li>
  );
}

const BOARD_LABEL: Record<CaseBoard, string> = { CLEANING: 'Cleaning', DELIVERY: 'Delivery' };

/** A case and where it came from, for the combined list. */
interface Entry {
  row: CaseReportRow;
  sheet: CaseReportSlug;
  board: CaseBoard;
}

/**
 * Every case of the view in one table, oldest first, so a combined view is read here and
 * not sheet by sheet. Read-only: each row names its sheet, and the sheet's details page is
 * where a case is corrected.
 */
function CaseList({ entries, asOf }: { entries: Entry[]; asOf: string }) {
  const [search, setSearch] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [open, setOpen] = useState<Set<string>>(new Set());

  const sorted = [...entries].sort((a, b) => (a.row.openDate ?? '9999').localeCompare(b.row.openDate ?? '9999'));
  // Every word must appear somewhere in the case: "mk pudu 2026-09" narrows three ways.
  const words = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const matching = words.length
    ? sorted.filter(({ row, sheet, board }) => {
        const text = [
          row.project,
          row.branch,
          row.robot,
          row.serialNumber,
          row.problem,
          row.solution,
          row.openDate,
          row.slaLabel,
          SHEET_LABEL[sheet],
          BOARD_LABEL[board],
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return words.every((w) => text.includes(w));
      })
    : sorted;
  // A search shows every match; otherwise the oldest ten until asked for the rest.
  const shown = showAll || words.length ? matching : matching.slice(0, PREVIEW_ROWS);
  const keyOf = ({ row, sheet }: Entry, i: number) => `${sheet}-${row.sourceItemId ?? row.no}-${row.serialNumber ?? i}`;
  const toggle = (key: string) =>
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const th = 'px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--app-muted)]';
  const td = 'px-3 py-2 align-top text-[var(--app-text)]';
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <label className="relative min-w-[16rem] flex-1 sm:max-w-md">
          <span className="sr-only">Search cases</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--app-muted)]" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer, branch, robot, S/N, problem…"
            className="h-9 w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)] pl-9 pr-3 text-sm text-[var(--app-text)]"
          />
        </label>
        <span className="text-xs text-[var(--app-muted)]">
          {words.length
            ? `${matching.length} of ${sorted.length} match`
            : `${shown.length} of ${sorted.length} · click a case for its details`}
        </span>
      </div>
      <div className="overflow-x-auto rounded-lg ring-1 ring-inset ring-[var(--app-border)]">
        <table className="w-full min-w-[64rem] text-sm">
          <thead className="shadow-[inset_0_-1px_0_var(--app-border)]">
            <tr>
              <th className="w-8 px-2" />
              <th className={th}>No</th>
              <th className={th}>Board</th>
              <th className={th}>Customer</th>
              <th className={th}>Branch</th>
              <th className={th}>Robot</th>
              <th className={th}>S/N</th>
              <th className={th}>Problem</th>
              <th className={th}>Open date</th>
              <th className={`${th} text-right`}>Days</th>
              <th className={th}>SLA</th>
              <th className={th}>Sheet</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--app-border)]">
            {shown.map((entry, i) => {
              const { row, sheet, board } = entry;
              const key = keyOf(entry, i);
              const expanded = open.has(key);
              return (
                <Fragment key={key}>
                  <tr
                    onClick={() => toggle(key)}
                    aria-expanded={expanded}
                    className={`cursor-pointer transition-colors duration-150 hover:bg-[var(--app-faint)] ${expanded ? 'bg-[var(--app-faint)]' : ''}`}
                  >
                    <td className="px-2 py-2 align-top text-[var(--app-muted)]">
                      <ChevronRight
                        className={`h-4 w-4 transition-transform duration-150 ${expanded ? 'rotate-90' : ''}`}
                      />
                    </td>
                    <td className={`${td} tabular-nums text-[var(--app-muted)]`}>{i + 1}</td>
                    <td
                      className={`${td} whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-[var(--app-muted)]`}
                    >
                      {BOARD_LABEL[board]}
                    </td>
                    <td className={`${td} font-medium`}>{row.project ?? '—'}</td>
                    <td className={`${td} max-w-[14rem]`}>{row.branch ?? '—'}</td>
                    <td className={`${td} whitespace-nowrap`}>{row.robot ?? '—'}</td>
                    <td className={`${td} font-mono text-xs`}>{row.serialNumber ?? '—'}</td>
                    <td className={`${td} max-w-[18rem]`}>
                      <span className="line-clamp-2" title={row.problem ?? undefined}>
                        {row.problem ?? '—'}
                      </span>
                    </td>
                    <td className={`${td} whitespace-nowrap tabular-nums`}>{row.openDate ?? '—'}</td>
                    <td className={`${td} text-right font-semibold tabular-nums`}>{row.days ?? '—'}</td>
                    <td className={td}>
                      <SlaCell row={row} />
                    </td>
                    <td className={`${td} whitespace-nowrap`}>
                      <span className="inline-flex items-center gap-2">
                        <Link
                          href={{ pathname: `/reports/cases/${sheet}`, query: { date: asOf } }}
                          onClick={(e) => e.stopPropagation()}
                          title="Open this sheet to correct the case"
                          className="cursor-pointer font-semibold text-[var(--app-brand-dark)] hover:underline"
                        >
                          {SHEET_LABEL[sheet]}
                        </Link>
                        <span onClick={(e) => e.stopPropagation()}>
                          <TicketLink row={row} boardId={BOARD_IDS[board]} />
                        </span>
                      </span>
                    </td>
                  </tr>
                  {expanded && (
                    <tr className="bg-[var(--app-faint)]">
                      <td />
                      <td colSpan={11} className="px-3 pb-4 pt-1">
                        <CaseDetails row={row} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {shown.length === 0 && (
              <tr>
                <td colSpan={12} className="px-3 py-8 text-center text-sm text-[var(--app-muted)]">
                  {words.length ? 'No case matches the search.' : 'No open cases.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {!words.length && matching.length > PREVIEW_ROWS && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-semibold text-[var(--app-brand-dark)] transition-colors duration-150 hover:bg-[var(--app-brand-soft)]"
        >
          <ChevronDown className={`h-4 w-4 transition-transform duration-150 ${showAll ? 'rotate-180' : ''}`} />
          {showAll ? 'Show the oldest 10 only' : `Show all ${matching.length} cases`}
        </button>
      )}
    </div>
  );
}

/** How many cases the list shows before "Show all". */
const PREVIEW_ROWS = 10;

/** One case opened in the list: the text the table clamps, and what the sheet adds. */
function CaseDetails({ row }: { row: CaseReportRow }) {
  const parts = row.requiredPart || row.waiting || row.waitingFrom || row.partReceived;
  const item = (label: string, value: React.ReactNode) =>
    value ? (
      <div>
        <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--app-muted)]">{label}</dt>
        <dd className="mt-0.5 whitespace-pre-line text-[var(--app-text)]">{value}</dd>
      </div>
    ) : null;
  return (
    <dl className="grid gap-3 rounded-lg bg-[var(--app-panel)] p-4 text-sm ring-1 ring-inset ring-[var(--app-border)] md:grid-cols-2">
      <div className="md:col-span-2">{item('Problem', row.problem ?? '—')}</div>
      {row.solution && <div className="md:col-span-2">{item('Solution / progress', row.solution)}</div>}
      {parts && (
        <>
          {item('Required part', row.requiredPart)}
          {item('Waiting', row.waiting)}
          {item('Waiting from', row.waitingFrom)}
          {item('Part received', row.partReceived)}
          {item('Aging after received', row.agingAfterReceived != null ? `${row.agingAfterReceived} days` : null)}
        </>
      )}
      {/* Open date and SLA are already in the row; these are what the table leaves out. */}
      {item('RE on site', row.reOnSite)}
      {item('Province', row.province)}
    </dl>
  );
}

/** One section as a band of the report card: its name, its counts, every case, and its sheets. */
function SectionBand({ section, asOf, showTitle }: { section: Section; asOf: string; showTitle: boolean }) {
  const rows = rowsOf(section);
  const from = sources(section);
  const entries: Entry[] = section.parts.flatMap((part) =>
    part.rows.map((row) => ({ row, sheet: part.sheet, board: part.board })),
  );
  return (
    <CardBand className="space-y-4">
      {showTitle && (
        <h3 className="flex items-baseline gap-2 text-base font-semibold text-[var(--app-text)]">
          {section.title}
          <span className="text-sm font-normal tabular-nums text-[var(--app-muted)]">
            {rows.length} case{rows.length === 1 ? '' : 's'}
          </span>
        </h3>
      )}
      <CaseCountsCard rows={rows} holdOwner={section.holdOwner} />
      <div className="space-y-1.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--app-muted)]">
          All {rows.length} case{rows.length === 1 ? '' : 's'}, oldest first
        </p>
        <CaseList entries={entries} asOf={asOf} />
      </div>
      {from.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--app-muted)]">
            Correct a case, or download the Excel, on its sheet
          </p>
          <ul className="divide-y divide-[var(--app-border)] rounded-lg ring-1 ring-inset ring-[var(--app-border)]">
            {from.map((s) => (
              <SheetSource key={s.sheet} sheet={s.sheet} count={s.count} asOf={asOf} />
            ))}
          </ul>
        </div>
      )}
    </CardBand>
  );
}

/**
 * The split of a combined view by board, as two numbers that also narrow the view: click
 * Delivery to see only delivery. Shown on Both, above the one combined section.
 */
function BoardStrip({ sections, onPick }: { sections: Section[]; onPick?: (scope: CaseScope) => void }) {
  return (
    <div className="grid grid-cols-1 divide-y divide-[var(--app-border)] bg-[var(--app-bg)] sm:grid-cols-2 sm:divide-x sm:divide-y-0">
      {sections.map((section) => {
        const c = countCases(rowsOf(section));
        const board = section.parts[0]?.board;
        const body = (
          <>
            <span className="block text-xs font-semibold uppercase tracking-wide text-[var(--app-muted)]">
              {section.title}
            </span>
            <span className="mt-0.5 block text-3xl font-semibold tabular-nums text-[var(--app-text)]">{c.total}</span>
            <span className="block text-xs text-[var(--app-muted)]">
              <span className="font-semibold text-red-700 dark:text-red-300">{c.breached}</span> over SLA ·{' '}
              <span className="font-semibold text-[var(--app-text)]">{c.heldByCustomer}</span> on hold with customer
            </span>
          </>
        );
        return onPick && board ? (
          <button
            key={section.key}
            type="button"
            onClick={() => onPick(board)}
            title={`Show only ${section.title.toLowerCase()}`}
            className="cursor-pointer px-4 py-3 text-left transition-colors duration-150 hover:bg-[var(--app-faint)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--app-brand)] sm:px-5"
          >
            {body}
          </button>
        ) : (
          <div key={section.key} className="px-4 py-3 sm:px-5">
            {body}
          </div>
        );
      })}
    </div>
  );
}

export function CaseCustomerPanel({
  view,
  period,
  scope = 'BOTH',
  onScopeChange,
}: {
  view: CaseCustomerView;
  period: Period;
  /** Both boards, or only cleaning or delivery cases. */
  scope?: CaseScope;
  /** Lets the board split on Both narrow the view to one board. */
  onScopeChange?: (next: CaseScope) => void;
}) {
  const asOf = period.asOf;
  const slugs = NEEDS[view];
  const results = useQueries({ queries: slugs.map((slug) => caseSheetQuery(slug, asOf)) });
  const loading = results.some((r) => r.isPending);
  const failed = results.find((r) => r.isError);
  const live = asOf === todayInBangkok();

  let body: React.ReactNode;
  if (failed) {
    body = (
      <CardBand>
        <CardError
          error={failed.error}
          fallback="Could not load the pending sheets. Check that the backend is running and that MONDAY_API_TOKEN is set."
        />
      </CardBand>
    );
  } else if (loading) {
    body = (
      <CardBand className="flex items-center justify-center gap-2 py-10 text-sm text-[var(--app-muted)]">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading {slugs.length} sheets. A day read for the first time comes from monday and can take a few minutes.
      </CardBand>
    );
  } else {
    const sheets: Sheets = Object.fromEntries(slugs.map((slug, i) => [slug, results[i].data ?? []]));
    const composed = compose(view, sheets);
    const scoped = inScope(composed.sections, scope);
    // Both is one report, not two side by side: on Internal the Delivery and Cleaning
    // sections become one set of counts over all the cases, and the split by board is
    // the strip above it. One board shows that board's section alone.
    const combine = view === 'internal' && scope === 'BOTH' && scoped.length > 1;
    const sections: Section[] = combine
      ? [{ key: 'all', title: 'All open cases', holdOwner: 'Customer', parts: scoped.flatMap((s) => s.parts) }]
      : scoped;
    body = (
      <>
        {composed.notes.length > 0 && (
          <CardBand className="space-y-2 py-3">
            {composed.notes.map((note) => (
              <p key={note} className="flex items-start gap-2 text-sm text-[var(--app-text)]">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                {note}
              </p>
            ))}
          </CardBand>
        )}
        {combine && <BoardStrip sections={scoped} onPick={onScopeChange} />}
        {sections.map((section) => (
          <SectionBand key={section.key} section={section} asOf={asOf} showTitle={sections.length > 1} />
        ))}
      </>
    );
  }

  return (
    <ReportCard
      title={titleOf(view, scope)}
      subtitle={describePeriod(period)}
      badge={!loading && !failed ? <LiveBadge live={live} /> : undefined}
    >
      {body}
    </ReportCard>
  );
}

/**
 * AOT: the airports' cases from both places they are logged, as two cards. The monday
 * AOTGA sheet has history, so it follows the period; AOT's own Google Sheet is read beside
 * it once linked, and its link, columns and setup guide live in its card.
 */
export function CaseAotPanel({ period }: { period: Period }) {
  return (
    <div className="space-y-5">
      <CasePendingSummary report={CASE_REPORTS.aotga} title="AOTGA — from monday" period={period} />
      <ReportCard
        title="AOT Google Sheet"
        subtitle="AOT logs its cases in its own sheet. RAASPAL only reads it; the link stays until someone presses Remove link."
        actions={<AotSheetHelp />}
      >
        <CardBand>
          <AotSheetPanel asOf={period.asOf} />
        </CardBand>
      </ReportCard>
    </div>
  );
}
