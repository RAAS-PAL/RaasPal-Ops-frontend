'use client';

/**
 * PuduReportPanel — generate an on-demand PUDU delivery report.
 *
 * Enter the robot's serial number and a date range; the backend reads PUDU's
 * data-board live (one row per robot per day), and returns the report in the same
 * shape as AutoXing's, so the same {@link DeliveryReportView} renders it.
 *
 * What PUDU adds that the shared view has no slot for — tables and trays served,
 * mean speed, and the previous period of equal length — is shown in a strip above
 * the report. There is no live-status card: PUDU's data-board is statistics only.
 *
 * Until the API key and secret are configured on the backend the panel says so and
 * disables the form, rather than offering a button that can only fail.
 */
import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AlertTriangle, Gauge, KeyRound, Loader2, Printer } from 'lucide-react';
import { puduApi } from '@/lib/api';
import { DeliveryReportView } from '@/components/report/DeliveryReportView';
import type { PuduDeliveryReport } from '@/types/api';

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

function km(meters: number): string {
  return `${(meters / 1000).toFixed(1)} km`;
}

function hm(seconds: number): string {
  if (!seconds) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h} h ${m} min` : `${m} min`;
}

/** "+12%" / "−8%" / "—" against the previous period; null when there was nothing before. */
function delta(now: number, before: number): string | null {
  if (!before) return null;
  const pct = Math.round(((now - before) / before) * 100);
  return pct === 0 ? '±0%' : pct > 0 ? `+${pct}%` : `−${Math.abs(pct)}%`;
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string | null }) {
  return (
    <div className="min-w-32 flex-1 rounded-lg bg-[var(--app-panel-alt)] px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--app-muted)]">{label}</p>
      <p className="text-lg font-bold tabular-nums text-[var(--app-text)]">{value}</p>
      {sub && <p className="text-xs tabular-nums text-[var(--app-muted)]">{sub}</p>}
    </div>
  );
}

/** PUDU's own figures, and the previous period — context, not part of the printed page. */
function PuduExtrasStrip({ report }: { report: PuduDeliveryReport }) {
  const p = report.pudu;
  const prev = p.previousPeriod;
  const s = report.summary;
  return (
    <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-4 print:hidden">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-[var(--app-text)]">PUDU figures</p>
        {prev && (
          <p className="text-xs text-[var(--app-muted)]">
            Change vs {prev.periodLabel} (previous {s.totalDays} days)
          </p>
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Stat label="Tables served" value={String(p.tableCount)} sub={prev ? delta(p.tableCount, prev.tableCount) : null} />
        <Stat label="Trays delivered" value={String(p.trayCount)} sub={prev ? delta(p.trayCount, prev.trayCount) : null} />
        <Stat label="Tasks" value={String(s.totalTasks)} sub={prev ? delta(s.totalTasks, prev.totalTasks) : null} />
        <Stat label="Distance" value={km(s.totalMileageMeters)} sub={prev ? delta(s.totalMileageMeters, prev.totalMileageMeters) : null} />
        <Stat label="Running time" value={hm(s.totalDurationSeconds)} sub={prev ? delta(s.totalDurationSeconds, prev.totalDurationSeconds) : null} />
        <Stat label="Mean speed" value={p.avgSpeedMps == null ? '—' : `${p.avgSpeedMps.toFixed(2)} m/s`} />
      </div>
      <p className="mt-2 text-[11px] leading-4 text-[var(--app-muted)]">
        PUDU reports distance to 0.01 km and time to 0.01 h, so figures are rounded to 10 m and 36 s.
      </p>
    </div>
  );
}

export function PuduReportPanel() {
  const [sn, setSn] = useState('');
  const [shopId, setShopId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [from, setFrom] = useState(() => isoDate(29));
  const [to, setTo] = useState(() => isoDate(0));

  const status = useQuery({
    queryKey: ['pudu-status'],
    queryFn: () => puduApi.status().then((r) => r.data.data),
    staleTime: 5 * 60_000,
  });
  const configured = status.data?.configured ?? true; // assume yes until told otherwise

  const mutation = useMutation({
    mutationFn: () =>
      puduApi
        .preview(sn.trim(), from, to, shopId.trim() || undefined, customerName.trim() || undefined)
        .then((r) => r.data.data),
  });

  const canSubmit = configured && sn.trim().length > 0 && !mutation.isPending;
  const report = mutation.data;

  const field =
    'h-9 rounded-lg border border-[var(--app-border)] bg-[var(--app-panel-alt)] px-3 text-sm font-normal text-[var(--app-text)] outline-none focus:border-[var(--app-brand)] disabled:opacity-50';

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2.5 rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--app-brand-soft)] text-[var(--app-brand-dark)]">
          <Gauge className="h-4.5 w-4.5" />
        </span>
        <div>
          <p className="text-sm font-semibold text-[var(--app-text)]">PUDU delivery report</p>
          <p className="text-xs text-[var(--app-muted)]">
            Live pull for one robot by serial number — max 31-day range. Name, model and store come from PUDU.
          </p>
        </div>
      </div>

      {status.isSuccess && !configured && (
        <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
          <KeyRound className="mt-0.5 h-4 w-4 shrink-0" />
          PUDU credentials are not set on the server. Set <code className="font-mono">PUDU_API_APP_KEY</code> and{' '}
          <code className="font-mono">PUDU_API_APP_SECRET</code> and restart the backend; nothing else changes.
        </p>
      )}

      <div className="space-y-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-3">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-52 flex-1 flex-col gap-1 text-xs font-semibold text-[var(--app-muted)]">
            Serial number (SN)
            <input
              type="text"
              value={sn}
              disabled={!configured}
              onChange={(e) => setSn(e.target.value)}
              placeholder="e.g. PD9102211844055"
              className={`${field} font-mono`}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--app-muted)]">
            From
            <input type="date" value={from} max={to} disabled={!configured} onChange={(e) => setFrom(e.target.value)} className={field} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--app-muted)]">
            To
            <input type="date" value={to} min={from} max={isoDate(0)} disabled={!configured} onChange={(e) => setTo(e.target.value)} className={field} />
          </label>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <label className="flex w-44 flex-col gap-1 text-xs font-semibold text-[var(--app-muted)]">
            PUDU store id <span className="font-normal">(optional)</span>
            <input
              type="text"
              inputMode="numeric"
              value={shopId}
              disabled={!configured}
              onChange={(e) => setShopId(e.target.value.replace(/\D/g, ''))}
              placeholder="e.g. 331300000"
              className={`${field} font-mono`}
            />
          </label>
          <label className="flex min-w-52 flex-1 flex-col gap-1 text-xs font-semibold text-[var(--app-muted)]">
            Customer name <span className="font-normal">(optional — else the PUDU store name)</span>
            <input
              type="text"
              value={customerName}
              disabled={!configured}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="e.g. Central Pattana"
              className={field}
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
          {errorMessage(mutation.error, 'Could not generate the report — check the serial number, PUDU credentials, and the date range.')}
        </p>
      )}

      {report && <PuduExtrasStrip report={report} />}

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
