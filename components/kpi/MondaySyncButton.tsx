'use client';

/**
 * Pulls the Cleaning, Delivery and Installation boards into `case_ticket`.
 *
 * Every figure on the report tab is computed from that table, so a fresh
 * environment shows zeros until this has run at least once. The nightly
 * scheduler is off by default (`KPI_MONDAY_SYNC_ENABLED`), which left no way to
 * populate it from the console at all - the empty state said "run a monday
 * sync" and offered no means of doing so.
 *
 * The backend answers 202 and syncs on its own thread, so the POST resolving
 * proves only that the run started. The button polls until `running` goes
 * false, then reports what the run actually wrote and refreshes the charts.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, RefreshCw } from 'lucide-react';
import { kpiApi } from '@/lib/api';
import type { KpiSyncSummary } from '@/lib/kpi/api-types';

/** Slow enough not to hammer the endpoint, quick enough to feel live. */
const POLL_MS = 3000;
/** ~4,000 tickets over three boards takes about a minute; this is the giving-up point. */
const MAX_POLLS = 100;

function describe(summary: KpiSyncSummary | null, t: (k: string, v?: never) => string): string {
  if (!summary) return t('sync.doneUnknown');
  const failed = summary.boards.filter((b) => b.status !== 'SUCCEEDED');
  if (failed.length) {
    // The board's own error, not a generic failure: it names the board and
    // usually says whether it was the token, the id, or a hidden group.
    return failed.map((b) => `${b.serviceLine ?? b.ticketType ?? b.boardId}: ${b.error ?? 'failed'}`).join(' · ');
  }
  // Read is every row the boards returned; written is only what actually
  // changed. A re-sync of unchanged data is read=8995 written=0, which is a
  // success - so the message names both rather than implying 8995 failed.
  const written = summary.boards.reduce((n, b) => n + b.inserted + b.updated, 0);
  const read = summary.boards.reduce((n, b) => n + b.itemsRead, 0);
  return t('sync.done', { written, read } as never);
}

export function MondaySyncButton() {
  const t = useTranslations('kpi');
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  // Polling outlives the click, so a navigation away must be able to stop it.
  const cancelled = useRef(false);

  useEffect(() => () => { cancelled.current = true; }, []);

  const run = useCallback(async () => {
    setBusy(true);
    setMessage(null);
    setFailed(false);
    try {
      await kpiApi.startMondaySync();

      for (let i = 0; i < MAX_POLLS; i += 1) {
        if (cancelled.current) return;
        await new Promise((resolve) => setTimeout(resolve, POLL_MS));
        const { data } = await kpiApi.mondaySyncStatus();
        const status = data.data;
        if (!status.running) {
          setFailed(!!status.lastSummary?.boards.some((b) => b.status !== 'SUCCEEDED'));
          setMessage(describe(status.lastSummary, t));
          // Only the report tab reads these; CSAT comes from the workbooks.
          // Prefix match: refreshes every cached period, not just the visible one.
          await queryClient.invalidateQueries({ queryKey: ['kpi', 'cm-cases'] });
          return;
        }
      }
      setFailed(true);
      setMessage(t('sync.stillRunning'));
    } catch (e) {
      // A 400 carries the backend's own reason (no token, no boards); a 500
      // from a double press says a run is already going. Both beat "failed".
      const body = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setFailed(true);
      setMessage(body ?? (e instanceof Error ? e.message : t('sync.failed')));
    } finally {
      setBusy(false);
    }
  }, [queryClient, t]);

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        className="flex items-center gap-1.5 rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)] px-3 py-2 text-xs font-semibold text-[var(--app-text)] transition hover:border-[var(--app-brand)] hover:text-[var(--app-brand-dark)] disabled:opacity-50"
        disabled={busy}
        onClick={run}
        title={t('sync.hint')}
        type="button"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
        {busy ? t('sync.busy') : t('sync.label')}
      </button>
      {message && (
        <p
          className={`max-w-xs text-right text-[10px] leading-tight ${
            failed ? 'text-[#DC2F2F]' : 'text-[var(--app-muted)]'
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
