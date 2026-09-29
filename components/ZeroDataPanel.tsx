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
import { useLocale, useTranslations } from 'next-intl';
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
import { intlLocale } from '@/lib/intlLocale';
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

type T = ReturnType<typeof useTranslations>;

/** The colour of each reason's badge; its wording is `zeroData.reason.*`. */
const REASON_TONE: Record<ZeroDataRobot['reason'], string> = {
  SYNC_FAILING: 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/30 dark:text-red-300 dark:ring-red-900/40',
  NEVER_SYNCED: 'bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-950/30 dark:text-violet-300 dark:ring-violet-900/40',
  NO_TASKS: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:ring-amber-900/40',
};

const FOLLOWUP_STATUSES: FollowupStatus[] = ['TO_CONTACT', 'CONTACTED', 'RESOLVED'];
const FOLLOWUP_OUTCOMES: FollowupOutcome[] = [
  'ROBOT_OFFLINE',
  'IN_STORAGE',
  'CONTRACT_ENDED',
  'REGISTRATION_ERROR',
  'SYNC_PROBLEM',
  'OTHER',
];

/**
 * The reason's badge copy, or a neutral fallback for a value this build does not
 * know — an older backend sends the reason as free text, and a newer one may add a
 * case. Either way the row must render, not take the page down.
 */
function reasonOf(t: T, reason: string): { label: string; hint: string; tone: string } {
  if (reason in REASON_TONE) {
    return { label: t(`reason.${reason}.label`), hint: t(`reason.${reason}.hint`), tone: REASON_TONE[reason as ZeroDataRobot['reason']] };
  }
  return {
    label: reason || t('reasonUnknown'),
    hint: t('reasonUnknownHint'),
    tone: 'bg-[var(--app-faint)] text-[var(--app-muted)] ring-[var(--app-border)]',
  };
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
  const t = useTranslations('zeroData');
  if (r.contractStatus === 'ENDED') {
    return <Badge label={t('contractEnded')} tone={REASON_TONE.SYNC_FAILING} title={t('endedOn', { date: r.contractEndDate ?? '' })} />;
  }
  if (r.contractStatus === 'ENDING_SOON') {
    return <Badge label={t('endsIn', { days: r.daysToContractEnd ?? 0 })} tone={REASON_TONE.NO_TASKS} title={t('endsOn', { date: r.contractEndDate ?? '' })} />;
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
  const t = useTranslations('zeroData');
  const locale = useLocale();
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
          {FOLLOWUP_STATUSES.map((s) => (
            <option key={s} value={s}>{t(`status.${s}`)}</option>
          ))}
        </select>
        {status === 'RESOLVED' && (
          <select value={outcome} onChange={(e) => setOutcome(e.target.value as FollowupOutcome | '')} className={field}>
            <option value="">{t('outcomePlaceholder')}</option>
            {FOLLOWUP_OUTCOMES.map((o) => (
              <option key={o} value={o}>{t(`outcome.${o}`)}</option>
            ))}
          </select>
        )}
        <button
          type="button"
          onClick={() => save.mutate()}
          disabled={!canSave}
          title={status === 'RESOLVED' && outcome === '' ? t('saveNeedsOutcome') : t('saveTitle')}
          className="inline-flex h-8 items-center gap-1 rounded-lg bg-[var(--app-brand)] px-2.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
        >
          {save.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          {t('save')}
        </button>
      </div>
      <input
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={t('notePlaceholder')}
        className={`${field} w-full min-w-56`}
      />
      {robot.followupUpdatedBy && (
        <p className="text-[11px] text-[var(--app-muted)]">
          {robot.followupUpdatedBy} · {robot.followupUpdatedAt ? new Date(robot.followupUpdatedAt).toLocaleString(intlLocale(locale)) : ''}
        </p>
      )}
      {save.isError && <p className="text-[11px] text-red-600">{t('saveFailed')}</p>}
    </div>
  );
}

export function ZeroDataPanel() {
  const t = useTranslations('zeroData');
  const locale = useLocale();
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
          <p className="text-sm font-semibold text-[var(--app-text)]">{t('title')}</p>
          <p className="text-xs text-[var(--app-muted)]">
            {t('description')}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-3">
        <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--app-muted)]">
          {t('month')}
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
          {t('refresh')}
        </button>
        {data && (
          <div className="ml-auto flex flex-wrap items-center gap-2 text-xs">
            <span className="text-[var(--app-muted)]">
              {t.rich('summary', { zero: data.zeroData, inScope: data.inScope, month: data.monthLabel, b: (chunks) => <b className="text-[var(--app-text)]">{chunks}</b> })}
            </span>
            {data.toContact != null && (
              <>
                <Badge label={t('toContact', { count: data.toContact })} tone={REASON_TONE.NO_TASKS} />
                <Badge label={t('contacted', { count: data.contacted ?? 0 })} tone="bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-950/30 dark:text-sky-300 dark:ring-sky-900/40" />
                <Badge label={t('resolved', { count: data.resolved ?? 0 })} tone="bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:ring-emerald-900/40" />
              </>
            )}
          </div>
        )}
      </div>

      {query.isError && (
        <p className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {t('loadFailed')}
        </p>
      )}

      {data && data.robots.length === 0 && (
        <p className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {t('allGood', { month: data.monthLabel })}
        </p>
      )}

      {data && data.robots.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)]">
          <table className="w-full min-w-[72rem] text-left text-sm">
            <thead className="border-b border-[var(--app-border)] text-xs uppercase tracking-wide text-[var(--app-muted)]">
              <tr>
                <th className="px-3 py-2.5 font-semibold">{t('col.robot')}</th>
                <th className="px-3 py-2.5 font-semibold">{t('col.customer')}</th>
                <th className="px-3 py-2.5 font-semibold">{t('col.why')}</th>
                <th className="px-3 py-2.5 font-semibold">{t('col.lastData')}</th>
                <th className="px-3 py-2.5 font-semibold">{t('col.followup')}</th>
                <th className="px-3 py-2.5 font-semibold">{t('col.actions')}</th>
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
                        <Badge label={t('excludedFromReport')} tone="bg-[var(--app-faint)] text-[var(--app-muted)] ring-[var(--app-border)]" />
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <p>{r.customerName}</p>
                    <p className="text-xs text-[var(--app-muted)]">{r.site ?? '—'}</p>
                  </td>
                  <td className="px-3 py-2.5">
                    <Badge label={reasonOf(t, r.reason).label} tone={reasonOf(t, r.reason).tone} title={reasonOf(t, r.reason).hint} />
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
                        {r.daysSinceLastData != null && <span className="ml-1 text-[var(--app-muted)]">{t('daysAgo', { days: r.daysSinceLastData })}</span>}
                      </>
                    ) : (
                      <span className="text-[var(--app-muted)]">{t('never')}</span>
                    )}
                    {r.lastSyncSuccessAt && (
                      <p className="text-[11px] text-[var(--app-muted)]">{t('syncedOn', { date: new Date(r.lastSyncSuccessAt).toLocaleDateString(intlLocale(locale)) })}</p>
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
                        title={t('excludeTitle')}
                        className="inline-flex h-8 items-center gap-1 rounded-lg border border-[var(--app-border)] px-2.5 text-xs font-semibold text-[var(--app-text)] transition hover:border-[var(--app-brand)] disabled:opacity-40"
                      >
                        <EyeOff className="h-3.5 w-3.5" />
                        {r.excludedFromReport ? t('excluded') : t('excludeBtn')}
                      </button>
                      <button
                        type="button"
                        disabled={resync.isPending}
                        onClick={() => resync.mutate(r.serialNumber)}
                        title={t('resyncTitle')}
                        className="inline-flex h-8 items-center gap-1 rounded-lg border border-[var(--app-border)] px-2.5 text-xs font-semibold text-[var(--app-text)] transition hover:border-[var(--app-brand)] disabled:opacity-40"
                      >
                        {resync.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                        {t('resync')}
                      </button>
                      <Link
                        href="/tools?tab=robots"
                        className="inline-flex h-8 items-center gap-1 px-1 text-xs text-[var(--app-muted)] transition hover:text-[var(--app-brand-dark)]"
                        title={t('editTitle')}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        {t('edit')}
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
        {t('footnote')}
      </p>
    </div>
  );
}
