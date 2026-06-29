'use client';

/**
 * ReportPreviewPanel — internal tool to preview the customer report layout.
 *
 * Search a registered robot (by SN / name / customer), pick it, choose a month,
 * and render the real <MonthlyReportView> with that robot's customer/site/SN.
 * A built-in "sample data" option always works so the format can be demoed even
 * before any robot is registered. Metrics are representative placeholders — this
 * is for confirming layout, not live numbers.
 */
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocale } from 'next-intl';
import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  Building2,
  CheckCircle2,
  ExternalLink,
  FlaskConical,
  Loader2,
  Mail,
  MapPin,
  RefreshCw,
  Search,
  Sparkles,
} from 'lucide-react';
import { reportApi, robotUnitApi, telemetryApi } from '@/lib/api';
import { MonthlyReportView } from '@/components/report/MonthlyReportView';
import { sampleGausiumReport } from '@/lib/reports/gausium';
import { monthYearLabel } from '@/lib/reports/preview';
import type { MonthlyPerformanceReport } from '@/lib/reports/types';
import type { RobotUnitResponse } from '@/types/api';

type Selection = { kind: 'sample' } | { kind: 'robot'; robot: RobotUnitResponse };

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

function errorMessage(e: unknown, fallback: string): string {
  const ax = e as { response?: { data?: { message?: string } } };
  return ax?.response?.data?.message ?? fallback;
}

function matchesQuery(r: RobotUnitResponse, q: string): boolean {
  if (!q) return true;
  const hay = [r.serialNumber, r.name, r.brand, r.model, r.deployment?.customerName, r.deployment?.site]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return hay.includes(q.toLowerCase());
}

const CADENCE_LABEL: Record<string, string> = { MONTHLY: 'Monthly', WEEKLY: 'Weekly', OFF: 'Off' };

export function ReportPreviewPanel() {
  const [query, setQuery] = useState('');
  const [selection, setSelection] = useState<Selection | null>(null);
  const [month, setMonth] = useState(previousMonth);
  const locale = useLocale();

  const maxMonth = useMemo(previousMonth, []);

  const { data: robots = [], isLoading, isError } = useQuery({
    queryKey: ['robot-units'],
    queryFn: () => robotUnitApi.list().then((r) => r.data.data ?? []),
  });

  const filtered = useMemo(() => robots.filter((r) => matchesQuery(r, query)), [robots, query]);

  const isRobot = selection?.kind === 'robot';
  const robotSn = selection?.kind === 'robot' ? selection.robot.serialNumber : undefined;

  // Real robot → aggregate live telemetry from the API; sample → static layout data.
  const {
    data: robotReport,
    isLoading: reportLoading,
    isError: reportError,
  } = useQuery({
    queryKey: ['report-preview', robotSn, month],
    queryFn: () => reportApi.preview(robotSn!, month).then((r) => r.data.data),
    enabled: !!robotSn,
  });

  const queryClient = useQueryClient();
  const syncMutation = useMutation({
    mutationFn: () => {
      const { from, to } = monthRange(month);
      return telemetryApi.sync(robotSn!, from, to).then((r) => r.data);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['report-preview', robotSn, month] }),
  });

  // Mint (or reuse) the public token and open the standalone customer link in a new tab.
  const linkMutation = useMutation({
    mutationFn: () => reportApi.createLink(robotSn!, month).then((r) => r.data.data),
    onSuccess: (data) => {
      if (data?.token) window.open(`/${locale}/report/${data.token}`, '_blank', 'noopener,noreferrer');
    },
  });

  // Email the report link to the customer's contact email.
  const emailMutation = useMutation({
    mutationFn: () => reportApi.sendEmail(robotSn!, month).then((r) => r.data),
  });

  const report: MonthlyPerformanceReport | null | undefined =
    selection?.kind === 'sample'
      ? { ...sampleGausiumReport, periodLabel: monthYearLabel(month) }
      : robotReport;

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
            Back to robots
          </button>

          <div className="flex flex-wrap items-center gap-3">
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
            {isRobot && (
              <button
                type="button"
                onClick={() => syncMutation.mutate()}
                disabled={syncMutation.isPending}
                title="Pull this robot's task reports from the Gausium API for the selected month"
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--app-brand)] px-3 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {syncMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                {syncMutation.isPending ? 'Syncing…' : 'Sync from Gausium'}
              </button>
            )}
            {isRobot && (
              <button
                type="button"
                onClick={() => linkMutation.mutate()}
                disabled={linkMutation.isPending}
                title="Open the standalone customer report link (real data) in a new tab — same link the monthly email uses"
                className="inline-flex items-center gap-2 rounded-lg border border-[var(--app-border)] px-3 py-2 text-sm font-semibold text-[var(--app-brand-dark)] transition hover:border-[var(--app-brand)] disabled:opacity-50"
              >
                {linkMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                Open shareable link
              </button>
            )}
            {isRobot && (
              <button
                type="button"
                onClick={() => emailMutation.mutate()}
                disabled={emailMutation.isPending}
                title="Email this report link to the customer's contact email"
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--app-brand)] px-3 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {emailMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                {emailMutation.isPending ? 'Sending…' : 'Send report email'}
              </button>
            )}
          </div>
        </div>

        {isRobot && syncMutation.isSuccess && (
          <p className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {syncMutation.data?.message ?? 'Sync complete.'}
          </p>
        )}
        {isRobot && syncMutation.isError && (
          <p className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {errorMessage(syncMutation.error, 'Sync failed — check Gausium credentials and that the robot is bound to your account.')}
          </p>
        )}

        {isRobot && emailMutation.isSuccess && (
          <p className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {emailMutation.data?.message ?? 'Report email sent.'}
          </p>
        )}
        {isRobot && emailMutation.isError && (
          <p className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {errorMessage(emailMutation.error, 'Email failed — check SMTP credentials and the customer\'s contact email.')}
          </p>
        )}

        {selection.kind === 'sample' && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
            <FlaskConical className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Sample data — representative values for confirming the layout.</span>
          </div>
        )}

        {isRobot && reportLoading && (
          <div className="flex items-center gap-2 py-10 text-sm text-[var(--app-muted)]">
            <Loader2 className="h-4 w-4 animate-spin" /> Aggregating this robot&apos;s telemetry…
          </div>
        )}

        {isRobot && reportError && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
            Could not load this robot&apos;s report. Check that you are signed in and the backend is running.
          </p>
        )}

        {report && !(isRobot && (reportLoading || reportError)) && (
          <div className="overflow-hidden rounded-2xl border border-[var(--app-border)] shadow-sm">
            <MonthlyReportView report={report} />
          </div>
        )}
      </div>
    );
  }

  /* ── List/search view ──────────────────────────────────────────────────── */
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-4">
        <p className="text-sm font-semibold text-[var(--app-text)]">Report layout preview</p>
        <p className="mt-1 text-xs text-[var(--app-muted)]">
          Pick a robot to preview its monthly report page, or use sample data to confirm the format.
        </p>
        <a
          href={`/${locale}/report/example`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-[var(--app-border)] px-3 py-1.5 text-xs font-semibold text-[var(--app-brand-dark)] transition hover:border-[var(--app-brand)]"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Open public example page (no login) — shareable with customers
        </a>
      </div>

      {/* Sample shortcut */}
      <button
        type="button"
        onClick={() => setSelection({ kind: 'sample' })}
        className="flex w-full items-center gap-3 rounded-xl border border-[var(--app-brand)] bg-[var(--app-brand-soft)] p-4 text-left transition hover:opacity-90"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--app-brand)] text-white">
          <Sparkles className="h-5 w-5" />
        </span>
        <span>
          <span className="block text-sm font-semibold text-[var(--app-text)]">Preview with sample data</span>
          <span className="block text-xs text-[var(--app-muted)]">See the report format immediately — no robot needed</span>
        </span>
      </button>

      {/* Search */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--app-muted)]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by serial number, robot, or customer…"
            className="h-11 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-panel-alt)] pl-10 pr-3 text-sm text-[var(--app-text)] outline-none focus:border-[var(--app-brand)]"
          />
        </div>

        {isLoading && (
          <div className="flex items-center gap-2 py-8 text-sm text-[var(--app-muted)]">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading robots…
          </div>
        )}

        {isError && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
            Could not load robots. Check that you are signed in and the backend is running.
          </p>
        )}

        {!isLoading && !isError && filtered.length === 0 && (
          <div className="rounded-xl border border-dashed border-[var(--app-border)] bg-[var(--app-panel)] py-10 text-center text-sm text-[var(--app-muted)]">
            {robots.length === 0
              ? 'No robots registered yet. Use the sample preview above, or register a robot first.'
              : 'No robots match your search.'}
          </div>
        )}

        <ul className="space-y-2">
          {filtered.map((r) => (
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
                      {r.deployment?.customerName ?? 'Unassigned'}
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
                  {CADENCE_LABEL[r.deployment?.reportCadence ?? ''] ?? '—'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
