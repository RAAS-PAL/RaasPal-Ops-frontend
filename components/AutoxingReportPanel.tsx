'use client';

/**
 * AutoxingReportPanel — generate an on-demand AutoXing delivery report.
 *
 * Enter the robot id, optionally a robot name/model, and a date range; the
 * backend pulls live task statistics from AutoXing, resolves the customer and
 * site from AutoXing's own directories, and returns the report.
 *
 * The robot's live status (battery, online, faults) is shown here as a separate
 * operator card — deliberately NOT inside the printable report, which describes
 * only the reporting period.
 */
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  AlertTriangle,
  BatteryMedium,
  Gauge,
  Loader2,
  Printer,
  TriangleAlert,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { autoxingApi } from '@/lib/api';
import { DeliveryReportView } from '@/components/report/DeliveryReportView';
import type { AutoxingLiveStatus } from '@/types/api';

/** Local date "YYYY-MM-DD" for today minus {@code daysAgo}. */
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

/** Live snapshot — operator context, intentionally excluded from the report. */
function LiveStatusCard({ status }: { status: AutoxingLiveStatus }) {
  const updated = status.timestamp ? new Date(status.timestamp).toLocaleString() : '—';
  const online = status.isOnline === true;
  return (
    <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--app-brand-soft)] text-[var(--app-brand-dark)]">
            {online ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
          </span>
          <div>
            <p className="text-sm font-semibold text-[var(--app-text)]">Live robot status</p>
            <p className="text-xs text-[var(--app-muted)]">Right now · not included in the report</p>
          </div>
        </div>
        <span className="text-xs text-[var(--app-muted)]">Updated {updated}</span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
            online
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
              : 'bg-[var(--app-faint)] text-[var(--app-muted)]'
          }`}
        >
          {online ? 'Online' : 'Offline'}
        </span>
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
      </div>

      {status.errors.length > 0 && (
        <div className="mt-3 flex flex-col gap-1.5">
          {status.errors.map((err, i) => (
            <p key={i} className="flex items-start gap-2 text-xs text-[var(--app-muted)]">
              <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
              {err}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

export function AutoxingReportPanel() {
  const [robotId, setRobotId] = useState('');
  const [robotName, setRobotName] = useState('');
  const [model, setModel] = useState('');
  const [from, setFrom] = useState(() => isoDate(29));
  const [to, setTo] = useState(() => isoDate(0));

  const mutation = useMutation({
    mutationFn: () =>
      autoxingApi
        .preview(robotId.trim(), from, to, robotName.trim(), model.trim())
        .then((r) => r.data.data),
  });

  const canSubmit = robotId.trim().length > 0 && !mutation.isPending;
  const report = mutation.data;

  return (
    <div className="space-y-5">
      {/* Topic header */}
      <div className="flex items-center gap-2.5 rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--app-brand-soft)] text-[var(--app-brand-dark)]">
          <Gauge className="h-4.5 w-4.5" />
        </span>
        <div>
          <p className="text-sm font-semibold text-[var(--app-text)]">AutoXing delivery report</p>
          <p className="text-xs text-[var(--app-muted)]">
            Live pull for one robot — max 30-day range. Customer and site resolve automatically.
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="space-y-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-3">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-52 flex-1 flex-col gap-1 text-xs font-semibold text-[var(--app-muted)]">
            Robot ID
            <input
              type="text"
              value={robotId}
              onChange={(e) => setRobotId(e.target.value)}
              placeholder="e.g. 2382310202332BC"
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
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-52 flex-1 flex-col gap-1 text-xs font-semibold text-[var(--app-muted)]">
            Robot name <span className="font-normal">(optional)</span>
            <input
              type="text"
              value={robotName}
              onChange={(e) => setRobotName(e.target.value)}
              placeholder="e.g. KUBOTA Line 1 Delivery"
              className="h-9 rounded-lg border border-[var(--app-border)] bg-[var(--app-panel-alt)] px-3 text-sm font-normal text-[var(--app-text)] outline-none focus:border-[var(--app-brand)]"
            />
          </label>
          <label className="flex w-40 flex-col gap-1 text-xs font-semibold text-[var(--app-muted)]">
            Model <span className="font-normal">(optional)</span>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="e.g. D-150"
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
          {report && (
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--app-border)] px-3 text-sm font-semibold text-[var(--app-text)] transition hover:border-[var(--app-brand)]"
            >
              <Printer className="h-4 w-4" />
              Print / PDF
            </button>
          )}
        </div>
      </div>

      {mutation.isError && (
        <p className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {errorMessage(mutation.error, 'Could not generate the report — check the robot ID, AutoXing credentials, and the date range.')}
        </p>
      )}

      {report?.liveStatus && <LiveStatusCard status={report.liveStatus} />}

      {report && (
        <div className="overflow-hidden rounded-2xl border border-[var(--app-border)] shadow-sm">
          <DeliveryReportView report={report} />
        </div>
      )}

      {report?.note && (
        <p className="px-1 text-xs leading-5 text-[var(--app-muted)]">{report.note}</p>
      )}
    </div>
  );
}
