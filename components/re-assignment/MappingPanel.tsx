'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Check, Loader2 } from 'lucide-react';
import { reAssignmentApi } from '@/lib/api';
import type { MappingView } from '@/lib/re-assignment/types';
import { Card, ErrorLine, inputClass, primaryButton } from './shared';

/**
 * Which board "Type of Robot" labels count as which skill-matrix model. Only MAPPED labels
 * are auto-suggested; the busiest labels come first so the ones that matter are on top.
 */
export function MappingPanel() {
  const t = useTranslations('reAssignment.mapping');
  const mappings = useQuery({ queryKey: ['re-mappings'], queryFn: () => reAssignmentApi.mappings().then((r) => r.data.data ?? []) });
  const skills = useQuery({ queryKey: ['re-skills'], queryFn: () => reAssignmentApi.skills().then((r) => r.data.data) });
  const models = (skills.data?.skills ?? []).filter((s) => s.groupCode === 'MODEL' && s.boardType === 'CLEANING');

  return (
    <Card title={t('title')} hint={t('hint')}>
      <ErrorLine error={mappings.error} fallback={t('loadFailed')} />
      {mappings.isLoading ? (
        <Loader2 className="mx-auto my-6 h-5 w-5 animate-spin text-[var(--app-muted)]" />
      ) : (
        <div className="-mx-4 overflow-x-auto sm:-mx-5">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-[var(--app-border)] text-left text-xs font-semibold uppercase tracking-wide text-[var(--app-muted)]">
                <th className="px-4 py-2 sm:px-5">{t('label')}</th>
                <th className="px-2 py-2 text-right">{t('open')}</th>
                <th className="px-2 py-2">{t('disposition')}</th>
                <th className="px-2 py-2">{t('model')}</th>
                <th className="px-2 py-2">{t('note')}</th>
                <th className="px-4 py-2 sm:px-5" />
              </tr>
            </thead>
            <tbody>
              {(mappings.data ?? []).map((m) => (
                <MappingRow key={m.label} m={m} models={models.map((x) => ({ code: x.code, label: x.label }))} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function MappingRow({ m, models }: { m: MappingView; models: { code: string; label: string }[] }) {
  const t = useTranslations('reAssignment.mapping');
  const qc = useQueryClient();
  const [disposition, setDisposition] = useState(m.disposition);
  const [skillCode, setSkillCode] = useState(m.skillCode ?? '');
  const [note, setNote] = useState(m.note ?? '');
  const dirty = disposition !== m.disposition || (skillCode || null) !== m.skillCode || (note || null) !== (m.note || null);
  const save = useMutation({
    mutationFn: () =>
      reAssignmentApi.saveMapping({ label: m.label, disposition, skillCode: disposition === 'MAPPED' ? skillCode : null, note: note || null }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['re-mappings'] });
      qc.invalidateQueries({ queryKey: ['re-queue'] });
    },
  });

  return (
    <tr className="border-b border-[var(--app-border)] align-top">
      <td className="px-4 py-2 font-medium text-[var(--app-text)] sm:px-5">{m.label}</td>
      <td className="px-2 py-2 text-right tabular-nums text-[var(--app-muted)]">{m.openTickets}</td>
      <td className="px-2 py-2">
        <select value={disposition} onChange={(e) => setDisposition(e.target.value as MappingView['disposition'])} className={inputClass}>
          <option value="MAPPED">{t('kind.MAPPED')}</option>
          <option value="UNCONFIRMED">{t('kind.UNCONFIRMED')}</option>
          <option value="MANUAL">{t('kind.MANUAL')}</option>
        </select>
      </td>
      <td className="px-2 py-2">
        <select value={skillCode} disabled={disposition !== 'MAPPED'} onChange={(e) => setSkillCode(e.target.value)} className={inputClass}>
          <option value="">—</option>
          {models.map((x) => (
            <option key={x.code} value={x.code}>{x.label}</option>
          ))}
        </select>
      </td>
      <td className="px-2 py-2">
        <input value={note} onChange={(e) => setNote(e.target.value)} className={`${inputClass} w-full`} />
        <ErrorLine error={save.error} fallback={t('saveFailed')} />
      </td>
      <td className="px-4 py-2 text-right sm:px-5">
        <button
          type="button"
          disabled={!dirty || save.isPending || (disposition === 'MAPPED' && !skillCode)}
          onClick={() => save.mutate()}
          className={primaryButton}
        >
          {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {t('save')}
        </button>
      </td>
    </tr>
  );
}
