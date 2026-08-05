'use client';

/**
 * CmReportHistoryPanel — find and reopen a past Corrective Maintenance report.
 *
 * Selecting one fetches the full record (the list serves summaries without the
 * signature images) and hands it to CmReportPanel for editing and reprinting.
 */
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ArrowLeft, Loader2, Search, Wrench } from 'lucide-react';
import { cmReportApi } from '@/lib/api';
import { formatThaiDate } from '@/lib/thai-date';
import { CmReportPanel } from '@/components/CmReportPanel';
import { EmptyState } from '@/components/ui/empty-state';
import { ListSkeleton } from '@/components/ui/skeleton';
import type { CmReportResponse } from '@/types/api';

const PAGE_SIZE = 10;

function errorMessage(e: unknown, fallback: string): string {
  const ax = e as { response?: { data?: { message?: string } } };
  return ax?.response?.data?.message ?? fallback;
}

export function CmReportHistoryPanel() {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [openId, setOpenId] = useState<string | null>(null);

  // The search hits the database on every keystroke otherwise.
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => setVisibleCount(PAGE_SIZE), [debounced]);

  const listQuery = useQuery({
    queryKey: ['cm-reports', debounced],
    queryFn: () => cmReportApi.list(debounced).then((r) => r.data.data ?? []),
  });

  const openQuery = useQuery({
    queryKey: ['cm-reports', 'detail', openId],
    queryFn: () => cmReportApi.get(openId!).then((r) => r.data.data),
    enabled: openId != null,
  });

  // ─── Detail view ────────────────────────────────────────────────────────
  if (openId) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setOpenId(null)}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--app-border)] px-3 text-sm font-semibold text-[var(--app-text)] transition hover:border-[var(--app-brand)] print:hidden"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to history
        </button>

        {openQuery.isPending && (
          <div className="flex items-center gap-2 px-1 text-sm text-[var(--app-muted)]">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading report…
          </div>
        )}
        {openQuery.isError && (
          <p className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {errorMessage(openQuery.error, 'Could not load that report.')}
          </p>
        )}
        {openQuery.data && <CmReportPanel initialReport={openQuery.data} />}
      </div>
    );
  }

  // ─── List view ──────────────────────────────────────────────────────────
  const reports = listQuery.data ?? [];
  const visible = reports.slice(0, visibleCount);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2.5 rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--app-brand-soft)] text-[var(--app-brand-dark)]">
          <Wrench className="h-4.5 w-4.5" />
        </span>
        <div>
          <p className="text-sm font-semibold text-[var(--app-text)]">Past reports</p>
          <p className="text-xs text-[var(--app-muted)]">
            Search by ticket number, customer, or serial number. Open one to edit or reprint it.
          </p>
        </div>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--app-muted)]" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search ticket no., customer, or serial number…"
          className="h-10 w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-panel-alt)] pl-9 pr-3 text-sm text-[var(--app-text)] outline-none focus:border-[var(--app-brand)]"
        />
      </div>

      {listQuery.isPending && <ListSkeleton />}

      {listQuery.isError && (
        <p className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {errorMessage(listQuery.error, 'Could not load the report history.')}
        </p>
      )}

      {listQuery.isSuccess && reports.length === 0 && (
        <EmptyState
          icon={Wrench}
          title={debounced ? 'No matching reports' : 'No reports yet'}
          description={
            debounced
              ? 'Try a different ticket number, customer, or serial number.'
              : 'Create one from the "New report" tab and it will appear here.'
          }
        />
      )}

      {visible.length > 0 && (
        <div className="divide-y divide-[var(--app-border)] overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)]">
          {visible.map((r: CmReportResponse) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setOpenId(r.id)}
              className="flex w-full items-center gap-4 px-4 py-3 text-left transition hover:bg-[var(--app-panel-alt)]"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[var(--app-text)]">
                  {r.customerName}
                </p>
                <p className="truncate text-xs text-[var(--app-muted)]">
                  {[r.ticketNo && `Ticket ${r.ticketNo}`, r.robotModel, r.serialNumber]
                    .filter(Boolean)
                    .join(' · ') || '—'}
                </p>
              </div>
              <span className="shrink-0 text-xs text-[var(--app-muted)]">
                {formatThaiDate(r.reportDate)}
              </span>
            </button>
          ))}
        </div>
      )}

      {reports.length > visibleCount && (
        <button
          type="button"
          onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
          className="mx-auto flex h-9 items-center rounded-lg border border-[var(--app-border)] px-4 text-sm font-semibold text-[var(--app-text)] transition hover:border-[var(--app-brand)]"
        >
          Load more ({reports.length - visibleCount} more)
        </button>
      )}
    </div>
  );
}
