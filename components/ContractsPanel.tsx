'use client';

/**
 * ContractsPanel — robots whose contract ends within the window, and robots whose
 * contract has already ended.
 *
 * A renewal should be visible a month out, not discovered when the robot stops
 * reporting. The backend also emails each contract once as it enters the window
 * (the morning ops alert); this is the same list, always current.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, ExternalLink, FileSignature, Loader2, Mail, RefreshCw } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { contractsApi } from '@/lib/api';
import type { ExpiringContract } from '@/types/api';

function Table({ rows, ended }: { rows: ExpiringContract[]; ended: boolean }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)]">
      <table className="w-full min-w-[56rem] text-left text-sm">
        <thead className="border-b border-[var(--app-border)] text-xs uppercase tracking-wide text-[var(--app-muted)]">
          <tr>
            <th className="px-3 py-2.5 font-semibold">Customer</th>
            <th className="px-3 py-2.5 font-semibold">Site</th>
            <th className="px-3 py-2.5 font-semibold">Robot</th>
            <th className="px-3 py-2.5 font-semibold">Contract</th>
            <th className="px-3 py-2.5 text-right font-semibold">{ended ? 'Ended' : 'Ends in'}</th>
            <th className="px-3 py-2.5 font-semibold">Alert</th>
            <th className="px-3 py-2.5"><span className="sr-only">Open</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--app-border)]">
          {rows.map((c) => (
            <tr key={c.robotUnitId} className="align-top">
              <td className="px-3 py-2.5 font-medium">{c.customerName}</td>
              <td className="px-3 py-2.5">{c.site ?? '—'}</td>
              <td className="px-3 py-2.5">
                <p className="font-mono text-xs font-semibold text-[var(--app-text)]">{c.serialNumber}</p>
                <p className="text-xs text-[var(--app-muted)]">{[c.name, c.brand, c.model].filter(Boolean).join(' · ') || '—'}</p>
              </td>
              <td className="px-3 py-2.5 whitespace-nowrap tabular-nums text-xs">
                {c.contractStartDate ?? '…'} → {c.contractEndDate}
              </td>
              <td className="px-3 py-2.5 whitespace-nowrap text-right tabular-nums">
                {ended ? (
                  <span className="font-semibold text-red-600">{Math.abs(c.daysToEnd)} d ago</span>
                ) : (
                  <span className={`font-semibold ${c.daysToEnd <= 7 ? 'text-red-600' : 'text-amber-600'}`}>
                    {c.daysToEnd === 0 ? 'today' : `${c.daysToEnd} d`}
                  </span>
                )}
              </td>
              <td className="px-3 py-2.5 text-xs text-[var(--app-muted)]">
                {c.alertedAt ? (
                  <span className="inline-flex items-center gap-1" title={new Date(c.alertedAt).toLocaleString()}>
                    <Mail className="h-3.5 w-3.5" /> sent
                  </span>
                ) : ended ? '—' : 'pending'}
              </td>
              <td className="px-3 py-2.5">
                <Link
                  href="/tools?tab=robots"
                  title="Open Tools → Robots to extend or close the contract"
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
  );
}

export function ContractsPanel() {
  const [windowDays, setWindowDays] = useState(30);

  const query = useQuery({
    queryKey: ['contracts-expiring', windowDays],
    queryFn: () => contractsApi.expiring(windowDays).then((r) => r.data.data),
  });
  const data = query.data;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2.5 rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--app-brand-soft)] text-[var(--app-brand-dark)]">
          <FileSignature className="h-4.5 w-4.5" />
        </span>
        <div>
          <p className="text-sm font-semibold text-[var(--app-text)]">Robot contracts</p>
          <p className="text-xs text-[var(--app-muted)]">
            Contracts ending soon, so a renewal is arranged before the robot stops reporting — and contracts already ended, so the end date can be confirmed or extended.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-3">
        <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--app-muted)]">
          Ending within
          <select
            value={windowDays}
            onChange={(e) => setWindowDays(Number(e.target.value))}
            className="h-9 rounded-lg border border-[var(--app-border)] bg-[var(--app-panel-alt)] px-3 text-sm font-normal text-[var(--app-text)] outline-none focus:border-[var(--app-brand)]"
          >
            <option value={30}>30 days</option>
            <option value={60}>60 days</option>
            <option value={90}>90 days</option>
          </select>
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
          <p className="ml-auto text-xs text-[var(--app-muted)]">
            As of {data.asOf} · <b className="text-[var(--app-text)]">{data.endingSoon.length}</b> ending within {data.windowDays} days ·{' '}
            <b className="text-[var(--app-text)]">{data.ended.length}</b> ended
          </p>
        )}
      </div>

      {query.isError && (
        <p className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          Could not load contracts — try again.
        </p>
      )}

      {data && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-[var(--app-text)]">Ending within {data.windowDays} days</h3>
          {data.endingSoon.length === 0 ? (
            <p className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              No contracts end in the next {data.windowDays} days.
            </p>
          ) : (
            <Table rows={data.endingSoon} ended={false} />
          )}
        </section>
      )}

      {data && data.ended.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-[var(--app-text)]">Already ended</h3>
          <Table rows={data.ended} ended />
          <p className="text-xs leading-5 text-[var(--app-muted)]">
            An ended robot gets no monthly report and is not on the No data list. If the contract was renewed, extend the end date on the robot; if the robot came back, clear it.
          </p>
        </section>
      )}

      <p className="text-xs leading-5 text-[var(--app-muted)]">
        Only robots with an end date appear here. Each contract is emailed to the customer success address once as it enters the 30-day
        window; changing the end date re-arms that alert.
      </p>
    </div>
  );
}
