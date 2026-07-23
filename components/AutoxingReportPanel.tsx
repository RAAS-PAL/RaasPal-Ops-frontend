'use client';

/**
 * AutoxingReportPanel — on-demand AutoXing delivery report for an urgent report.
 *
 * Enter the AutoXing robotId and a date range (defaults to the last 30 days),
 * hit Generate, and the backend pulls live task statistics + current robot state
 * from the AutoXing API and returns a delivery-shaped report. No persistence —
 * this is a live pull, so it always reflects current AutoXing data.
 */
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  AlertTriangle,
  BatteryMedium,
  Gauge,
  Loader2,
  Printer,
  Route,
  Timer,
  TriangleAlert,
} from 'lucide-react';
import { autoxingApi } from '@/lib/api';
import type { AutoxingDeliveryReport, AutoxingLiveStatus } from '@/types/api';

/** Local date "YYYY-MM-DD" for {@code today - daysAgo}. */
function isoDate(daysAgo = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function errorMessage(e: unknown, fallback: string): string {
  const ax = e as { response?: { data?: { message?: string } }; code?: string };
  if (ax?.response?.data?.message) return ax.response.data.message;
  if (ax?.code === 'ECONNABORTED' || !ax?.response) {
    return 'This is taking longer than expected — it may still be running on the server. Wait a moment, then try again.';
  }
  return fallback;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h} h ${m} min` : `${m} min`;
}

const CATEGORY_LABELS: Record<string, string> = {
  call: 'Call',
  delivery: 'Delivery',
  other: 'Other',
  charging: 'Charging',
  chassis: 'Chassis',
  disinfect: 'Disinfect',
};

function Flag({ label, on }: { label: string; on: boolean | null }) {
  if (on == null) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
        on
          ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
          : 'bg-[var(--app-faint)] text-[var(--app-muted)]'
      }`}
    >
      {label}: {on ? 'Yes' : 'No'}
    </span>
  );
}

function StatTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-panel)] p-4">
      <div className="flex items-center gap-2 text-[var(--app-muted)]">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--app-brand-soft)] text-[var(--app-brand-dark)]">
          {icon}
        </span>
        <p className="truncate text-xs font-semibold uppercase tracking-wide">{label}</p>
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums text-[var(--app-text)]">{value}</p>
    </div>
  );
}

function LiveStatusCard({ status }: { status: AutoxingLiveStatus }) {
  const updated = status.timestamp ? new Date(status.timestamp).toLocaleString() : '—';
  return (
    <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-[var(--app-text)]">Current status</p>
        <span className="text-xs text-[var(--app-muted)]">Updated {updated}</span>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {status.batteryPct != null && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--app-faint)] px-2.5 py-1 text-xs font-semibold text-[var(--app-text)]">
            <BatteryMedium className="h-3.5 w-3.5" />
            {status.batteryPct}%
          </span>
        )}
        {status.moveState && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--app-faint)] px-2.5 py-1 text-xs font-semibold text-[var(--app-text)]">
            {status.moveState}
          </span>
        )}
        <Flag label="Charging" on={status.isCharging} />
        <Flag label="E-stop" on={status.isEmergencyStop} />
        <Flag label="Manual" on={status.isManualMode} />
        <Flag label="Remote" on={status.isRemoteMode} />
      </div>
      {status.errors.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <TriangleAlert className="h-3.5 w-3.5 text-red-500" />
          {status.errors.map((err, i) => (
            <span
              key={i}
              className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-600 dark:bg-red-950/40 dark:text-red-400"
            >
              {err}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function ReportView({ report }: { report: AutoxingDeliveryReport }) {
  const km = (report.summary.totalMileageMeters / 1000).toFixed(2);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[var(--app-text)]">Robot {report.robotId}</p>
          <p className="text-xs text-[var(--app-muted)]">{report.periodLabel}</p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--app-border)] px-3 py-2 text-sm font-semibold text-[var(--app-text)] transition hover:border-[var(--app-brand)]"
        >
          <Printer className="h-4 w-4" />
          Print / Save PDF
        </button>
      </div>

      {report.liveStatus && <LiveStatusCard status={report.liveStatus} />}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile icon={<Gauge className="h-4 w-4" />} label="Total tasks" value={String(report.summary.totalTasks)} />
        <StatTile icon={<Route className="h-4 w-4" />} label="Mileage" value={`${km} km`} />
        <StatTile
          icon={<Timer className="h-4 w-4" />}
          label="Duration"
          value={formatDuration(report.summary.totalDurationSeconds)}
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-[var(--app-border)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--app-panel-alt)] text-left text-xs uppercase tracking-wide text-[var(--app-muted)]">
            <tr>
              <th className="px-4 py-2.5 font-semibold">Category</th>
              <th className="px-4 py-2.5 text-right font-semibold">Tasks</th>
              <th className="px-4 py-2.5 text-right font-semibold">Mileage (km)</th>
              <th className="px-4 py-2.5 text-right font-semibold">Duration</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--app-border)]">
            {report.categories.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-[var(--app-muted)]">
                  No task activity for this period.
                </td>
              </tr>
            ) : (
              report.categories.map((c) => (
                <tr key={c.category} className="text-[var(--app-text)]">
                  <td className="px-4 py-2.5 font-medium">{CATEGORY_LABELS[c.category] ?? c.category}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{c.count}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{(c.mileageMeters / 1000).toFixed(2)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{formatDuration(c.durationSeconds)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {report.note && (
        <p className="flex items-start gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-panel-alt)] px-4 py-3 text-xs text-[var(--app-muted)]">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {report.note}
        </p>
      )}
    </div>
  );
}

export function AutoxingReportPanel() {
  const [robotId, setRobotId] = useState('');
  const [from, setFrom] = useState(() => isoDate(29));
  const [to, setTo] = useState(() => isoDate(0));

  const mutation = useMutation({
    mutationFn: () => autoxingApi.preview(robotId.trim(), from, to).then((r) => r.data.data),
  });

  const canSubmit = robotId.trim().length > 0 && !mutation.isPending;

  return (
    <div className="space-y-5">
      {/* Topic header */}
      <div className="flex items-center gap-2.5 rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--app-brand-soft)] text-[var(--app-brand-dark)]">
          <Gauge className="h-4.5 w-4.5" />
        </span>
        <div>
          <p className="text-sm font-semibold text-[var(--app-text)]">AutoXing delivery report</p>
          <p className="text-xs text-[var(--app-muted)]">Live pull for one robot — max 30-day range.</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-3">
        <label className="flex min-w-56 flex-1 flex-col gap-1 text-xs font-semibold text-[var(--app-muted)]">
          Robot ID
          <input
            type="text"
            value={robotId}
            onChange={(e) => setRobotId(e.target.value)}
            placeholder="e.g. 8981307a02163yT"
            className="h-9 rounded-lg border border-[var(--app-border)] bg-[var(--app-panel-alt)] px-3 text-sm font-normal text-[var(--app-text)] outline-none focus:border-[var(--app-brand)]"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--app-muted)]">
          From
          <input
            type="date"
            value={from}
            max={to}
            onChange={(e) => setFrom(e.target.value)}
            className="h-9 rounded-lg border border-[var(--app-border)] bg-[var(--app-panel-alt)] px-3 text-sm font-normal text-[var(--app-text)] outline-none focus:border-[var(--app-brand)]"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--app-muted)]">
          To
          <input
            type="date"
            value={to}
            min={from}
            max={isoDate(0)}
            onChange={(e) => setTo(e.target.value)}
            className="h-9 rounded-lg border border-[var(--app-border)] bg-[var(--app-panel-alt)] px-3 text-sm font-normal text-[var(--app-text)] outline-none focus:border-[var(--app-brand)]"
          />
        </label>
        <button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={!canSubmit}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-[var(--app-brand)] px-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gauge className="h-4 w-4" />}
          {mutation.isPending ? 'Generating…' : 'Generate report'}
        </button>
      </div>

      {mutation.isError && (
        <p className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {errorMessage(mutation.error, 'Could not generate the report — check the robot ID, AutoXing credentials, and the date range.')}
        </p>
      )}

      {mutation.isSuccess && mutation.data && <ReportView report={mutation.data} />}
    </div>
  );
}
