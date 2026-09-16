'use client';

/**
 * ZeroDataPanel — the customer success team's monthly worklist: every robot under
 * contract in a month that logged no task, why, and what has been done about it.
 *
 * The list is computed by the backend on request (nothing stored, so a late backfill
 * shows up on the next load); the follow-up — status, outcome, note — is stored per
 * robot per month and overlaid. Three reasons are told apart, because they need
 * different people: sync failing is ours to fix before anyone calls a customer;
 * never synced is a registration question; no tasks is a genuinely idle robot.
 *
 * Defaults to last month, the one the nightly sync has just finished.
 */
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CalendarX2,
  CheckCircle2,
  ExternalLink,
  EyeOff,
  Loader2,
  RefreshCw,
  Save,
} from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { telemetryApi } from '@/lib/api';
import type {
  FollowupOutcome,
  FollowupStatus,
  ZeroDataRobot,
  ZeroDataRobotsResponse,
} from '@/types/api';

/** "YYYY-MM" for the month {@code monthsAgo} before this one. */
function isoMonth(monthsAgo = 0): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - monthsAgo);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const REASON: Record<ZeroDataRobot['reason'], { label: string; hint: string; tone: string }> = {
  SYNC_FAILING: {
    label: 'Sync failing',
    hint: 'We tried to sync this robot this month and the last attempt failed. Our side — fix the sync before contacting the customer.',
    tone: 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/30 dark:text-red-300 dark:ring-red-900/40',
  },
  NEVER_SYNCED: {
    label: 'Never synced',
    hint: 'No task has ever arrived for this robot. Check the serial number and brand on the registration.',
    tone: 'bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-950/30 dark:text-violet-300 dark:ring-violet-900/40',
  },
  NO_TASKS: {
    label: 'No tasks',
    hint: 'Synced fine and genuinely logged nothing. The robot was off, in storage, or its contract is over.',
    tone: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:ring-amber-900/40',
  },
};

const STATUS_LABEL: Record<FollowupStatus, string> = {
  TO_CONTACT: 'To contact',
  CONTACTED: 'Contacted',
  RESOLVED: 'Resolved',
};

const OUTCOME_LABEL: Record<FollowupOutcome, string> = {
  ROBOT_OFFLINE: 'Robot offline',
  IN_STORAGE: 'In storage',
  CONTRACT_ENDED: 'Contract ended',
  REGISTRATION_ERROR: 'Registration error',
  SYNC_PROBLEM: 'Sync problem (ours)',
  OTHER: 'Other',
};

/**
 * The reason's badge copy, or a neutral fallback for a value this build does not
 * know — an older backend sends the reason as free text, and a newer one may add a
 * case. Either way the row must render, not take the page down.
 */
function reasonOf(reason: string): { label: string; hint: string; tone: string } {
  return (
    REASON[reason as ZeroDataRobot['reason']] ?? {
      label: reason || 'Unknown',
      hint: 'Reported by the backend in a form this console does not recognise.',
      tone: 'bg-[var(--app-faint)] text-[var(--app-muted)] ring-[var(--app-border)]',
    }
  );
}

function Badge({ label, tone, title }: { label: string; tone: string; title?: string }) {
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${tone}`}
      title={title}
    >
      {label}
    </span>
  );
}

function ContractBadge({ r }: { r: ZeroDataRobot }) {
  if (r.contractStatus === 'ENDED') {
    return <Badge label="Contract ended" tone={REASON.SYNC_FAILING.tone} title={`Ended ${r.contractEndDate}`} />;
  }
  if (r.contractStatus === 'ENDING_SOON') {
    return <Badge label={`Ends in ${r.daysToContractEnd} d`} tone={REASON.NO_TASKS.tone} title={`Ends ${r.contractEndDate}`} />;
  }
  return null;
}

const field =
  'h-8 rounded-lg border border-[var(--app-border)] bg-[var(--app-panel-alt)] px-2 text-xs text-[var(--app-text)] outline-none focus:border-[var(--app-brand)] disabled:opacity-50';

/** One row's follow-up editor: status, outcome (when resolved), note, save. */
function FollowupEditor({
  robot,
  month,
  onSaved,
}: {
  robot: ZeroDataRobot;
  month: string;
  onSaved: (data: ZeroDataRobotsResponse) => void;
}) {
  const [status, setStatus] = useState<FollowupStatus>(robot.followupStatus ?? 'TO_CONTACT');
  const [outcome, setOutcome] = useState<FollowupOutcome | ''>(robot.followupOutcome ?? '');
  const [note, setNote] = useState(robot.followupNote ?? '');

  const save = useMutation({
    mutationFn: () =>
      telemetryApi
        .saveZeroDataFollowup(robot.robotUnitId, month, {
          status,
          outcome: outcome || null,
          note: note.trim() || null,
        })
        .then((r) => r.data.data),
    onSuccess: onSaved,
  });

  const dirty =
    status !== (robot.followupStatus ?? 'TO_CONTACT') ||
    (outcome || null) !== (robot.followupOutcome ?? null) ||
    note.trim() !== (robot.followupNote ?? '');
  const canSave = dirty && !save.isPending && (status !== 'RESOLVED' || outcome !== '');

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <select value={status} onChange={(e) => setStatus(e.target.value as FollowupStatus)} className={field}>
          {(Object.keys(STATUS_LABEL) as FollowupStatus[]).map((s) => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>
        {status === 'RESOLVED' && (
          <select value={outcome} onChange={(e) => setOutcome(e.target.value as FollowupOutcome | '')} className={field}>
            <option value="">Outcome…</option>
            {(Object.keys(OUTCOME_LABEL) as FollowupOutcome[]).map((o) => (
              <option key={o} value={o}>{OUTCOME_LABEL[o]}</option>
            ))}
          </select>
        )}
        <button
          type="button"
          onClick={() => save.mutate()}
          disabled={!canSave}
          title={status === 'RESOLVED' && outcome === '' ? 'Pick an outcome to resolve' : 'Save follow-up'}
          className="inline-flex h-8 items-center gap-1 rounded-lg bg-[var(--app-brand)] px-2.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
        >
          {save.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Save
        </button>
      </div>
      <input
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="What the customer said…"
        className={`${field} w-full min-w-56`}
      />
      {robot.followupUpdatedBy && (
        <p className="text-[11px] text-[var(--app-muted)]">
          {robot.followupUpdatedBy} · {robot.followupUpdatedAt ? new Date(robot.followupUpdatedAt).toLocaleString() : ''}
        </p>
      )}
      {save.isError && <p className="text-[11px] text-red-600">Could not save — try again.</p>}
    </div>
  );
}

export function ZeroDataPanel() {
  const [month, setMonth] = useState(() => isoMonth(1));
  const queryClient = useQueryClient();
  const key = ['zero-data', month];

  const query = useQuery({
    queryKey: key,
    queryFn: () => telemetryApi.zeroData(month).then((r) => r.data.data),
    enabled: /^\d{4}-\d{2}$/.test(month),
  });
  const data = query.data;
  const replace = (fresh: ZeroDataRobotsResponse) => queryClient.setQueryData(key, fresh);

  const exclude = useMutation({
    mutationFn: (robotUnitId: string) =>
      telemetryApi.excludeZeroDataRobot(robotUnitId, month).then((r) => r.data.data),
    onSuccess: replace,
  });
  const resync = useMutation({
    mutationFn: (serial: string) => {
      const [y, m] = month.split('-').map(Number);
      const from = `${month}-01`;
      const to = `${month}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`;
      return telemetryApi.sync(serial, from, to, false);
    },
    onSuccess: () => query.refetch(),
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2.5 rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--app-brand-soft)] text-[var(--app-brand-dark)]">
          <CalendarX2 className="h-4.5 w-4.5" />
        </span>
        <div>
          <p className="text-sm font-semibold text-[var(--app-text)]">Robots with no data</p>
          <p className="text-xs text-[var(--app-muted)]">
            Every robot under contract in the month that logged no task. Find out why, contact the customer, record the outcome.
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
          <div className="ml-auto flex flex-wrap items-center gap-2 text-xs">
            <span className="text-[var(--app-muted)]">
              <b className="text-[var(--app-text)]">{data.zeroData}</b> of {data.inScope} robots · {data.monthLabel}
            </span>
            {data.toContact != null && (
              <>
                <Badge label={`${data.toContact} to contact`} tone={REASON.NO_TASKS.tone} />
                <Badge label={`${data.contacted} contacted`} tone="bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-950/30 dark:text-sky-300 dark:ring-sky-900/40" />
                <Badge label={`${data.resolved} resolved`} tone="bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:ring-emerald-900/40" />
              </>
            )}
          </div>
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
          <table className="w-full min-w-[72rem] text-left text-sm">
            <thead className="border-b border-[var(--app-border)] text-xs uppercase tracking-wide text-[var(--app-muted)]">
              <tr>
                <th className="px-3 py-2.5 font-semibold">Robot</th>
                <th className="px-3 py-2.5 font-semibold">Customer</th>
                <th className="px-3 py-2.5 font-semibold">Why</th>
                <th className="px-3 py-2.5 font-semibold">Last data</th>
                <th className="px-3 py-2.5 font-semibold">Follow-up</th>
                <th className="px-3 py-2.5 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--app-border)]">
              {data.robots.map((r) => (
                <tr key={r.robotUnitId} className="align-top">
                  <td className="px-3 py-2.5">
                    <p className="font-mono text-xs font-semibold text-[var(--app-text)]">{r.serialNumber}</p>
                    <p className="text-xs text-[var(--app-muted)]">{[r.name, r.brand, r.model].filter(Boolean).join(' · ') || '—'}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <ContractBadge r={r} />
                      {r.excludedFromReport && (
                        <Badge label="Excluded from report" tone="bg-[var(--app-faint)] text-[var(--app-muted)] ring-[var(--app-border)]" />
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <p>{r.customerName}</p>
                    <p className="text-xs text-[var(--app-muted)]">{r.site ?? '—'}</p>
                  </td>
                  <td className="px-3 py-2.5">
                    <Badge label={reasonOf(r.reason).label} tone={reasonOf(r.reason).tone} title={reasonOf(r.reason).hint} />
                    {r.reason === 'SYNC_FAILING' && r.lastSyncError && (
                      <p className="mt-1 max-w-[16rem] text-[11px] leading-4 text-[var(--app-muted)]" title={r.lastSyncError}>
                        <span className="line-clamp-2">{r.lastSyncError}</span>
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap tabular-nums text-xs">
                    {r.lastDataDate ? (
                      <>
                        {r.lastDataDate}
                        {r.daysSinceLastData != null && <span className="ml-1 text-[var(--app-muted)]">({r.daysSinceLastData} d)</span>}
                      </>
                    ) : (
                      <span className="text-[var(--app-muted)]">never</span>
                    )}
                    {r.lastSyncSuccessAt && (
                      <p className="text-[11px] text-[var(--app-muted)]">synced {new Date(r.lastSyncSuccessAt).toLocaleDateString()}</p>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <FollowupEditor key={`${r.robotUnitId}-${r.followupUpdatedAt ?? ''}`} robot={r} month={month} onSaved={replace} />
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-col gap-1.5">
                      <button
                        type="button"
                        disabled={r.excludedFromReport || exclude.isPending}
                        onClick={() => exclude.mutate(r.robotUnitId)}
                        title="Hold this robot back from the customer's report for this month"
                        className="inline-flex h-8 items-center gap-1 rounded-lg border border-[var(--app-border)] px-2.5 text-xs font-semibold text-[var(--app-text)] transition hover:border-[var(--app-brand)] disabled:opacity-40"
                      >
                        <EyeOff className="h-3.5 w-3.5" />
                        {r.excludedFromReport ? 'Excluded' : 'Exclude from report'}
                      </button>
                      <button
                        type="button"
                        disabled={resync.isPending}
                        onClick={() => resync.mutate(r.serialNumber)}
                        title="Pull this robot's tasks for the month again from the brand cloud"
                        className="inline-flex h-8 items-center gap-1 rounded-lg border border-[var(--app-border)] px-2.5 text-xs font-semibold text-[var(--app-text)] transition hover:border-[var(--app-brand)] disabled:opacity-40"
                      >
                        {resync.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                        Re-sync month
                      </button>
                      <Link
                        href="/tools?tab=robots"
                        className="inline-flex h-8 items-center gap-1 px-1 text-xs text-[var(--app-muted)] transition hover:text-[var(--app-brand-dark)]"
                        title="Open Tools → Robots to edit the serial, brand or contract dates"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Edit robot
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs leading-5 text-[var(--app-muted)]">
        Robots whose contract ended before the month are not listed. A follow-up is saved per robot per month; a resolved one needs an
        outcome. Excluding a robot uses the same per-robot exclusion as the Company report tab.
      </p>
    </div>
  );
}
