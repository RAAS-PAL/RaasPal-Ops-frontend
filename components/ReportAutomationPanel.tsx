'use client';

/**
 * ReportAutomationPanel — "Manage report automation" tab.
 *
 * The monthly bundle email is sent automatically by the backend scheduler on
 * the 2nd of each month (for the previous month). The weekly bundle goes every
 * Monday (for the week just ended) to customers with a robot set to Weekly —
 * the Monthly / Weekly toggle switches everything below between the two.
 * This panel lets the team:
 *   - see the delivery history for any month or week (who was sent, skipped, or failed),
 *   - run a month or week now (idempotent — already-sent customers are skipped),
 *   - resend a single customer whose delivery failed.
 */
import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
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
import { useConfirm } from '@/components/ui/confirm-dialog';
import { intlLocale } from '@/lib/intlLocale';
import { previousIsoWeek, weekRangeLabel } from '@/lib/report-week';
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

function formatSentAt(iso: string, locale: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString(intlLocale(locale));
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
  const t = useTranslations('reportAutomation');
  const locale = useLocale();
  const { confirm, confirmDialog } = useConfirm();
  const [periodKind, setPeriodKind] = useState<'month' | 'week'>('month');
  const [month, setMonth] = useState(previousMonth);
  const [week, setWeek] = useState(previousIsoWeek);
  const [customerId, setCustomerId] = useState('');
  /** Customers held back from "Run delivery now" (e.g. a site not fully registered yet). */
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());
  const [excludeQuery, setExcludeQuery] = useState('');
  const maxMonth = previousMonth();
  const maxWeek = previousIsoWeek();
  const isWeekly = periodKind === 'week';
  /** The one period the run, the single send and the history all act on. */
  const periodValue = isWeekly ? week : month;
  const periodParam = isWeekly ? { week } : { month };
  /** How the period reads in a sentence — the raw month as before, a date range for a week. */
  const periodName = isWeekly ? weekRangeLabel(week, intlLocale(locale)) : month;
  const unit = t(isWeekly ? 'unitWeek' : 'unitMonth');
  const bold = (chunks: React.ReactNode) => <strong>{chunks}</strong>;
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
    queryKey: ['report-delivery-history', periodValue],
    queryFn: () => reportApi.deliveryHistory(periodParam).then((r) => r.data.data ?? []),
    refetchInterval: running ? 5000 : false,
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => customerApi.list().then((r) => r.data.data ?? []),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['report-delivery-history', periodValue] });
    queryClient.invalidateQueries({ queryKey: ['report-delivery-status'] });
  };

  const runMutation = useMutation({
    mutationFn: () => reportApi.runDelivery(periodParam, [...excludedIds]).then((r) => r.data),
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
      reportApi.sendCustomerBundle(customerProfileId, periodParam).then((r) => r.data),
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
          <p className="text-sm font-semibold text-[var(--app-text)]">
            {t(isWeekly ? 'headerWeek' : 'headerMonth')}
          </p>
          <p className="text-xs text-[var(--app-muted)]">
            {t(isWeekly ? 'descWeek' : 'descMonth')}
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-3">
        <div className="flex flex-wrap items-center gap-3">
          <div
            role="group"
            aria-label={t('periodAria')}
            className="flex items-center gap-0.5 rounded-lg border border-[var(--app-border)] bg-[var(--app-panel-alt)] p-0.5"
          >
            {(['month', 'week'] as const).map((kind) => (
              <button
                key={kind}
                type="button"
                onClick={() => setPeriodKind(kind)}
                aria-pressed={periodKind === kind}
                className={
                  periodKind === kind
                    ? 'rounded-md bg-[var(--app-brand)] px-3 py-1.5 text-sm font-semibold text-white'
                    : 'rounded-md px-3 py-1.5 text-sm font-semibold text-[var(--app-muted)] transition hover:text-[var(--app-text)]'
                }
              >
                {kind === 'month' ? t('monthly') : t('weekly')}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm text-[var(--app-muted)]">
            {t(isWeekly ? 'reportWeek' : 'reportMonth')}
            <input
              type={isWeekly ? 'week' : 'month'}
              value={periodValue}
              max={isWeekly ? maxWeek : maxMonth}
              onChange={(e) => (isWeekly ? setWeek(e.target.value) : setMonth(e.target.value))}
              className="h-9 rounded-lg border border-[var(--app-border)] bg-[var(--app-panel-alt)] px-3 text-sm text-[var(--app-text)] outline-none focus:border-[var(--app-brand)]"
            />
          </label>
        </div>
        <button
          type="button"
          onClick={() =>
            void confirm({
              title: t('confirmAllTitle', { unit }),
              kind: 'send',
              confirmLabel: t('confirmAllLabel'),
              message:
                excludedIds.size > 0
                  ? t('confirmAllBodyExcept', { period: periodName, unit, count: excludedIds.size })
                  : t('confirmAllBody', { period: periodName, unit }),
            }).then((ok) => ok && runMutation.mutate())
          }
          disabled={runMutation.isPending || running}
          title={excludedIds.size > 0 ? t('runTitleExcept', { unit, count: excludedIds.size }) : t('runTitle', { unit })}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--app-brand)] px-3 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {runMutation.isPending || running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          {running ? t('runInProgress') : t('runNow')}
        </button>
      </div>

      {/* Exclude specific customers from "Run delivery now" — held back entirely
          (not synced, not emailed) and left eligible for a later run. Useful for
          a site whose robots aren't fully registered yet. */}
      <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-[var(--app-text)]">{t('excludeTitle')}</p>
          {excludedIds.size > 0 && (
            <button
              type="button"
              onClick={() => setExcludedIds(new Set())}
              className="text-xs font-semibold text-[var(--app-brand-dark)] hover:underline"
            >
              {t('clear', { count: excludedIds.size })}
            </button>
          )}
        </div>
        <p className="mt-1 text-xs text-[var(--app-muted)]">
          {t('excludeHint')}
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
                  aria-label={t('removeExclusion', { name: customerLabel(c) })}
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
            placeholder={t('excludeSearch')}
            className="h-9 w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-panel-alt)] pl-9 pr-3 text-sm text-[var(--app-text)] outline-none focus:border-[var(--app-brand)]"
          />
        </div>

        <ul className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-[var(--app-border)]">
          {excludeCandidates.length === 0 && (
            <li className="px-3 py-2 text-xs text-[var(--app-muted)]">{t('noMatch')}</li>
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
                  {t('robotCount', { count: c.robotCount })}
                </span>
              </label>
            </li>
          ))}
        </ul>
      </div>

      {running && (
        <p className="flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-300">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
          {t('runningNote', { period: runStatus?.month ?? periodValue })}
        </p>
      )}
      {!running && runStatus?.lastSummary && (
        <p className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {t('lastRun', {
            period: runStatus.lastSummary.month,
            sent: runStatus.lastSummary.sent,
            skipped: runStatus.lastSummary.skipped,
            failed: runStatus.lastSummary.failed,
          })}
        </p>
      )}

      {/* Send to one customer — for testing before the full run. Recorded in
          history, so "Run delivery now" later skips anyone already sent here. */}
      <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-3">
        <p className="mb-2 text-sm font-semibold text-[var(--app-text)]">{t('sendOneTitle')}</p>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className="h-9 min-w-64 flex-1 rounded-lg border border-[var(--app-border)] bg-[var(--app-panel-alt)] px-3 text-sm text-[var(--app-text)] outline-none focus:border-[var(--app-brand)]"
          >
            <option value="">{t('selectCustomer')}</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{customerLabel(c)}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => {
              const target = customers.find((c) => c.id === customerId);
              if (!target) return;
              void confirm({
                title: t('confirmOneTitle'),
                kind: 'send',
                confirmLabel: t('sendReport'),
                message: t.rich('confirmOneBody', { name: customerLabel(target), period: periodName, b: bold }),
              }).then((ok) => ok && sendMutation.mutate(customerId));
            }}
            disabled={!customerId || sendMutation.isPending || running}
            title={t('oneTitle', { unit })}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--app-brand)] px-3 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {sendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {sendMutation.isPending ? t('sending') : t('sendReport')}
          </button>
        </div>
        <p className="mt-2 text-xs text-[var(--app-muted)]">
          {t('oneHint', { unit })}
        </p>
      </div>

      {sendMutation.isSuccess && sendMutation.data && (
        <p className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {sendMutation.data.message ?? t('sendStarted')}
        </p>
      )}
      {sendMutation.isError && (
        <p className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {errorMessage(sendMutation.error, t('sendFailed'))}
        </p>
      )}

      {runMutation.isError && (
        <p className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {errorMessage(runMutation.error, t('runFailed'))}
        </p>
      )}

      {/* History */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-[var(--app-text)]">{t('historyTitle')}</p>
          <button
            type="button"
            onClick={invalidate}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--app-border)] px-2.5 py-1.5 text-xs font-semibold text-[var(--app-brand-dark)] transition hover:border-[var(--app-brand)]"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {t('refresh')}
          </button>
        </div>

        {isLoading && (
          <div className="flex items-center gap-2 py-8 text-sm text-[var(--app-muted)]">
            <Loader2 className="h-4 w-4 animate-spin" /> {t('loadingHistory')}
          </div>
        )}

        {isError && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
            {t('historyError')}
          </p>
        )}

        {!isLoading && !isError && history.length === 0 && (
          <div className="rounded-xl border border-dashed border-[var(--app-border)] bg-[var(--app-panel)] py-10 text-center text-sm text-[var(--app-muted)]">
            {t('historyEmpty', { unit })}
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
                      {t(`status.${row.status}`)}
                    </span>
                    {/* What went out. A robot report is one machine's page from the
                        preview tab, not the month's bundle - it does not make the
                        customer "delivered", so the badge keeps the two apart. */}
                    {row.kind === 'ROBOT_REPORT' && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--app-faint)] px-2 py-0.5 text-xs font-semibold text-[var(--app-muted)]">
                        {t('robotReport')}
                        {row.robotSerial && <span className="font-mono font-normal">{row.robotSerial}</span>}
                      </span>
                    )}
                    <span className="truncate">{row.customerName}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--app-muted)]">
                    {row.recipientEmail && (
                      <span className="inline-flex items-center gap-1">
                        <Mail className="h-3.5 w-3.5" />
                        {row.recipientEmail}
                      </span>
                    )}
                    <span>{formatSentAt(row.sentAt, locale)}</span>
                    {row.errorMessage && (
                      <span className="text-red-600 dark:text-red-400">{row.errorMessage}</span>
                    )}
                  </div>
                </div>
                {/* Resend sends the bundle, so it is offered on bundle rows only; a
                    failed robot report is retried from the Preview tab. */}
                {row.status !== 'SENT' && row.kind === 'BUNDLE' && (
                  <button
                    type="button"
                    onClick={() =>
                      void confirm({
                        title: t('resendTitle'),
                        kind: 'send',
                        confirmLabel: t('sendReport'),
                        message: t.rich('resendBody', { name: row.customerName, period: periodName, b: bold }),
                      }).then((ok) => ok && sendMutation.mutate(row.customerProfileId))
                    }
                    disabled={sendMutation.isPending}
                    className="inline-flex items-center gap-2 rounded-lg border border-[var(--app-border)] px-3 py-2 text-sm font-semibold text-[var(--app-brand-dark)] transition hover:border-[var(--app-brand)] disabled:opacity-50"
                  >
                    {sendMutation.isPending && sendMutation.variables === row.customerProfileId ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Mail className="h-4 w-4" />
                    )}
                    {t('resend')}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      {confirmDialog}
    </div>
  );
}
