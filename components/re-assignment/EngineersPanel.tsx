'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { CalendarOff, Loader2, Pencil, Plus, ShieldCheck, Trash2, UserPlus } from 'lucide-react';
import { reAssignmentApi } from '@/lib/api';
import type { EngineerRequest, EngineerView, MondayPerson } from '@/lib/re-assignment/types';
import { Card, ErrorLine, fmtDate, inputClass, primaryButton, secondaryButton } from './shared';

const EMPTY: EngineerRequest = { fullName: '', nickname: '', email: '', mondayUserId: '', maxLoad: 6, note: '', active: true };

/** The RE team: add and edit engineers, link each to their monday account, leave, and who may approve. */
export function EngineersPanel({ isAdmin }: { isAdmin: boolean }) {
  const t = useTranslations('reAssignment.engineers');
  const qc = useQueryClient();
  const [editing, setEditing] = useState<string | 'new' | null>(null);

  const engineers = useQuery({
    queryKey: ['re-engineers'],
    queryFn: () => reAssignmentApi.engineers().then((r) => r.data.data ?? []),
  });
  const people = useQuery({
    queryKey: ['re-monday-people'],
    queryFn: () => reAssignmentApi.mondayPeople().then((r) => r.data.data ?? []),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['re-engineers'] });
    qc.invalidateQueries({ queryKey: ['re-monday-people'] });
    qc.invalidateQueries({ queryKey: ['re-queue'] });
    qc.invalidateQueries({ queryKey: ['re-skills'] });
  };

  const list = engineers.data ?? [];
  return (
    <div className="space-y-4">
      <Card
        title={t('title', { n: list.filter((e) => e.active).length })}
        hint={t('hint')}
        action={
          <button type="button" onClick={() => setEditing('new')} className={primaryButton}>
            <UserPlus className="h-4 w-4" />
            {t('add')}
          </button>
        }
      >
        {editing === 'new' && (
          <EngineerForm
            initial={EMPTY}
            people={people.data ?? []}
            onDone={() => {
              setEditing(null);
              invalidate();
            }}
            onCancel={() => setEditing(null)}
          />
        )}
        <ErrorLine error={engineers.error} fallback={t('loadFailed')} />
        {engineers.isLoading ? (
          <Loader2 className="mx-auto my-6 h-5 w-5 animate-spin text-[var(--app-muted)]" />
        ) : list.length === 0 ? (
          <p className="py-6 text-center text-sm text-[var(--app-muted)]">{t('empty')}</p>
        ) : (
          <div className="-mx-4 overflow-x-auto sm:-mx-5">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b border-[var(--app-border)] text-left text-xs font-semibold uppercase tracking-wide text-[var(--app-muted)]">
                  <th className="px-4 py-2 sm:px-5">{t('name')}</th>
                  <th className="px-2 py-2">{t('email')}</th>
                  <th className="px-2 py-2">{t('monday')}</th>
                  <th className="px-2 py-2">{t('load')}</th>
                  <th className="px-2 py-2">{t('skills')}</th>
                  <th className="px-2 py-2">{t('state')}</th>
                  <th className="px-4 py-2 sm:px-5" />
                </tr>
              </thead>
              <tbody>
                {list.map((e) =>
                  editing === e.id ? (
                    <tr key={e.id}>
                      <td colSpan={7} className="px-4 py-2 sm:px-5">
                        <EngineerForm
                          id={e.id}
                          initial={{
                            fullName: e.fullName,
                            nickname: e.nickname ?? '',
                            email: e.email ?? '',
                            mondayUserId: e.mondayUserId ?? '',
                            maxLoad: e.maxLoad,
                            note: e.note ?? '',
                            active: e.active,
                          }}
                          people={people.data ?? []}
                          onDone={() => {
                            setEditing(null);
                            invalidate();
                          }}
                          onCancel={() => setEditing(null)}
                        />
                      </td>
                    </tr>
                  ) : (
                    <EngineerRowView key={e.id} e={e} onEdit={() => setEditing(e.id)} />
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <LeaveCard engineers={list} />
      <ManagersCard isAdmin={isAdmin} />
    </div>
  );
}

function EngineerRowView({ e, onEdit }: { e: EngineerView; onEdit: () => void }) {
  const t = useTranslations('reAssignment.engineers');
  const pct = Math.min(100, (e.load / e.maxLoad) * 100);
  return (
    <tr className={`border-b border-[var(--app-border)] align-top ${e.active ? '' : 'opacity-60'}`}>
      <td className="px-4 py-2.5 sm:px-5">
        <p className="font-medium text-[var(--app-text)]">{e.nickname || e.fullName}</p>
        {e.nickname && <p className="text-xs text-[var(--app-muted)]">{e.fullName}</p>}
      </td>
      <td className="px-2 py-2.5 text-[var(--app-text)]">{e.email ?? <span className="text-amber-700 dark:text-amber-300">{t('noEmail')}</span>}</td>
      <td className="px-2 py-2.5">
        {e.mondayUserId ? (
          <span className="text-[var(--app-text)]">{e.mondayName ?? e.mondayUserId}</span>
        ) : (
          <span className="text-amber-700 dark:text-amber-300">{t('notLinked')}</span>
        )}
      </td>
      <td className="px-2 py-2.5">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-[var(--app-faint)]">
            <div
              className={`h-full rounded-full ${pct >= 100 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="tabular-nums text-xs text-[var(--app-muted)]">
            {e.load} / {e.maxLoad}
          </span>
        </div>
        <p className="text-xs text-[var(--app-muted)]">{t('openTickets', { n: e.openTickets })}</p>
      </td>
      <td className="px-2 py-2.5 text-xs text-[var(--app-muted)]">
        {e.assessedSkills > 0 ? t('assessed', { n: e.assessedSkills }) : <span className="text-amber-700 dark:text-amber-300">{t('unassessed')}</span>}
      </td>
      <td className="px-2 py-2.5 text-xs">
        {!e.active ? t('inactive') : e.onLeaveToday ? <span className="text-amber-700 dark:text-amber-300">{t('onLeave')}</span> : t('active')}
      </td>
      <td className="px-4 py-2.5 text-right sm:px-5">
        <button type="button" onClick={onEdit} className={secondaryButton}>
          <Pencil className="h-4 w-4" />
          {t('edit')}
        </button>
      </td>
    </tr>
  );
}

function EngineerForm({ id, initial, people, onDone, onCancel }: {
  id?: string;
  initial: EngineerRequest;
  people: MondayPerson[];
  onDone: () => void;
  onCancel: () => void;
}) {
  const t = useTranslations('reAssignment.engineers');
  const [f, setF] = useState<EngineerRequest>(initial);
  const save = useMutation({
    mutationFn: () => {
      const body: EngineerRequest = {
        fullName: f.fullName.trim(),
        nickname: f.nickname?.trim() || null,
        email: f.email?.trim() || null,
        mondayUserId: f.mondayUserId || null,
        maxLoad: f.maxLoad ? Number(f.maxLoad) : 6,
        note: f.note?.trim() || null,
        active: f.active,
      };
      return id ? reAssignmentApi.updateEngineer(id, body) : reAssignmentApi.createEngineer(body);
    },
    onSuccess: onDone,
  });
  const set = (k: keyof EngineerRequest, v: string | number | boolean) => setF((x) => ({ ...x, [k]: v }));

  return (
    <div className="mb-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-panel-alt)] p-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field label={`${t('fullName')} *`}>
          <input value={f.fullName} onChange={(e) => set('fullName', e.target.value)} className={inputClass} />
        </Field>
        <Field label={t('nickname')}>
          <input value={f.nickname ?? ''} onChange={(e) => set('nickname', e.target.value)} className={inputClass} />
        </Field>
        <Field label={t('email')}>
          <input type="email" value={f.email ?? ''} onChange={(e) => set('email', e.target.value)} className={inputClass} />
        </Field>
        <Field label={t('monday')} hint={t('mondayHint')}>
          <select value={f.mondayUserId ?? ''} onChange={(e) => set('mondayUserId', e.target.value)} className={inputClass}>
            <option value="">{t('notLinked')}</option>
            {people.map((p) => (
              <option key={p.id} value={p.id} disabled={!!p.linkedEngineerId && p.id !== initial.mondayUserId}>
                {(p.name ?? p.id) + ` (${p.openTickets})` + (p.linkedEngineerId && p.id !== initial.mondayUserId ? ` — ${t('taken')}` : '')}
              </option>
            ))}
            {f.mondayUserId && !people.some((p) => p.id === f.mondayUserId) && (
              <option value={f.mondayUserId}>{f.mondayUserId}</option>
            )}
          </select>
        </Field>
        <Field label={t('maxLoad')} hint={t('maxLoadHint')}>
          <input
            type="number"
            min={0.5}
            max={100}
            step={0.5}
            value={f.maxLoad ?? 6}
            onChange={(e) => set('maxLoad', e.target.value === '' ? 6 : Number(e.target.value))}
            className={inputClass}
          />
        </Field>
        <Field label={t('note')}>
          <input value={f.note ?? ''} onChange={(e) => set('note', e.target.value)} className={inputClass} />
        </Field>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label className="mr-auto inline-flex items-center gap-2 text-sm text-[var(--app-text)]">
          <input type="checkbox" checked={f.active ?? true} onChange={(e) => set('active', e.target.checked)} className="h-4 w-4" />
          {t('activeLabel')}
        </label>
        <button type="button" onClick={onCancel} className={secondaryButton}>
          {t('cancel')}
        </button>
        <button type="button" disabled={save.isPending || !f.fullName.trim()} onClick={() => save.mutate()} className={primaryButton}>
          {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {id ? t('save') : t('create')}
        </button>
      </div>
      <div className="mt-2">
        <ErrorLine error={save.error} fallback={t('saveFailed')} />
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--app-muted)]">
      {label}
      {children}
      {hint && <span className="font-normal">{hint}</span>}
    </label>
  );
}

function LeaveCard({ engineers }: { engineers: EngineerView[] }) {
  const t = useTranslations('reAssignment.engineers');
  const locale = useLocale();
  const qc = useQueryClient();
  const leave = useQuery({ queryKey: ['re-leave'], queryFn: () => reAssignmentApi.leave().then((r) => r.data.data ?? []) });
  const today = new Date().toISOString().slice(0, 10);
  const [f, setF] = useState({ engineerId: '', startsOn: today, endsOn: today, note: '' });
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['re-leave'] });
    qc.invalidateQueries({ queryKey: ['re-engineers'] });
    qc.invalidateQueries({ queryKey: ['re-queue'] });
  };
  const add = useMutation({
    mutationFn: () => reAssignmentApi.addLeave({ ...f, note: f.note || undefined }),
    onSuccess: () => {
      setF({ ...f, note: '' });
      invalidate();
    },
  });
  const remove = useMutation({ mutationFn: (id: string) => reAssignmentApi.deleteLeave(id), onSuccess: invalidate });

  return (
    <Card title={t('leaveTitle')} hint={t('leaveHint')}>
      <div className="flex flex-wrap items-end gap-2">
        <Field label={t('engineer')}>
          <select value={f.engineerId} onChange={(e) => setF({ ...f, engineerId: e.target.value })} className={inputClass}>
            <option value="">{t('pick')}</option>
            {engineers.filter((e) => e.active).map((e) => (
              <option key={e.id} value={e.id}>{e.displayName}</option>
            ))}
          </select>
        </Field>
        <Field label={t('from')}>
          <input type="date" value={f.startsOn} onChange={(e) => setF({ ...f, startsOn: e.target.value })} className={inputClass} />
        </Field>
        <Field label={t('to')}>
          <input type="date" value={f.endsOn} min={f.startsOn} onChange={(e) => setF({ ...f, endsOn: e.target.value })} className={inputClass} />
        </Field>
        <Field label={t('note')}>
          <input value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} className={inputClass} />
        </Field>
        <button type="button" disabled={!f.engineerId || add.isPending} onClick={() => add.mutate()} className={primaryButton}>
          <Plus className="h-4 w-4" />
          {t('addLeave')}
        </button>
      </div>
      <ErrorLine error={add.error ?? remove.error} fallback={t('saveFailed')} />
      <ul className="mt-3 divide-y divide-[var(--app-border)] text-sm">
        {(leave.data ?? []).length === 0 && <li className="py-2 text-[var(--app-muted)]">{t('noLeave')}</li>}
        {(leave.data ?? []).map((l) => (
          <li key={l.id} className="flex items-center gap-3 py-2">
            <CalendarOff className="h-4 w-4 text-[var(--app-muted)]" />
            <span className="font-medium text-[var(--app-text)]">{l.engineerName}</span>
            <span className="text-[var(--app-muted)]">
              {fmtDate(l.startsOn, locale)} – {fmtDate(l.endsOn, locale)}
              {l.note ? ` · ${l.note}` : ''}
            </span>
            <button type="button" onClick={() => remove.mutate(l.id)} className="ml-auto text-[var(--app-muted)] hover:text-red-600" aria-label={t('remove')}>
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function ManagersCard({ isAdmin }: { isAdmin: boolean }) {
  const t = useTranslations('reAssignment.engineers');
  const qc = useQueryClient();
  const [email, setEmail] = useState('');
  const managers = useQuery({ queryKey: ['re-managers'], queryFn: () => reAssignmentApi.managers().then((r) => r.data.data ?? []) });
  const grant = useMutation({
    mutationFn: () => reAssignmentApi.grant(email.trim()),
    onSuccess: () => {
      setEmail('');
      qc.invalidateQueries({ queryKey: ['re-managers'] });
    },
  });
  const revoke = useMutation({
    mutationFn: (id: string) => reAssignmentApi.revoke(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['re-managers'] }),
  });
  return (
    <Card title={t('managersTitle')} hint={t('managersHint')}>
      {isAdmin && (
        <div className="mb-3 flex flex-wrap items-end gap-2">
          <Field label={t('userEmail')}>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={`${inputClass} min-w-64`} />
          </Field>
          <button type="button" disabled={!email.trim() || grant.isPending} onClick={() => grant.mutate()} className={primaryButton}>
            <ShieldCheck className="h-4 w-4" />
            {t('grant')}
          </button>
        </div>
      )}
      <ErrorLine error={grant.error ?? revoke.error} fallback={t('saveFailed')} />
      <ul className="divide-y divide-[var(--app-border)] text-sm">
        {(managers.data ?? []).length === 0 && <li className="py-2 text-[var(--app-muted)]">{t('noManagers')}</li>}
        {(managers.data ?? []).map((m) => (
          <li key={m.userId} className="flex items-center gap-3 py-2">
            <span className="font-medium text-[var(--app-text)]">{m.fullName}</span>
            <span className="text-[var(--app-muted)]">{m.email}</span>
            {isAdmin && (
              <button type="button" onClick={() => revoke.mutate(m.userId)} className="ml-auto text-[var(--app-muted)] hover:text-red-600" aria-label={t('remove')}>
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
