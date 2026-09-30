'use client';

/**
 * ReportPreviewPanel — internal tool to preview the customer report layout.
 *
 * Search a registered robot (by SN / name / customer), pick it, choose a period —
 * a calendar month or an ISO week (Mon–Sun) — and render the real
 * <MonthlyReportView> with that robot's customer/site/SN. The format itself can be
 * seen without a robot on the public example page linked at the top; the sample
 * shortcut that used to sit here was removed because a preview with invented
 * numbers next to the real Send button invited mistakes.
 *
 * Sharing and emailing work for either period: a report link is keyed on the
 * robot plus a period key ("2026-08" or "2026-W38"), and the email names the
 * period the same way the report does.
 */
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  Building2,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Mail,
  MapPin,
  RefreshCw,
  Search,
} from 'lucide-react';
import { reportApi, robotUnitApi, telemetryApi } from '@/lib/api';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { MonthlyReportView } from '@/components/report/MonthlyReportView';
import { intlLocale } from '@/lib/intlLocale';
import { monthLabel } from '@/lib/report-month';
import { isoWeekRange, previousIsoWeek, weekRangeLabel } from '@/lib/report-week';
import type { MonthlyPerformanceReport } from '@/lib/reports/types';
import { InfiniteScroll } from '@/components/ui/infinite-scroll';
import type { RobotUnitResponse } from '@/types/api';

type Selection = { kind: 'robot'; robot: RobotUnitResponse };

/** Which window the report covers. */
type PeriodKind = 'month' | 'week';

const PERIOD_KINDS: PeriodKind[] = ['month', 'week'];

const PERIOD_INPUT_CLASS =
  'h-9 rounded-lg border border-[var(--app-border)] bg-[var(--app-panel-alt)] px-3 text-sm text-[var(--app-text)] outline-none focus:border-[var(--app-brand)]';

/** Previous calendar month as "YYYY-MM". */
function previousMonth(): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function robotDisplayName(r: RobotUnitResponse): string {
  return r.name ?? [r.brand, r.model].filter(Boolean).join(' ') ?? r.serialNumber;
}

/** "2026-06" → { from: "2026-06-01", to: "2026-06-30" } for the Gausium sync range. */
function monthRange(month: string): { from: string; to: string } {
  const [year, m] = month.split('-').map(Number);
  const lastDay = new Date(year, m, 0).getDate();
  return { from: `${month}-01`, to: `${month}-${String(lastDay).padStart(2, '0')}` };
}

function errorMessage(e: unknown, fallback: string, slow: string): string {
  const ax = e as { response?: { data?: { message?: string } }; code?: string };
  if (ax?.response?.data?.message) return ax.response.data.message;
  // No response at all = the request timed out or the connection dropped client-side
  // — the backend may well have kept running and finished. Don't blame credentials.
  if (ax?.code === 'ECONNABORTED' || !ax?.response) return slow;
  return fallback;
}

function matchesQuery(r: RobotUnitResponse, q: string): boolean {
  if (!q) return true;
  const hay = [r.serialNumber, r.name, r.brand, r.model, r.deployment?.customerName, r.deployment?.site]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return hay.includes(q.toLowerCase());
}

/** The robot's report cadence -> its key in `robotsPanel`. */
const CADENCE_KEY: Record<string, string> = { MONTHLY: 'cadenceMonthly', WEEKLY: 'cadenceWeekly', OFF: 'cadenceOff' };

const PAGE_SIZE = 10;

export function ReportPreviewPanel() {
  const t = useTranslations('reportPreview');
  const tRobots = useTranslations('robotsPanel');
  const { confirm, confirmDialog } = useConfirm();
  const [query, setQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [periodKind, setPeriodKind] = useState<PeriodKind>('month');
  const [month, setMonth] = useState(previousMonth);
  const [week, setWeek] = useState(previousIsoWeek);
  const locale = useLocale();

  // Both pickers default to the last *finished* period: the current one is still
  // accumulating tasks, so its numbers are not yet a report.
  const maxMonth = useMemo(previousMonth, []);
  const maxWeek = useMemo(previousIsoWeek, []);

  const isWeekly = periodKind === 'week';
  const slow = t('slow');
  /** The single period value the request, the cache key and the sync range share. */
  const periodValue = isWeekly ? week : month;
  const periodParam = isWeekly ? { week } : { month };
  const periodLabel = isWeekly ? weekRangeLabel(week, intlLocale(locale)) : monthLabel(month, intlLocale(locale));
  // Null only when the week input is cleared or malformed — the sync is blocked then.
  const syncRange = isWeekly ? isoWeekRange(week) : monthRange(month);

  const { data: robots = [], isLoading, isError } = useQuery({
    queryKey: ['robot-units'],
    queryFn: () => robotUnitApi.list().then((r) => r.data.data ?? []),
  });

  const filtered = useMemo(() => robots.filter((r) => matchesQuery(r, query)), [robots, query]);

  // Render only a page at a time — the full list of ~100 robots is slow to paint.
  useEffect(() => setVisibleCount(PAGE_SIZE), [query]);
  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  const isRobot = selection?.kind === 'robot';
  const robotSn = selection?.kind === 'robot' ? selection.robot.serialNumber : undefined;

  // Aggregate live telemetry from the API for the selected robot and period.
  const {
    data: robotReport,
    isLoading: reportLoading,
    isError: reportError,
  } = useQuery({
    queryKey: ['report-preview', robotSn, periodKind, periodValue],
    queryFn: () => reportApi.preview(robotSn!, periodParam).then((r) => r.data.data),
    enabled: !!robotSn,
  });

  const queryClient = useQueryClient();
  const syncMutation = useMutation({
    mutationFn: () => {
      if (!syncRange) return Promise.reject(new Error(t('chooseValidWeek')));
      return telemetryApi.sync(robotSn!, syncRange.from, syncRange.to).then((r) => r.data);
    },
    // Invalidate every period for this robot, not just the visible one: newly
    // synced tasks change the month the week sits in as well as the week itself.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['report-preview', robotSn] }),
  });

  // Mint (or reuse) the public token and open the standalone customer link in a new tab.
  const linkMutation = useMutation({
    mutationFn: () => reportApi.createLink(robotSn!, periodParam).then((r) => r.data.data),
    onSuccess: (data) => {
      if (data?.token) window.open(`/${locale}/report/${data.token}`, '_blank', 'noopener,noreferrer');
    },
  });

  // Email the report link to the customer's contact email.
  const emailMutation = useMutation({
    mutationFn: () => reportApi.sendEmail(robotSn!, periodParam).then((r) => r.data),
  });

  const report: MonthlyPerformanceReport | null | undefined = robotReport;

  /* ── Selected: show the report with a control bar ──────────────────────── */
  if (selection) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-3">
          <button
            type="button"
            onClick={() => setSelection(null)}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--app-border)] px-3 py-2 text-sm font-semibold text-[var(--app-text)] transition hover:border-[var(--app-brand)]"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('back')}
          </button>

          <div className="flex flex-wrap items-center gap-3">
            <div
              role="group"
              aria-label={t('periodAria')}
              className="flex items-center gap-0.5 rounded-lg border border-[var(--app-border)] bg-[var(--app-panel-alt)] p-0.5"
            >
              {PERIOD_KINDS.map((kind) => (
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
                  {t(kind === 'month' ? 'monthly' : 'weekly')}
                </button>
              ))}
            </div>

            <label className="flex items-center gap-2 text-sm text-[var(--app-muted)]">
              {t(isWeekly ? 'reportWeek' : 'reportMonth')}
              {isWeekly ? (
                <input
                  type="week"
                  value={week}
                  max={maxWeek}
                  onChange={(e) => setWeek(e.target.value)}
                  className={PERIOD_INPUT_CLASS}
                />
              ) : (
                <input
                  type="month"
                  value={month}
                  max={maxMonth}
                  onChange={(e) => setMonth(e.target.value)}
                  className={PERIOD_INPUT_CLASS}
                />
              )}
            </label>
            {isRobot && (
              <button
                type="button"
                onClick={() => syncMutation.mutate()}
                disabled={syncMutation.isPending || !syncRange}
                title={t('syncTitle', { unit: t(isWeekly ? 'unitWeek' : 'unitMonth') })}
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--app-brand)] px-3 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {syncMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                {syncMutation.isPending ? t('syncing') : t('syncGausium')}
              </button>
            )}
            {isRobot && (
              <button
                type="button"
                onClick={() => linkMutation.mutate()}
                disabled={linkMutation.isPending}
                title={t('linkTitle')}
                className="inline-flex items-center gap-2 rounded-lg border border-[var(--app-border)] px-3 py-2 text-sm font-semibold text-[var(--app-brand-dark)] transition hover:border-[var(--app-brand)] disabled:opacity-50"
              >
                {linkMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                {t('openLink')}
              </button>
            )}
            {isRobot && (
              <button
                type="button"
                onClick={() =>
                  void confirm({
                    title: t('confirmTitle'),
                    kind: 'send',
                    confirmLabel: t('confirmLabel'),
                    message: t.rich('confirmBody', {
                      period: periodLabel,
                      serial: robotSn ?? '',
                      customer: selection.robot.deployment?.customerName ?? t('theCustomer'),
                      b: (chunks) => <strong>{chunks}</strong>,
                    }),
                  }).then((ok) => ok && emailMutation.mutate())
                }
                disabled={emailMutation.isPending}
                title={t('emailTitle')}
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--app-brand)] px-3 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {emailMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                {emailMutation.isPending ? t('sending') : t('confirmLabel')}
              </button>
            )}
          </div>
        </div>

        {isRobot && syncMutation.isSuccess && (
          <p className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {syncMutation.data?.message ?? t('syncDone')}
          </p>
        )}
        {isRobot && syncMutation.isError && (
          <p className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {errorMessage(syncMutation.error, t('syncFailed'), slow)}
          </p>
        )}

        {isRobot && emailMutation.isSuccess && (
          <p className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {emailMutation.data?.message ?? t('emailSent')}
          </p>
        )}
        {isRobot && emailMutation.isError && (
          <p className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {errorMessage(emailMutation.error, t('emailFailed'), slow)}
          </p>
        )}

        {isRobot && reportLoading && (
          <div className="flex items-center gap-2 py-10 text-sm text-[var(--app-muted)]">
            <Loader2 className="h-4 w-4 animate-spin" /> {t('aggregating')}
          </div>
        )}

        {isRobot && reportError && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
            {t('reportFailed')}
          </p>
        )}

        {report && !(isRobot && (reportLoading || reportError)) && (
          <div className="overflow-hidden rounded-2xl border border-[var(--app-border)] shadow-sm">
            <MonthlyReportView report={report} />
          </div>
        )}
        {confirmDialog}
      </div>
    );
  }

  /* ── List/search view ──────────────────────────────────────────────────── */
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-4">
        <p className="text-sm font-semibold text-[var(--app-text)]">{t('layoutTitle')}</p>
        <p className="mt-1 text-xs text-[var(--app-muted)]">
          {t('layoutHint')}
        </p>
        <a
          href={`/${locale}/report/example`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-[var(--app-border)] px-3 py-1.5 text-xs font-semibold text-[var(--app-brand-dark)] transition hover:border-[var(--app-brand)]"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          {t('openExample')}
        </a>
      </div>

      {/* Search */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--app-muted)]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="h-11 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-panel-alt)] pl-10 pr-3 text-sm text-[var(--app-text)] outline-none focus:border-[var(--app-brand)]"
          />
        </div>

        {isLoading && (
          <div className="flex items-center gap-2 py-8 text-sm text-[var(--app-muted)]">
            <Loader2 className="h-4 w-4 animate-spin" /> {t('loadingRobots')}
          </div>
        )}

        {isError && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
            {t('robotsFailed')}
          </p>
        )}

        {!isLoading && !isError && filtered.length === 0 && (
          <div className="rounded-xl border border-dashed border-[var(--app-border)] bg-[var(--app-panel)] py-10 text-center text-sm text-[var(--app-muted)]">
            {robots.length === 0 ? t('emptyNone') : t('noMatch')}
          </div>
        )}

        <ul className="space-y-2">
          {visible.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => setSelection({ kind: 'robot', robot: r })}
                className="flex w-full items-center justify-between gap-4 rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-4 text-left transition hover:border-[var(--app-brand)]"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[var(--app-text)]">
                    <Bot className="h-4 w-4 shrink-0 text-[var(--app-brand-dark)]" />
                    <span className="truncate">{robotDisplayName(r)}</span>
                    <span className="text-xs font-normal text-[var(--app-muted)]">{r.serialNumber}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--app-muted)]">
                    <span className="inline-flex items-center gap-1">
                      <Building2 className="h-3.5 w-3.5" />
                      {r.deployment?.customerName ?? t('unassigned')}
                    </span>
                    {r.deployment?.site && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {r.deployment.site}
                      </span>
                    )}
                  </div>
                </div>
                <span className="shrink-0 rounded-full border border-[var(--app-border)] px-2.5 py-1 text-xs font-semibold text-[var(--app-brand-dark)]">
                  {CADENCE_KEY[r.deployment?.reportCadence ?? ''] ? tRobots(CADENCE_KEY[r.deployment?.reportCadence ?? '']) : '—'}
                </span>
              </button>
            </li>
          ))}
        </ul>

        <InfiniteScroll
          hasMore={hasMore}
          onReach={() => setVisibleCount((n) => n + PAGE_SIZE)}
          label={t('showing', { shown: visibleCount, total: filtered.length })}
        />
      </div>
    </div>
  );
}
