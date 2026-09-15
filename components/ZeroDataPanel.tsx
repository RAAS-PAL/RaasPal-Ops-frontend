'use client';

/**
 * ZeroDataPanel — the robots that should have reported a month and logged nothing.
 *
 * After the nightly sync has filled a month in, every in-contract robot with zero
 * tasks is either offline the whole time, never connected to its brand cloud, or
 * wrongly registered. All three print as a page of zeros on the customer's report,
 * so this puts them in one place for somebody to check before the reports go out.
 *
 * Computed by the backend on request — nothing is stored, so a late backfill or a
 * re-registration is reflected the next time the page loads. Defaults to last month,
 * the one the sync has just finished.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CalendarX2, CheckCircle2, ExternalLink, Loader2, RefreshCw } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { telemetryApi } from '@/lib/api';
import type { ZeroDataRobot } from '@/types/api';

/** "YYYY-MM" for the month {@code monthsAgo} before this one. */
function isoMonth(monthsAgo = 0): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - monthsAgo);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function contractSpan(r: ZeroDataRobot): string | null {
  if (!r.contractStartDate && !r.contractEndDate) return null;
  return `${r.contractStartDate ?? '…'} → ${r.contractEndDate ?? 'open'}`;
}

function ReasonBadge({ robot }: { robot: ZeroDataRobot }) {
  const never = robot.lastDataDate == null;
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${
        never
          ? 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/30 dark:text-red-300 dark:ring-red-900/40'
          : 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:ring-amber-900/40'
      }`}
      title={never ? 'This robot has never synced a single task — check the serial number and brand.' : 'It has synced before; it went quiet.'}
    >
      {robot.reason}
    </span>
  );
}

export function ZeroDataPanel() {
  const [month, setMonth] = useState(() => isoMonth(1));

  const query = useQuery({
    queryKey: ['zero-data', month],
    queryFn: () => telemetryApi.zeroData(month).then((r) => r.data.data),
    enabled: /^\d{4}-\d{2}$/.test(month),
  });
  const data = query.data;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2.5 rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--app-brand-soft)] text-[var(--app-brand-dark)]">
          <CalendarX2 className="h-4.5 w-4.5" />
        </span>
        <div>
          <p className="text-sm font-semibold text-[var(--app-text)]">Robots with no data</p>
          <p className="text-xs text-[var(--app-muted)]">
            Every robot under contract in the month that logged no task. Check these before the reports go out — each one prints as a page of zeros.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-3">
        <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--app-muted)]">
          Month
          <input
            type="month"
            value={month}
            max={isoMonth(0)}
            onChange={(e) => setMonth(e.target.value)}
            className="h-9 rounded-lg border border-[var(--app-border)] bg-[var(--app-panel-alt)] px-3 text-sm font-normal text-[var(--app-text)] outline-none focus:border-[var(--app-brand)]"
          />
        </label>
        <button
          type="button"
          onClick={() => query.refetch()}
          disabled={query.isFetching}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--app-border)] px-3 text-sm font-semibold text-[var(--app-text)] transition hover:border-[var(--app-brand)] disabled:opacity-50"
        >
          {query.isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Refresh
        </button>
        {data && (
          <p className="ml-auto text-sm text-[var(--app-muted)]">
            <span className="font-semibold text-[var(--app-text)]">{data.zeroData}</span> of {data.inScope} robots under contract in {data.monthLabel} logged nothing
          </p>
        )}
      </div>

      {query.isError && (
        <p className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          Could not load the list — check the month and try again.
        </p>
      )}

      {data && data.robots.length === 0 && (
        <p className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Every robot under contract in {data.monthLabel} logged at least one task.
        </p>
      )}

      {data && data.robots.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)]">
          <table className="w-full min-w-[56rem] text-left text-sm">
            <thead className="border-b border-[var(--app-border)] text-xs uppercase tracking-wide text-[var(--app-muted)]">
              <tr>
                <th className="px-3 py-2.5 font-semibold">Robot</th>
                <th className="px-3 py-2.5 font-semibold">Customer</th>
                <th className="px-3 py-2.5 font-semibold">Site</th>
                <th className="px-3 py-2.5 font-semibold">Contract</th>
                <th className="px-3 py-2.5 font-semibold">Last data</th>
                <th className="px-3 py-2.5 font-semibold">Why</th>
                <th className="px-3 py-2.5"><span className="sr-only">Open</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--app-border)]">
              {data.robots.map((r) => (
                <tr key={r.robotUnitId} className="align-top">
                  <td className="px-3 py-2.5">
                    <p className="font-mono text-xs font-semibold text-[var(--app-text)]">{r.serialNumber}</p>
                    <p className="text-xs text-[var(--app-muted)]">
                      {[r.name, r.brand, r.model].filter(Boolean).join(' · ') || '—'}
                    </p>
                  </td>
                  <td className="px-3 py-2.5">{r.customerName}</td>
                  <td className="px-3 py-2.5">{r.site ?? '—'}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap tabular-nums text-xs">{contractSpan(r) ?? '—'}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap tabular-nums">
                    {r.lastDataDate ? (
                      <>
                        {r.lastDataDate}
                        {r.daysSinceLastData != null && (
                          <span className="ml-1 text-xs text-[var(--app-muted)]">({r.daysSinceLastData} d ago)</span>
                        )}
                      </>
                    ) : (
                      <span className="text-[var(--app-muted)]">never</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5"><ReasonBadge robot={r} /></td>
                  <td className="px-3 py-2.5">
                    <Link
                      href="/tools?tab=robots"
                      title="Open Tools → Robots to check or edit this robot"
                      className="text-[var(--app-muted)] transition hover:text-[var(--app-brand-dark)]"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs leading-5 text-[var(--app-muted)]">
        &ldquo;Never synced&rdquo; usually means the serial number or brand on the robot is wrong, or the robot was never bound on the
        brand&rsquo;s cloud. &ldquo;No tasks this month&rdquo; means it has worked before and stopped — offline, in storage, or the
        contract is over and the end date has not been set. Robots whose contract ended before the month are not listed.
      </p>
    </div>
  );
}
