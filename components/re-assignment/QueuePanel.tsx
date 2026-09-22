'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Info,
  Loader2,
  Mail,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  Search,
  UserCheck,
  XCircle,
} from 'lucide-react';
import { reAssignmentApi } from '@/lib/api';
import type { ApproveBody, Candidate, Outcome, QueueRow, QueueView } from '@/lib/re-assignment/types';
import {
  Card,
  ErrorLine,
  LevelBadge,
  fmtDate,
  fmtDateTime,
  inputClass,
  primaryButton,
  secondaryButton,
} from './shared';

const OUTCOME_ORDER: Outcome[] = ['SUGGESTED', 'APPROVED', 'ALL_BUSY', 'NO_QUALIFIED', 'HELD', 'MANUAL', 'ASSIGNED'];

const OUTCOME_STYLE: Record<Outcome, string> = {
  SUGGESTED: 'bg-[var(--app-brand-soft)] text-[var(--app-brand-dark)]',
  APPROVED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
  ASSIGNED: 'bg-[var(--app-faint)] text-[var(--app-muted)]',
  MANUAL: 'bg-[var(--app-faint)] text-[var(--app-text)]',
  HELD: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  NO_QUALIFIED: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300',
  ALL_BUSY: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
};

/**
 * The assignment queue: every open CM ticket on the Cleaning board with the system's
 * suggestion, or the reason there is none. The Senior RE approves, picks someone else,
 * or holds the ticket back; approved tickets wait here until the RE appears on monday.
 */
export function QueuePanel({ onGoTo }: { onGoTo: (tab: 'engineers' | 'skills' | 'mapping') => void }) {
  const t = useTranslations('reAssignment.queue');
  const locale = useLocale();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Outcome | 'ALL'>('SUGGESTED');
  const [search, setSearch] = useState('');
  const [openRow, setOpenRow] = useState<string | null>(null);

  const queue = useQuery({
    queryKey: ['re-queue'],
    queryFn: () => reAssignmentApi.queue().then((r) => r.data.data),
  });
  const refresh = useMutation({
    mutationFn: () => reAssignmentApi.refresh().then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['re-queue'] }),
  });

  const data = queue.data;
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data?.rows ?? []).filter((r) => {
      if (filter !== 'ALL' && r.outcome !== filter) return false;
      if (!q) return true;
      return [r.name, r.customer, r.branch, r.modelLabel, r.serial, r.itemId, r.suggested?.name, ...r.people]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [data, filter, search]);

  return (
    <div className="space-y-4">
      {/* Summary and actions */}
      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setFilter('ALL')}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              filter === 'ALL' ? 'bg-[var(--app-brand)] text-white' : 'text-[var(--app-muted)] hover:text-[var(--app-text)]'
            }`}
          >
            {t('all')} <span className="tabular-nums">{data?.openTickets ?? 0}</span>
          </button>
          {OUTCOME_ORDER.map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => setFilter(o)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                filter === o ? 'ring-2 ring-[var(--app-brand)]' : ''
              } ${OUTCOME_STYLE[o]}`}
            >
              {t(`outcome.${o}`)} <span className="tabular-nums">{data?.counts?.[o] ?? 0}</span>
            </button>
          ))}
          <span className="ml-auto text-xs text-[var(--app-muted)]">
            {data?.lastRefreshAt ? t('refreshedAt', { at: fmtDateTime(data.lastRefreshAt, locale) }) : t('notRefreshed')}
          </span>
          {data?.canManage && (
            <button type="button" onClick={() => refresh.mutate()} disabled={refresh.isPending} className={secondaryButton}>
              {refresh.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {t('refresh')}
            </button>
          )}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[var(--app-muted)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('search')}
              className={`${inputClass} w-full pl-9`}
            />
          </div>
        </div>
      </Card>

      {refresh.data && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
          {t('refreshDone', {
            open: refresh.data.openInActiveGroups,
            fresh: refresh.data.newTickets,
            confirmed: refresh.data.confirmed,
            superseded: refresh.data.superseded,
          })}
        </p>
      )}
      <ErrorLine error={refresh.error ?? queue.error} fallback={t('loadFailed')} />

      {data && data.canManage && <Notices data={data} onGoTo={onGoTo} />}

      {/* Rows */}
      <Card title={t('ticketsTitle', { n: rows.length })} hint={t('ticketsHint')}>
        {queue.isLoading ? (
          <p className="py-8 text-center text-sm text-[var(--app-muted)]">
            <Loader2 className="mx-auto h-5 w-5 animate-spin" />
          </p>
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--app-muted)]">
            {data?.lastRefreshAt || (data?.openTickets ?? 0) > 0 ? t('empty') : t('emptyFirst')}
          </p>
        ) : (
          <div className="-mx-4 divide-y divide-[var(--app-border)] sm:-mx-5">
            {rows.map((row) => (
              <TicketRow
                key={row.itemId}
                row={row}
                canManage={data?.canManage ?? false}
                mondayWrite={data?.mondayWriteEnabled ?? false}
                expanded={openRow === row.itemId}
                onToggle={() => setOpenRow(openRow === row.itemId ? null : row.itemId)}
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function Notices({ data, onGoTo }: { data: QueueView; onGoTo: (tab: 'engineers' | 'skills' | 'mapping') => void }) {
  const t = useTranslations('reAssignment.queue');
  const notes: { text: string; action?: { label: string; tab: 'engineers' | 'skills' | 'mapping' } }[] = [];
  if (data.engineers === 0) notes.push({ text: t('noEngineers'), action: { label: t('goSkills'), tab: 'skills' } });
  if (data.engineersWithoutMondayId > 0) {
    notes.push({ text: t('missingMonday', { n: data.engineersWithoutMondayId }), action: { label: t('goEngineers'), tab: 'engineers' } });
  }
  if (data.mondayWriteEnabled) notes.push({ text: t('mondayWriteOn') });
  if (!data.emailEnabled) notes.push({ text: t('emailOff') });
  if (notes.length === 0) return null;
  return (
    <div className="space-y-2">
      {notes.map((n) => (
        <p
          key={n.text}
          className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] px-3 py-2 text-sm text-[var(--app-muted)]"
        >
          <Info className="h-4 w-4 shrink-0 text-[var(--app-brand-dark)]" />
          <span>{n.text}</span>
          {n.action && (
            <button type="button" onClick={() => onGoTo(n.action!.tab)} className="font-semibold text-[var(--app-brand-dark)] hover:underline">
              {n.action.label}
            </button>
          )}
        </p>
      ))}
    </div>
  );
}

type ApproveInput = Omit<ApproveBody, 'itemId'>;

function TicketRow({ row, canManage, mondayWrite, expanded, onToggle }: {
  row: QueueRow;
  canManage: boolean;
  mondayWrite: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  const t = useTranslations('reAssignment.queue');
  const tz = useTranslations('reAssignment.zone');
  const locale = useLocale();
  const qc = useQueryClient();
  const [choosing, setChoosing] = useState(false);
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['re-queue'] });
    qc.invalidateQueries({ queryKey: ['re-history'] });
  };

  const approve = useMutation({
    mutationFn: (v: ApproveInput) => reAssignmentApi.approve({ itemId: row.itemId, ...v }).then((r) => r.data.data),
    onSuccess: () => {
      setChoosing(false);
      invalidate();
    },
  });
  const hold = useMutation({
    mutationFn: (reason: string) => reAssignmentApi.hold(row.itemId, reason),
    onSuccess: invalidate,
  });
  const release = useMutation({ mutationFn: () => reAssignmentApi.release(row.itemId), onSuccess: invalidate });
  const cancel = useMutation({
    mutationFn: (reason: string) => reAssignmentApi.cancel(row.assignment!.id, reason),
    onSuccess: invalidate,
  });
  const resend = useMutation({ mutationFn: () => reAssignmentApi.resendEmail(row.assignment!.id), onSuccess: invalidate });

  const busy = approve.isPending || hold.isPending || release.isPending || cancel.isPending || resend.isPending;
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
  const futureDay = row.forDate && row.forDate !== today ? row.forDate : null;
  // A current approval can be withdrawn whether it is still waiting or already on monday.
  const ownAssignment = row.assignment && (row.outcome === 'APPROVED' || row.outcome === 'ASSIGNED') ? row.assignment : null;

  // One line per ticket: what it is, who, and the actions. Everything else is in the drop-down.
  const who =
    row.outcome === 'SUGGESTED' && row.suggested ? nick(row.suggested.name)
      : row.assignment ? nick(row.assignment.engineerName)
        : row.outcome === 'ASSIGNED' ? row.people.map(nick).join(', ')
          : t(`outcome.${row.outcome}`);

  return (
    <div className={expanded ? 'bg-[var(--app-panel-alt)]' : ''}>
      <div className="flex items-center gap-3 px-4 py-2 sm:px-5">
        <button type="button" onClick={onToggle} className="flex min-w-0 flex-1 items-center gap-2 text-left" title={row.name ?? ''}>
          {expanded ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
          <span className="truncate text-sm font-medium text-[var(--app-text)]">{row.name ?? row.itemId}</span>
          {row.zone && (
            <span className="shrink-0 rounded bg-sky-100 px-1.5 py-px text-[11px] font-semibold text-sky-800 dark:bg-sky-950/40 dark:text-sky-300">
              {tz(row.zone)}
            </span>
          )}
        </button>

        <span
          className={`inline-flex max-w-44 shrink-0 items-center gap-1 truncate rounded-md px-2 py-0.5 text-xs font-semibold ${OUTCOME_STYLE[row.outcome]}`}
          title={[t(`outcome.${row.outcome}`), row.assumedDifficulty ? t('assumed') : null, futureDay ? t('forDay', { date: fmtDate(futureDay, locale) }) : null]
            .filter(Boolean).join(' · ')}
        >
          <span className="truncate">{who}</span>
          {row.assumedDifficulty && row.outcome === 'SUGGESTED' && <span className="text-amber-600 dark:text-amber-400">?</span>}
        </span>

        {canManage && (
          <div className="flex shrink-0 items-center gap-1">
            {row.outcome === 'SUGGESTED' && row.suggested && (
              <button
                type="button"
                disabled={busy}
                onClick={() => approve.mutate({ engineerId: row.suggested!.engineerId, origin: 'SUGGESTION' })}
                title={mondayWrite ? t('approveWritesHint') : t('approve')}
                className={`${primaryButton} !px-2.5 !py-1 text-xs`}
              >
                {approve.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                {t('approve')}
              </button>
            )}
            {['SUGGESTED', 'ALL_BUSY', 'NO_QUALIFIED', 'MANUAL', 'HELD'].includes(row.outcome) && (
              <IconButton title={t('choose')} disabled={busy} onClick={() => setChoosing((v) => !v)}>
                <UserCheck className="h-4 w-4" />
              </IconButton>
            )}
            {['SUGGESTED', 'ALL_BUSY', 'NO_QUALIFIED'].includes(row.outcome) && (
              <IconButton
                title={`${t('hold')} - ${t('holdHint')}`}
                disabled={busy}
                onClick={() => {
                  const reason = window.prompt(t('holdPrompt'));
                  if (reason && reason.trim()) hold.mutate(reason.trim());
                }}
              >
                <PauseCircle className="h-4 w-4" />
              </IconButton>
            )}
            {row.outcome === 'HELD' && (
              <IconButton title={t('release')} disabled={busy} onClick={() => release.mutate()}>
                <PlayCircle className="h-4 w-4" />
              </IconButton>
            )}
            {ownAssignment && (
              <>
                <IconButton title={`${t('resend')}${ownAssignment.emailDetail ? ` - ${ownAssignment.emailDetail}` : ''}`} disabled={busy} onClick={() => resend.mutate()}>
                  <Mail className="h-4 w-4" />
                </IconButton>
                <IconButton
                  title={ownAssignment.mondayStatus === 'WRITTEN' ? `${t('cancel')} - ${t('cancelWritesHint')}` : t('cancel')}
                  disabled={busy}
                  onClick={() => {
                    const reason = window.prompt(ownAssignment.mondayStatus === 'WRITTEN' ? t('cancelPromptMonday') : t('cancelPrompt'));
                    if (reason && reason.trim()) cancel.mutate(reason.trim());
                  }}
                >
                  <XCircle className="h-4 w-4" />
                </IconButton>
              </>
            )}
            {row.mondayUrl && (
              <a href={row.mondayUrl} target="_blank" rel="noreferrer" title={t('openMonday')}
                 className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--app-muted)] hover:bg-[var(--app-faint)] hover:text-[var(--app-text)]">
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </div>
        )}
      </div>

      <div className="px-4 sm:px-5">
        <ErrorLine error={approve.error ?? hold.error ?? release.error ?? cancel.error ?? resend.error} fallback={t('actionFailed')} />
      </div>

      {choosing && canManage && (
        <ChoosePanel row={row} busy={approve.isPending} mondayWrite={mondayWrite} onApprove={(v) => approve.mutate(v)} onClose={() => setChoosing(false)} />
      )}
      {expanded && <Detail row={row} canManage={canManage} />}
    </div>
  );
}

/** Pick an alternative, or anyone active, with a reason - and optionally book them for the days the job takes. */
function ChoosePanel({ row, busy, mondayWrite, onApprove, onClose }: {
  row: QueueRow;
  busy: boolean;
  mondayWrite: boolean;
  onApprove: (v: ApproveInput) => void;
  onClose: () => void;
}) {
  const t = useTranslations('reAssignment.queue');
  const engineers = useQuery({
    queryKey: ['re-engineers'],
    queryFn: () => reAssignmentApi.engineers().then((r) => r.data.data ?? []),
  });
  const ranked = [row.suggested, ...row.alternatives].filter(Boolean) as Candidate[];
  const [engineerId, setEngineerId] = useState<string>(ranked[1]?.engineerId ?? ranked[0]?.engineerId ?? '');
  const [reason, setReason] = useState('');
  const [bookedFrom, setBookedFrom] = useState(row.forDate ?? '');
  const [bookedTo, setBookedTo] = useState('');
  const bookingInvalid = (bookedTo !== '' && bookedFrom === '') || (bookedFrom !== '' && bookedTo !== '' && bookedTo < bookedFrom);
  const isSuggested = row.suggested?.engineerId === engineerId;
  const isRanked = ranked.some((c) => c.engineerId === engineerId);
  const exclusion = row.excluded.find((x) => x.engineerId === engineerId);

  return (
    <div className="mx-4 mb-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-3 sm:mx-5">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-64 flex-1 flex-col gap-1 text-xs font-semibold text-[var(--app-muted)]">
          {t('engineer')}
          <select value={engineerId} onChange={(e) => setEngineerId(e.target.value)} className={inputClass}>
            <option value="">{t('pick')}</option>
            {ranked.length > 0 && (
              <optgroup label={t('ranked')}>
                {ranked.map((c) => (
                  <option key={c.engineerId} value={c.engineerId}>
                    {c.name} · {t('score')} {c.score ?? '—'}
                  </option>
                ))}
              </optgroup>
            )}
            <optgroup label={t('everyone')}>
              {(engineers.data ?? [])
                .filter((e) => e.active && !ranked.some((c) => c.engineerId === e.id))
                .map((e) => {
                  const x = row.excluded.find((ex) => ex.engineerId === e.id);
                  return (
                    <option key={e.id} value={e.id}>
                      {e.displayName}
                      {x ? ` — ${x.reason}` : ''}
                    </option>
                  );
                })}
            </optgroup>
          </select>
        </label>
        <label className="flex min-w-64 flex-[2] flex-col gap-1 text-xs font-semibold text-[var(--app-muted)]">
          {t('reason')} {!isSuggested && <span className="text-red-600">*</span>}
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t('reasonHint')} className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--app-muted)]" title={t('bookHint')}>
          {t('bookFrom')}
          <input type="date" value={bookedFrom} onChange={(e) => setBookedFrom(e.target.value)} className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--app-muted)]" title={t('bookHint')}>
          {t('bookTo')}
          <input type="date" value={bookedTo} min={bookedFrom || undefined} onChange={(e) => setBookedTo(e.target.value)} className={inputClass} />
        </label>
        <button
          type="button"
          disabled={busy || !engineerId || (!isSuggested && !reason.trim()) || bookingInvalid}
          onClick={() =>
            onApprove({
              engineerId,
              origin: isSuggested ? 'SUGGESTION' : isRanked ? 'ALTERNATIVE' : 'MANUAL',
              reason: reason.trim() || undefined,
              // A booking needs an end date; the pre-filled start date alone books nothing.
              bookedFrom: bookedTo ? bookedFrom : undefined,
              bookedTo: bookedTo || undefined,
            })
          }
          className={primaryButton}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          {t('assign')}
        </button>
        <button type="button" onClick={onClose} className={secondaryButton}>
          {t('close')}
        </button>
      </div>
      <p className="mt-2 text-xs text-[var(--app-muted)]">{t('bookHint')}{mondayWrite ? ` ${t('approveWritesHint')}` : ''}</p>
      {exclusion && <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">{t('overrideWarning', { reason: exclusion.reason })}</p>}
    </div>
  );
}

/** Why: every candidate's levels, load and score parts, and why others were left out. */
function Detail({ row, canManage }: { row: QueueRow; canManage: boolean }) {
  const t = useTranslations('reAssignment.queue');
  const locale = useLocale();
  const ranked = [row.suggested, ...row.alternatives].filter(Boolean) as Candidate[];
  return (
    <div className="grid gap-4 px-4 pb-4 sm:px-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
        <Fact label={t('facts.site')} value={[row.customer, row.branch].filter(Boolean).join(' · ')} />
        <Fact label={t('facts.opened')} value={fmtDate(row.openDate, locale)} />
        <Fact label={t('facts.robot')} value={[row.modelLabel, row.modelName && row.modelName !== row.modelLabel ? `→ ${row.modelName}` : null].filter(Boolean).join(' ')} />
        <Fact
          label={t('facts.difficulty')}
          value={[row.issueLevel ?? t('noDifficulty'), row.requiredLevel ? `${t('needs')} L${row.requiredLevel}` : null, row.assumedDifficulty ? t('assumed') : null]
            .filter(Boolean).join(' · ')}
        />
        <Fact label={t('facts.caseType')} value={[row.caseType, row.serviceMode].filter(Boolean).join(' · ')} />
        {row.suggested && row.outcome === 'SUGGESTED' && <Fact label={t('facts.suggested')} value={row.suggested.name} />}
        {row.assignment && <Fact label={t('facts.assigned')} value={row.assignment.engineerName} />}
        <Fact label={t('facts.group')} value={row.group} />
        <Fact label={t('facts.status')} value={[row.status, row.subStatus].filter(Boolean).join(' · ')} />
        <Fact label={t('facts.serial')} value={row.serial} />
        <Fact label={t('facts.issue')} value={row.mainIssue} />
        <Fact label={t('facts.category')} value={row.issueCategory ? t(`category.${row.issueCategory}`) : null} />
        <Fact label={t('facts.reason')} value={row.reason} />
        <Fact label={t('facts.forDate')} value={row.forDate} />
        <Fact label={t('facts.people')} value={row.people.join(', ')} />
        {row.assignment && (
          <>
            <Fact label={t('facts.approvedBy')} value={`${row.assignment.approvedBy} · ${row.assignment.origin}`} />
            <Fact label={t('facts.why')} value={row.assignment.reason} />
            <Fact label={t('facts.monday')} value={[t(`monday.${row.assignment.mondayStatus}`), row.assignment.mondayDetail].filter(Boolean).join(' · ')} />
            <Fact label={t('facts.email')} value={row.assignment.emailDetail} />
          </>
        )}
      </dl>
      {canManage && (ranked.length > 0 || row.excluded.length > 0) && (
        <div className="space-y-3 text-xs">
          {ranked.length > 0 && (
            <table className="w-full">
              <thead>
                <tr className="text-left text-[var(--app-muted)]">
                  <th className="py-1 pr-2">{t('engineer')}</th>
                  <th className="py-1 pr-2">{row.modelName ?? t('model')}</th>
                  <th className="py-1 pr-2">CM</th>
                  <th className="py-1 pr-2">{t('load')}</th>
                  <th className="py-1 pr-2 text-right">{t('score')}</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((c, i) => (
                  <tr key={c.engineerId} className="border-t border-[var(--app-border)]" title={Object.entries(c.components ?? {}).map(([k, v]) => `${k}: ${v}`).join('\n')}>
                    <td className="py-1 pr-2 font-medium text-[var(--app-text)]">
                      {i === 0 && row.outcome === 'SUGGESTED' ? '★ ' : ''}
                      {c.name}
                    </td>
                    <td className="py-1 pr-2"><LevelBadge level={c.modelLevel} /></td>
                    <td className="py-1 pr-2"><LevelBadge level={c.cmLevel} /></td>
                    <td className="py-1 pr-2 tabular-nums text-[var(--app-muted)]">
                      {c.currentLoad} → {c.projectedLoad} / {c.maxLoad}
                    </td>
                    <td className="py-1 pr-2 text-right font-semibold tabular-nums text-[var(--app-text)]">{c.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {row.excluded.length > 0 && (
            <div>
              <p className="mb-1 font-semibold text-[var(--app-muted)]">{t('excluded')}</p>
              <ul className="space-y-0.5">
                {row.excluded.map((x) => (
                  <li key={x.engineerId} className="flex flex-wrap items-center gap-1.5 text-[var(--app-muted)]">
                    <span className="text-[var(--app-text)]">{x.name}</span>
                    <LevelBadge level={x.modelLevel} />
                    <LevelBadge level={x.cmLevel} prefix="CM" />
                    <span>— {x.reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-[var(--app-muted)]">{t('scoreHint')}</p>
        </div>
      )}
    </div>
  );
}

/** "Jay (ภูวนาถ คงพูล)" -> "Jay": the row shows the nickname, the drop-down the full name. */
function nick(name: string | null | undefined): string {
  return (name ?? '').replace(/\s*\(.*\)\s*$/, '') || '—';
}

function IconButton({ title, disabled, onClick, children }: {
  title: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--app-muted)] hover:bg-[var(--app-faint)] hover:text-[var(--app-text)] disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function Fact({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <>
      <dt className="text-[var(--app-muted)]">{label}</dt>
      <dd className="min-w-0 break-words text-[var(--app-text)]">{value}</dd>
    </>
  );
}
