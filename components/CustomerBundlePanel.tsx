'use client';

/**
 * CustomerBundlePanel — review one company's whole monthly report, then send it.
 *
 * A customer like IFS has many robots, and in any month some were offline and
 * have nothing to show. Their pages still render, as a wall of zeros, which reads
 * as a broken report. So this is a curation surface: pick the company, see every
 * robot's page stacked as the customer will, untick the ones with no activity,
 * and send.
 *
 * Exclusions are saved server-side and applied to the customer's public link as
 * well, so what is approved here is exactly what the customer opens. Unticking is
 * always reversible — it filters pages, it never touches telemetry.
 */
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Building2,
  Check,
  Eye,
  EyeOff,
  Loader2,
  Mail,
  Printer,
  Save,
  Search,
  Send,
} from 'lucide-react';
import { customerApi, customerBundleApi, reportApi } from '@/lib/api';
import { previousMonth } from '@/lib/report-month';
import { MonthlyReportView } from '@/components/report/MonthlyReportView';
import { EmptyState } from '@/components/ui/empty-state';
import { ListSkeleton } from '@/components/ui/skeleton';
import type { CustomerBundleRobot, CustomerResponse } from '@/types/api';

const PAGE_SIZE = 10;

function errorMessage(e: unknown, fallback: string): string {
  const ax = e as { response?: { data?: { message?: string } }; code?: string };
  if (ax?.response?.data?.message) return ax.response.data.message;
  if (ax?.code === 'ECONNABORTED' || !ax?.response) {
    return 'This is taking longer than expected — it may still be running on the server. Wait a moment, then try again.';
  }
  return fallback;
}

function customerLabel(c: CustomerResponse): string {
  return c.companyName;
}

/** One row in the include/exclude list. */
function RobotRow({
  robot,
  included,
  onToggle,
}: {
  robot: CustomerBundleRobot;
  included: boolean;
  onToggle: () => void;
}) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-3 px-4 py-3 transition hover:bg-[var(--app-panel-alt)] ${
        included ? '' : 'opacity-55'
      }`}
    >
      <input
        type="checkbox"
        checked={included}
        onChange={onToggle}
        className="h-4 w-4 shrink-0 accent-[var(--app-brand)]"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[var(--app-text)]">{robot.robotName}</p>
        <p className="truncate text-xs text-[var(--app-muted)]">
          {[robot.serialNumber, robot.site].filter(Boolean).join(' · ')}
        </p>
      </div>
      {robot.hasData ? (
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
          <Check className="h-3.5 w-3.5" />
          {robot.report.executive.totalTasksCompleted} tasks
        </span>
      ) : (
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
          <AlertTriangle className="h-3.5 w-3.5" />
          No activity
        </span>
      )}
    </label>
  );
}

export function CustomerBundlePanel() {
  const queryClient = useQueryClient();

  const [customerId, setCustomerId] = useState<string | null>(null);
  const [month, setMonth] = useState(() => previousMonth());
  const [query, setQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  /** Local tick state, seeded from the server and saved explicitly. */
  const [included, setIncluded] = useState<Record<string, boolean>>({});
  const [dirty, setDirty] = useState(false);
  const [showPreview, setShowPreview] = useState(true);

  useEffect(() => setVisibleCount(PAGE_SIZE), [query]);

  const customersQuery = useQuery({
    queryKey: ['customers'],
    queryFn: () => customerApi.list().then((r) => r.data.data ?? []),
  });

  const bundleQuery = useQuery({
    queryKey: ['customer-bundle', customerId, month],
    queryFn: () => customerBundleApi.preview(customerId!, month).then((r) => r.data.data),
    enabled: customerId != null,
  });

  // Seed the tickboxes whenever a different customer or month is loaded. Keyed on
  // the response itself so a refetch after saving re-syncs rather than clobbering.
  useEffect(() => {
    if (!bundleQuery.data) return;
    setIncluded(
      Object.fromEntries(bundleQuery.data.robots.map((r) => [r.robotUnitId, !r.excluded])),
    );
    setDirty(false);
  }, [bundleQuery.data]);

  const saveMutation = useMutation({
    mutationFn: () => {
      const excluded = Object.entries(included)
        .filter(([, isIncluded]) => !isIncluded)
        .map(([id]) => id);
      return customerBundleApi.setExclusions(customerId!, month, excluded).then((r) => r.data);
    },
    onSuccess: () => {
      setDirty(false);
      queryClient.invalidateQueries({ queryKey: ['customer-bundle', customerId, month] });
    },
  });

  const sendMutation = useMutation({
    mutationFn: () => reportApi.sendCustomerBundle(customerId!, month).then((r) => r.data),
  });

  const robots = bundleQuery.data?.robots ?? [];
  const includedRobots = useMemo(
    () => robots.filter((r) => included[r.robotUnitId]),
    [robots, included],
  );
  const noActivityCount = robots.filter((r) => !r.hasData).length;
  const noActivityStillIncluded = robots.filter((r) => !r.hasData && included[r.robotUnitId]).length;

  const customers = customersQuery.data ?? [];
  const filteredCustomers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => customerLabel(c).toLowerCase().includes(q));
  }, [customers, query]);

  const toggle = (robotUnitId: string) => {
    setIncluded((prev) => ({ ...prev, [robotUnitId]: !prev[robotUnitId] }));
    setDirty(true);
  };

  const setAll = (value: boolean) => {
    setIncluded(Object.fromEntries(robots.map((r) => [r.robotUnitId, value])));
    setDirty(true);
  };

  const excludeAllEmpty = () => {
    setIncluded(Object.fromEntries(robots.map((r) => [r.robotUnitId, r.hasData])));
    setDirty(true);
  };

  /* ─── Customer picker ──────────────────────────────────────────────────── */
  if (!customerId) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-2.5 rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--app-brand-soft)] text-[var(--app-brand-dark)]">
            <Building2 className="h-4.5 w-4.5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-[var(--app-text)]">Company report</p>
            <p className="text-xs text-[var(--app-muted)]">
              Review every robot&apos;s report for one company, drop the ones with no activity, then send.
            </p>
          </div>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--app-muted)]" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search company…"
            className="h-10 w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-panel-alt)] pl-9 pr-3 text-sm text-[var(--app-text)] outline-none focus:border-[var(--app-brand)]"
          />
        </div>

        {customersQuery.isPending && <ListSkeleton />}
        {customersQuery.isSuccess && filteredCustomers.length === 0 && (
          <EmptyState
            icon={Building2}
            title="No matching company"
            description="Try a different name, or add the customer under Tools → Customers."
          />
        )}

        {filteredCustomers.length > 0 && (
          <div className="divide-y divide-[var(--app-border)] overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)]">
            {filteredCustomers.slice(0, visibleCount).map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCustomerId(c.id)}
                className="flex w-full items-center gap-4 px-4 py-3 text-left transition hover:bg-[var(--app-panel-alt)]"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[var(--app-text)]">
                    {customerLabel(c)}
                  </p>
                  <p className="truncate text-xs text-[var(--app-muted)]">
                    {c.contactEmail ?? 'No email on file'}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-[var(--app-muted)]">
                  {c.robotCount} robot{c.robotCount === 1 ? '' : 's'}
                </span>
              </button>
            ))}
          </div>
        )}

        {filteredCustomers.length > visibleCount && (
          <button
            type="button"
            onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
            className="mx-auto flex h-9 items-center rounded-lg border border-[var(--app-border)] px-4 text-sm font-semibold text-[var(--app-text)] transition hover:border-[var(--app-brand)]"
          >
            Load more ({filteredCustomers.length - visibleCount} more)
          </button>
        )}
      </div>
    );
  }

  /* ─── Review view ──────────────────────────────────────────────────────── */
  return (
    <div className="space-y-5">
      <div className="space-y-5 print:hidden">
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--app-brand-soft)] text-[var(--app-brand-dark)]">
            <Building2 className="h-4.5 w-4.5" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--app-text)]">
              {bundleQuery.data?.customerName ?? 'Loading…'}
            </p>
            <p className="text-xs text-[var(--app-muted)]">
              {bundleQuery.data?.periodLabel ?? month}
            </p>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="h-9 rounded-lg border border-[var(--app-border)] bg-[var(--app-panel-alt)] px-2 text-xs text-[var(--app-text)] outline-none focus:border-[var(--app-brand)]"
            />
            <button
              type="button"
              onClick={() => setCustomerId(null)}
              className="inline-flex h-9 items-center rounded-lg border border-[var(--app-border)] px-3 text-xs font-semibold text-[var(--app-text)] transition hover:border-[var(--app-brand)]"
            >
              Change company
            </button>
          </div>
        </div>

        {bundleQuery.isPending && <ListSkeleton rows={5} />}
        {bundleQuery.isError && (
          <p className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {errorMessage(bundleQuery.error, 'Could not load this company’s reports.')}
          </p>
        )}

        {bundleQuery.isSuccess && robots.length === 0 && (
          <EmptyState
            icon={Building2}
            title="No robots deployed"
            description="Register a robot to this company under Tools → Robots first."
          />
        )}

        {robots.length > 0 && (
          <>
            {/* Selection summary + bulk actions */}
            <div className="space-y-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-3">
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-sm font-semibold text-[var(--app-text)]">
                  {includedRobots.length} of {robots.length} robots in the report
                </p>
                {noActivityCount > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {noActivityCount} with no activity
                  </span>
                )}
                <div className="ml-auto flex flex-wrap items-center gap-2">
                  {noActivityStillIncluded > 0 && (
                    <button
                      type="button"
                      onClick={excludeAllEmpty}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--app-border)] px-2.5 text-xs font-semibold text-[var(--app-text)] transition hover:border-[var(--app-brand)]"
                    >
                      <EyeOff className="h-3.5 w-3.5" />
                      Drop the {noActivityStillIncluded} with no activity
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setAll(true)}
                    className="inline-flex h-8 items-center rounded-lg border border-[var(--app-border)] px-2.5 text-xs font-semibold text-[var(--app-text)] transition hover:border-[var(--app-brand)]"
                  >
                    Include all
                  </button>
                </div>
              </div>

              <div className="divide-y divide-[var(--app-border)] overflow-hidden rounded-lg border border-[var(--app-border)]">
                {robots.map((robot) => (
                  <RobotRow
                    key={robot.robotUnitId}
                    robot={robot}
                    included={Boolean(included[robot.robotUnitId])}
                    onToggle={() => toggle(robot.robotUnitId)}
                  />
                ))}
              </div>

              <p className="text-xs text-[var(--app-muted)]">
                Unticked robots are left out of the report the customer opens. Reversible at any
                time — this only hides pages, it never changes the robot&apos;s data.
              </p>

              {saveMutation.isError && (
                <p className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  {errorMessage(saveMutation.error, 'Could not save the selection.')}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => saveMutation.mutate()}
                  disabled={!dirty || saveMutation.isPending}
                  className="inline-flex h-9 items-center gap-2 rounded-lg bg-[var(--app-brand)] px-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                >
                  {saveMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {dirty ? 'Save selection' : 'Selection saved'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPreview((v) => !v)}
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--app-border)] px-3 text-sm font-semibold text-[var(--app-text)] transition hover:border-[var(--app-brand)]"
                >
                  {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  {showPreview ? 'Hide pages' : 'Show pages'}
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--app-border)] px-3 text-sm font-semibold text-[var(--app-text)] transition hover:border-[var(--app-brand)]"
                >
                  <Printer className="h-4 w-4" />
                  Print / PDF
                </button>
              </div>
            </div>

            {/* Send */}
            <div className="space-y-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-3">
              <div className="flex flex-wrap items-center gap-3">
                <Mail className="h-4 w-4 text-[var(--app-brand-dark)]" />
                <p className="text-sm font-semibold text-[var(--app-text)]">Send to the customer</p>
                <button
                  type="button"
                  onClick={() => sendMutation.mutate()}
                  disabled={sendMutation.isPending || includedRobots.length === 0 || dirty}
                  className="ml-auto inline-flex h-9 items-center gap-2 rounded-lg bg-[var(--app-brand)] px-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                >
                  {sendMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Send report
                </button>
              </div>

              {/* Sending with unsaved ticks would mail a different set than the one
                  on screen, so the button waits for the selection to be saved. */}
              {dirty && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Save your selection first — otherwise the customer would receive a different set
                  of robots than the one shown here.
                </p>
              )}
              {includedRobots.length === 0 && !dirty && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Every robot is excluded, so there is nothing to send.
                </p>
              )}
              {sendMutation.isSuccess && (
                <p className="flex items-start gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                  <Check className="mt-0.5 h-4 w-4 shrink-0" />
                  {sendMutation.data?.message ?? 'Send started — check the history under Manage automation.'}
                </p>
              )}
              {sendMutation.isError && (
                <p className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  {errorMessage(sendMutation.error, 'Could not start the send.')}
                </p>
              )}
            </div>
          </>
        )}
      </div>

      {/* Stacked pages, exactly as the customer will see them. Only the included
          robots render, so the preview and the delivered report agree. */}
      {showPreview &&
        includedRobots.map((robot, idx) => (
          <div
            key={robot.robotUnitId}
            // content-visibility:auto defers off-screen pages so a company with 70+
            // robots doesn't paint every report at once; printing renders them all.
            className={`overflow-hidden rounded-2xl border border-[var(--app-border)] shadow-sm [content-visibility:auto] [contain-intrinsic-size:auto_1400px] print:rounded-none print:border-0 print:shadow-none print:[content-visibility:visible] ${
              idx < includedRobots.length - 1 ? 'print:break-after-page' : ''
            }`}
          >
            <MonthlyReportView
              report={robot.report}
              page={{ number: idx + 1, total: includedRobots.length }}
            />
          </div>
        ))}
    </div>
  );
}
