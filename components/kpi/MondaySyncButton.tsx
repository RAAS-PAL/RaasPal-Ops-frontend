'use client';

/**
 * Pulls the Cleaning, Delivery and Installation boards into `kpi_case_ticket`.
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
 *
 * <p>It watches a run it did not start, too. A second press is refused with 409
 * while one is in flight, and treating that as an error was the whole problem:
 * the page sat on "0 tickets, synced never" showing a red refusal, while a
 * perfectly good run finished behind it and nothing refreshed. A 409 now means
 * attach to that run rather than give up. The same poll starts on mount, so a
 * reload mid-run, a second tab, or the scheduler's own run all end with the
 * figures appearing by themselves.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, RefreshCw } from 'lucide-react';
import { kpiApi } from '@/lib/api';
import type { KpiSyncSummary } from '@/lib/kpi/api-types';

/** Slow enough not to hammer the endpoint, quick enough to feel live. */
const POLL_MS = 3000;
/**
 * The giving-up point, 12 minutes. Measured: 9,008 tickets over the three
 * boards takes about four. The old ceiling was five, which a slow monday or a
 * bigger year would cross - and crossing it reports a failure over a run that
 * is still going, which is worse than waiting.
 */
const MAX_POLLS = 240;

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

const statusOf = (error: unknown): number | undefined =>
  (error as { response?: { status?: number } } | null)?.response?.status;

const messageOf = (error: unknown): string | undefined =>
  (error as { response?: { data?: { message?: string } } } | null)?.response?.data?.message;

export function MondaySyncButton() {
  const t = useTranslations('kpi');
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  // Polling outlives the click, so a navigation away must be able to stop it.
  const cancelled = useRef(false);
  // One loop at a time: the mount check and a click must not both poll.
  const polling = useRef(false);

  useEffect(() => () => { cancelled.current = true; }, []);

  /** Watches the run in flight to its end, then refreshes what it fed. */
  const pollUntilDone = useCallback(async () => {
    if (polling.current) return;
    polling.current = true;
    setBusy(true);
    try {
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
    } finally {
      polling.current = false;
      setBusy(false);
    }
  }, [queryClient, t]);

  const run = useCallback(async () => {
    setMessage(null);
    setFailed(false);
    setBusy(true);
    try {
      await kpiApi.startMondaySync();
    } catch (e) {
      if (statusOf(e) === 409) {
        // Already running - somebody's run, possibly this page's own from
        // before a reload. Watch it instead of reporting a failure over it.
        setMessage(t('sync.attached'));
        await pollUntilDone();
        return;
      }
      // A 400 carries the backend's own reason: no token, no boards configured.
      setFailed(true);
      setMessage(messageOf(e) ?? (e instanceof Error ? e.message : t('sync.failed')));
      setBusy(false);
      return;
    }
    await pollUntilDone();
  }, [pollUntilDone, t]);

  // A run may already be going when this mounts: the scheduler's, another tab's,
  // or this page's own across a reload. Without this the figures stay stale
  // until someone thinks to refresh.
  useEffect(() => {
    let dropped = false;
    void (async () => {
      try {
        const { data } = await kpiApi.mondaySyncStatus();
        if (dropped || cancelled.current || !data.data.running) return;
        setMessage(t('sync.attached'));
        await pollUntilDone();
      } catch {
        // Nothing to say: the page has its own error handling for a backend
        // that cannot be reached, and a failed status check is not the
        // button's news to report.
      }
    })();
    return () => { dropped = true; };
  }, [pollUntilDone, t]);

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
