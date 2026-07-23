'use client';

/**
 * ReportAutomationPanel — "Manage report automation" tab.
 *
 * The monthly bundle email is sent automatically by the backend scheduler on
 * the 2nd of each month (for the previous month). This panel lets the team:
 *   - see the delivery history for any month (who was sent, skipped, or failed),
 *   - run a month now (idempotent — already-sent customers are skipped),
 *   - resend a single customer whose delivery failed.
 */
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Loader2,
  Mail,
  Play,
  RefreshCw,
  Search,
  Send,
  SkipForward,
  X,
} from 'lucide-react';
import { customerApi, reportApi } from '@/lib/api';
import type { CustomerResponse, ReportSend } from '@/types/api';

/** Dropdown label: append the branch so same-company branches are distinguishable. */
function customerLabel(c: CustomerResponse): string {
  return c.branch && c.branch.trim() ? `${c.companyName} — ${c.branch}` : c.companyName;
}

/** Previous calendar month as "YYYY-MM". */
function previousMonth(): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function errorMessage(e: unknown, fallback: string): string {
  const ax = e as { response?: { data?: { message?: string } } };
  return ax?.response?.data?.message ?? fallback;
}

function formatSentAt(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

const STATUS_STYLE: Record<ReportSend['status'], string> = {
  SENT: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300',
  FAILED: 'border-red-200 bg-red-50 text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400',
  SKIPPED: 'border-[var(--app-border)] bg-[var(--app-panel-alt)] text-[var(--app-muted)]',
};

const STATUS_ICON: Record<ReportSend['status'], React.ReactNode> = {
  SENT: <CheckCircle2 className="h-3.5 w-3.5" />,
  FAILED: <AlertTriangle className="h-3.5 w-3.5" />,
  SKIPPED: <SkipForward className="h-3.5 w-3.5" />,
};

export function ReportAutomationPanel() {
  const [month, setMonth] = useState(previousMonth);
  const [customerId, setCustomerId] = useState('');
  /** Customers held back from "Run delivery now" (e.g. a site not fully registered yet). */
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());
  const [excludeQuery, setExcludeQuery] = useState('');
  const maxMonth = previousMonth();
  const queryClient = useQueryClient();

  // The bulk run executes in the background on the server (it syncs every robot
  // first, which takes minutes). Poll its status while it runs; the history list
  // below auto-refreshes so progress is visible send by send.
  const { data: runStatus } = useQuery({
    queryKey: ['report-delivery-status'],
    queryFn: () => reportApi.deliveryStatus().then((r) => r.data.data),
    refetchInterval: (query) => (query.state.data?.running ? 3000 : false),
  });
  const running = runStatus?.running ?? false;

  const {
    data: history = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['report-delivery-history', month],
    queryFn: () => reportApi.deliveryHistory(month).then((r) => r.data.data ?? []),
    refetchInterval: running ? 5000 : false,
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => customerApi.list().then((r) => r.data.data ?? []),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['report-delivery-history', month] });
    queryClient.invalidateQueries({ queryKey: ['report-delivery-status'] });
  };

  const runMutation = useMutation({
    mutationFn: () => reportApi.runDelivery(month, [...excludedIds]).then((r) => r.data),
    onSuccess: invalidate,
  });

  function toggleExcluded(id: string) {
    setExcludedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const excludedCustomers = customers.filter((c) => excludedIds.has(c.id));
  const excludeCandidates = customers.filter((c) => {
    const q = excludeQuery.trim().toLowerCase();
    return !q || customerLabel(c).toLowerCase().includes(q);
  });

  // Send one customer's bundle for the month. Used by the single-customer picker
  // (testing) AND the per-row resend. Runs in the background on the server (a
  // large site's sync can take minutes); the outcome lands in report_sends, so
  // the history below shows it and a later "Run delivery now" skips them.
  const sendMutation = useMutation({
    mutationFn: (customerProfileId: string) =>
      reportApi.sendCustomerBundle(customerProfileId, month).then((r) => r.data),
    onSuccess: invalidate,
  });

  return (
    <div className="space-y-5">
      {/* Topic header */}
      <div className="flex items-center gap-2.5 rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--app-brand-soft)] text-[var(--app-brand-dark)]">
          <CalendarClock className="h-4.5 w-4.5" />
        </span>
        <div>
          <p className="text-sm font-semibold text-[var(--app-text)]">Automated monthly report delivery</p>
          <p className="text-xs text-[var(--app-muted)]">One link per customer — auto on the 2nd, or run a month below.</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-3">
        <label className="flex items-center gap-2 text-sm text-[var(--app-muted)]">
          Report month
          <input
            type="month"
            value={month}
            max={maxMonth}
            onChange={(e) => setMonth(e.target.value)}
            className="h-9 rounded-lg border border-[var(--app-border)] bg-[var(--app-panel-alt)] px-3 text-sm text-[var(--app-text)] outline-none focus:border-[var(--app-brand)]"
          />
        </label>
        <button
          type="button"
          onClick={() => runMutation.mutate()}
          disabled={runMutation.isPending || running}
          title={
            excludedIds.size > 0
              ? `Send this month's bundle to every eligible customer except ${excludedIds.size} excluded (already-sent are also skipped). Runs in the background.`
              : "Send this month's bundle to every eligible customer (already-sent are skipped). Runs in the background — progress appears in the history below."
          }
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--app-brand)] px-3 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {runMutation.isPending || running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          {running ? 'Run in progress…' : 'Run delivery now'}
        </button>
      </div>

      {/* Exclude specific customers from "Run delivery now" — held back entirely
          (not synced, not emailed) and left eligible for a later run. Useful for
          a site whose robots aren't fully registered yet. */}
      <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-[var(--app-text)]">Exclude from this run (optional)</p>
          {excludedIds.size > 0 && (
            <button
              type="button"
              onClick={() => setExcludedIds(new Set())}
              className="text-xs font-semibold text-[var(--app-brand-dark)] hover:underline"
            >
              Clear ({excludedIds.size})
            </button>
          )}
        </div>
        <p className="mt-1 text-xs text-[var(--app-muted)]">
          Excluded customers are skipped entirely this run — not synced, not emailed — and stay eligible for a
          later run once ready.
        </p>

        {excludedCustomers.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {excludedCustomers.map((c) => (
              <span
                key={c.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200"
              >
                {customerLabel(c)}
                <button
                  type="button"
                  onClick={() => toggleExcluded(c.id)}
                  aria-label={`Remove ${customerLabel(c)} from exclusions`}
                  className="rounded-full hover:opacity-70"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--app-muted)]" />
          <input
            type="text"
            value={excludeQuery}
            onChange={(e) => setExcludeQuery(e.target.value)}
            placeholder="Search customers to exclude…"
            className="h-9 w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-panel-alt)] pl-9 pr-3 text-sm text-[var(--app-text)] outline-none focus:border-[var(--app-brand)]"
          />
        </div>

        <ul className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-[var(--app-border)]">
          {excludeCandidates.length === 0 && (
            <li className="px-3 py-2 text-xs text-[var(--app-muted)]">No customers match.</li>
          )}
          {excludeCandidates.map((c) => (
            <li key={c.id} className="border-b border-[var(--app-border)] last:border-b-0">
              <label className="flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-sm text-[var(--app-text)] hover:bg-[var(--app-panel-alt)]">
                <span className="flex min-w-0 items-center gap-2">
                  <input
                    type="checkbox"
                    checked={excludedIds.has(c.id)}
                    onChange={() => toggleExcluded(c.id)}
                    className="h-4 w-4 shrink-0 accent-[var(--app-brand)]"
                  />
                  <span className="truncate">{customerLabel(c)}</span>
                </span>
                <span className="shrink-0 text-xs text-[var(--app-muted)]">
                  {c.robotCount} robot{c.robotCount === 1 ? '' : 's'}
                </span>
              </label>
            </li>
          ))}
        </ul>
      </div>

      {running && (
        <p className="flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-300">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
          Delivery run in progress for {runStatus?.month ?? month} — syncing robots and sending emails. The
          history below updates automatically; this can take several minutes.
        </p>
      )}
      {!running && runStatus?.lastSummary && (
        <p className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Last run ({runStatus.lastSummary.month}) — {runStatus.lastSummary.sent} sent,{' '}
          {runStatus.lastSummary.skipped} skipped, {runStatus.lastSummary.failed} failed.
        </p>
      )}

      {/* Send to one customer — for testing before the full run. Recorded in
          history, so "Run delivery now" later skips anyone already sent here. */}
      <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-3">
        <p className="mb-2 text-sm font-semibold text-[var(--app-text)]">Send to one customer (test)</p>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className="h-9 min-w-64 flex-1 rounded-lg border border-[var(--app-border)] bg-[var(--app-panel-alt)] px-3 text-sm text-[var(--app-text)] outline-none focus:border-[var(--app-brand)]"
          >
            <option value="">Select a customer…</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{customerLabel(c)}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => customerId && sendMutation.mutate(customerId)}
            disabled={!customerId || sendMutation.isPending || running}
            title="Email this customer their bundle for the selected month (recorded so the full run skips them)"
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--app-brand)] px-3 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {sendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {sendMutation.isPending ? 'Sending…' : 'Send report'}
          </button>
        </div>
        <p className="mt-2 text-xs text-[var(--app-muted)]">
          Sends one customer their report for the selected month. This is recorded in the history below, so a
          later “Run delivery now” will skip anyone already sent — no duplicate emails.
        </p>
      </div>

      {sendMutation.isSuccess && sendMutation.data && (
        <p className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {sendMutation.data.message ?? 'Send started — the result will appear in the history below.'}
        </p>
      )}
      {sendMutation.isError && (
        <p className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {errorMessage(sendMutation.error, 'Send failed — check the customer has a contact email and SMTP is configured.')}
        </p>
      )}

      {runMutation.isError && (
        <p className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {errorMessage(runMutation.error, 'Delivery run failed — check SMTP credentials and the backend logs.')}
        </p>
      )}

      {/* History */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-[var(--app-text)]">Delivery history</p>
          <button
            type="button"
            onClick={invalidate}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--app-border)] px-2.5 py-1.5 text-xs font-semibold text-[var(--app-brand-dark)] transition hover:border-[var(--app-brand)]"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>

        {isLoading && (
          <div className="flex items-center gap-2 py-8 text-sm text-[var(--app-muted)]">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading history…
          </div>
        )}

        {isError && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
            Could not load delivery history. Check that you are signed in and the backend is running.
          </p>
        )}

        {!isLoading && !isError && history.length === 0 && (
          <div className="rounded-xl border border-dashed border-[var(--app-border)] bg-[var(--app-panel)] py-10 text-center text-sm text-[var(--app-muted)]">
            No deliveries recorded for this month yet. Use “Run delivery now” to send.
          </div>
        )}

        {history.length > 0 && (
          <ul className="space-y-2">
            {history.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[var(--app-text)]">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[row.status]}`}
                    >
                      {STATUS_ICON[row.status]}
                      {row.status}
                    </span>
                    <span className="truncate">{row.customerName}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--app-muted)]">
                    {row.recipientEmail && (
                      <span className="inline-flex items-center gap-1">
                        <Mail className="h-3.5 w-3.5" />
                        {row.recipientEmail}
                      </span>
                    )}
                    <span>{formatSentAt(row.sentAt)}</span>
                    {row.errorMessage && (
                      <span className="text-red-600 dark:text-red-400">{row.errorMessage}</span>
                    )}
                  </div>
                </div>
                {row.status !== 'SENT' && (
                  <button
                    type="button"
                    onClick={() => sendMutation.mutate(row.customerProfileId)}
                    disabled={sendMutation.isPending}
                    className="inline-flex items-center gap-2 rounded-lg border border-[var(--app-border)] px-3 py-2 text-sm font-semibold text-[var(--app-brand-dark)] transition hover:border-[var(--app-brand)] disabled:opacity-50"
                  >
                    {sendMutation.isPending && sendMutation.variables === row.customerProfileId ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Mail className="h-4 w-4" />
                    )}
                    Resend
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
