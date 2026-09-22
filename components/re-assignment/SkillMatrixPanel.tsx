'use client';

import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { FileSpreadsheet, Loader2, RotateCcw, Save, Upload } from 'lucide-react';
import { reAssignmentApi } from '@/lib/api';
import type { ImportPreview, LevelChange, SkillView } from '@/lib/re-assignment/types';
import { levelClass, levelText } from '@/lib/re-assignment/types';
import { Card, ErrorLine, fmtDateTime, inputClass, primaryButton, secondaryButton } from './shared';

type Board = 'CLEANING' | 'DELIVERY' | 'ALL';

const GROUP_ORDER = ['CM', 'MODEL', 'EXPERTISE', 'OVERALL', 'PM', 'INSTALLATION', 'SOFT'];

/**
 * The skill matrix as an editable grid: one row per engineer, one column per skill,
 * L1–L4 or "-". Changes are collected and saved together as one revision with a reason.
 * The Senior RE's workbook can be imported instead (preview first, then commit).
 */
export function SkillMatrixPanel() {
  const t = useTranslations('reAssignment.skills');
  const locale = useLocale();
  const qc = useQueryClient();
  const [board, setBoard] = useState<Board>('CLEANING');
  const [pending, setPending] = useState<Record<string, number | null>>({});
  const [reason, setReason] = useState('');

  const matrix = useQuery({ queryKey: ['re-skills'], queryFn: () => reAssignmentApi.skills().then((r) => r.data.data) });
  // Engineers out of the rotation keep their levels, but are not shown or edited here.
  const activeRows = (matrix.data?.rows ?? []).filter((r) => r.active);
  const save = useMutation({
    mutationFn: () => {
      const changes: LevelChange[] = Object.entries(pending).map(([k, level]) => {
        const [engineerId, skillCode] = k.split('|');
        return { engineerId, skillCode, level };
      });
      return reAssignmentApi.updateSkills(changes, reason.trim()).then((r) => r.data.data);
    },
    onSuccess: () => {
      setPending({});
      setReason('');
      qc.invalidateQueries({ queryKey: ['re-skills'] });
      qc.invalidateQueries({ queryKey: ['re-queue'] });
      qc.invalidateQueries({ queryKey: ['re-engineers'] });
    },
  });

  const skills = useMemo(() => {
    const all = matrix.data?.skills ?? [];
    // Soft skills (COMMON) are shown on the All view only; they play no part in assignment.
    const shown = all.filter((s) => board === 'ALL' || s.boardType === board);
    return [...shown].sort(
      (a, b) => GROUP_ORDER.indexOf(a.groupCode) - GROUP_ORDER.indexOf(b.groupCode) || a.ordinal - b.ordinal,
    );
  }, [matrix.data, board]);

  const groups = useMemo(() => {
    const out: { group: string; span: number }[] = [];
    for (const s of skills) {
      const last = out[out.length - 1];
      if (last && last.group === s.groupCode) last.span++;
      else out.push({ group: s.groupCode, span: 1 });
    }
    return out;
  }, [skills]);

  const count = Object.keys(pending).length;

  return (
    <div className="space-y-4">
      <Card
        title={t('title')}
        hint={t('hint')}
        action={
          <div className="inline-flex rounded-lg border border-[var(--app-border)] p-0.5 text-sm">
            {(['CLEANING', 'DELIVERY', 'ALL'] as Board[]).map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setBoard(b)}
                className={`rounded-md px-3 py-1.5 font-medium ${board === b ? 'bg-[var(--app-brand)] text-white' : 'text-[var(--app-muted)]'}`}
              >
                {t(`board.${b}`)}
              </button>
            ))}
          </div>
        }
      >
        <ErrorLine error={matrix.error} fallback={t('loadFailed')} />
        {matrix.isLoading ? (
          <Loader2 className="mx-auto my-6 h-5 w-5 animate-spin text-[var(--app-muted)]" />
        ) : activeRows.length === 0 ? (
          <p className="py-6 text-center text-sm text-[var(--app-muted)]">{t('empty')}</p>
        ) : (
          <div className="-mx-4 overflow-x-auto sm:-mx-5">
            <table className="w-max min-w-full border-separate border-spacing-0 text-xs">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 bg-[var(--app-panel)] px-3 py-1" />
                  {groups.map((g, i) => (
                    <th
                      key={`${g.group}-${i}`}
                      colSpan={g.span}
                      className="border-b border-l border-[var(--app-border)] px-2 py-1 text-center font-semibold uppercase tracking-wide text-[var(--app-muted)]"
                    >
                      {t(`group.${g.group}`)}
                    </th>
                  ))}
                </tr>
                <tr>
                  <th className="sticky left-0 z-10 border-b border-[var(--app-border)] bg-[var(--app-panel)] px-3 py-1.5 text-left font-semibold text-[var(--app-muted)]">
                    {t('engineer')}
                  </th>
                  {skills.map((s) => (
                    <th key={s.code} className="border-b border-l border-[var(--app-border)] px-2 py-1.5 text-center font-medium text-[var(--app-text)]" title={s.code}>
                      {headerLabel(s, board)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activeRows.map((row) => (
                  <tr key={row.engineerId} className={row.active ? '' : 'opacity-50'}>
                    <td className="sticky left-0 z-10 whitespace-nowrap border-b border-[var(--app-border)] bg-[var(--app-panel)] px-3 py-1 font-medium text-[var(--app-text)]">
                      {row.name}
                    </td>
                    {skills.map((s) => {
                      const key = `${row.engineerId}|${s.code}`;
                      const changed = key in pending;
                      const value = changed ? pending[key] : row.levels[s.code] ?? null;
                      return (
                        <td key={s.code} className="border-b border-l border-[var(--app-border)] p-0.5 text-center">
                          <select
                            value={value ?? ''}
                            onChange={(e) => {
                              const next = e.target.value === '' ? null : Number(e.target.value);
                              const original = row.levels[s.code] ?? null;
                              setPending((p) => {
                                const copy = { ...p };
                                if (next === original) delete copy[key];
                                else copy[key] = next;
                                return copy;
                              });
                            }}
                            className={`h-7 w-14 cursor-pointer rounded-md border-0 text-center text-xs font-semibold outline-none ${levelClass(value)} ${
                              changed ? 'ring-2 ring-[var(--app-brand)]' : ''
                            }`}
                            aria-label={`${row.name} ${s.label}`}
                          >
                            <option value="">-</option>
                            <option value="1">L1</option>
                            <option value="2">L2</option>
                            <option value="3">L3</option>
                            <option value="4">L4</option>
                          </select>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-[var(--app-muted)]">{count > 0 ? t('pending', { n: count }) : t('legend')}</span>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t('reasonHint')}
            className={`${inputClass} ml-auto min-w-64`}
            disabled={count === 0}
          />
          <button type="button" disabled={count === 0} onClick={() => setPending({})} className={secondaryButton}>
            <RotateCcw className="h-4 w-4" />
            {t('discard')}
          </button>
          <button type="button" disabled={count === 0 || !reason.trim() || save.isPending} onClick={() => save.mutate()} className={primaryButton}>
            {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {t('save')}
          </button>
        </div>
        <ErrorLine error={save.error} fallback={t('saveFailed')} />
      </Card>

      <ImportCard />

      <Card title={t('revisionsTitle')} hint={t('revisionsHint')}>
        <ul className="divide-y divide-[var(--app-border)] text-sm">
          {(matrix.data?.revisions ?? []).length === 0 && <li className="py-2 text-[var(--app-muted)]">{t('noRevisions')}</li>}
          {(matrix.data?.revisions ?? []).map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
              <span className="font-semibold text-[var(--app-text)]">{r.label}</span>
              <span className="rounded-md bg-[var(--app-faint)] px-1.5 py-0.5 text-xs text-[var(--app-muted)]">{r.source}</span>
              <span className="text-[var(--app-muted)]">{t('cells', { n: r.changes })}</span>
              <span className="min-w-0 flex-1 truncate text-[var(--app-text)]">{r.reason}</span>
              <span className="text-xs text-[var(--app-muted)]">
                {r.createdBy} · {fmtDateTime(r.createdAt, locale)}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

/** "Cleaning" / "Delivery" labels repeat across groups; on the All view say which side. */
function headerLabel(s: SkillView, board: Board): string {
  if (board === 'ALL' && s.boardType !== 'COMMON' && ['CM', 'PM', 'INSTALLATION', 'OVERALL', 'EXPERTISE'].includes(s.groupCode)) {
    return `${s.label} (${s.boardType === 'CLEANING' ? 'CLN' : 'DLV'})`;
  }
  return s.label;
}

function ImportCard() {
  const t = useTranslations('reAssignment.skills');
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [label, setLabel] = useState('001');
  const [reason, setReason] = useState('');

  const previewM = useMutation({
    mutationFn: (f: File) => reAssignmentApi.previewImport(f).then((r) => r.data.data),
    onSuccess: setPreview,
  });
  const commit = useMutation({
    mutationFn: () => reAssignmentApi.commitImport(file!, label.trim(), reason.trim()).then((r) => r.data.data),
    onSuccess: () => {
      setPreview(null);
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
      qc.invalidateQueries({ queryKey: ['re-skills'] });
      qc.invalidateQueries({ queryKey: ['re-engineers'] });
      qc.invalidateQueries({ queryKey: ['re-queue'] });
    },
  });

  return (
    <Card title={t('importTitle')} hint={t('importHint')}>
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            setFile(f);
            setPreview(null);
            if (f) previewM.mutate(f);
          }}
          className="text-sm text-[var(--app-text)] file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--app-brand-soft)] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-[var(--app-brand-dark)]"
        />
        {previewM.isPending && <Loader2 className="h-4 w-4 animate-spin text-[var(--app-muted)]" />}
      </div>
      <ErrorLine error={previewM.error ?? commit.error} fallback={t('importFailed')} />
      {commit.data && (
        <p className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
          {t('imported', { label: commit.data.revision.label, cells: commit.data.levelsChanged, people: commit.data.engineersCreated })}
        </p>
      )}

      {preview && (
        <div className="mt-3 space-y-3">
          <p className="flex items-center gap-2 text-sm text-[var(--app-text)]">
            <FileSpreadsheet className="h-4 w-4 text-[var(--app-brand-dark)]" />
            {t('previewSummary', { rows: preview.rows.length, fresh: preview.newEngineers, cells: preview.changedLevels })}
          </p>
          {preview.errors.length > 0 && (
            <ul className="list-disc space-y-0.5 pl-5 text-sm text-red-700 dark:text-red-300">
              {preview.errors.map((e) => <li key={e}>{e}</li>)}
            </ul>
          )}
          {preview.warnings.length > 0 && (
            <ul className="list-disc space-y-0.5 pl-5 text-xs text-amber-700 dark:text-amber-300">
              {preview.warnings.map((w) => <li key={w}>{w}</li>)}
            </ul>
          )}
          <div className="-mx-4 overflow-x-auto sm:-mx-5">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-[var(--app-border)] text-left text-xs font-semibold uppercase tracking-wide text-[var(--app-muted)]">
                  <th className="px-4 py-2 sm:px-5">{t('row')}</th>
                  <th className="px-2 py-2">{t('workbookName')}</th>
                  <th className="px-2 py-2">{t('match')}</th>
                  <th className="px-2 py-2">{t('changes')}</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((r) => (
                  <tr key={r.sourceRow} className="border-b border-[var(--app-border)] align-top">
                    <td className="px-4 py-2 tabular-nums text-[var(--app-muted)] sm:px-5">{r.sourceRow}</td>
                    <td className="px-2 py-2 text-[var(--app-text)]">
                      {r.fullName}
                      {r.nickname && <span className="text-[var(--app-muted)]"> ({r.nickname})</span>}
                      {r.unassessed && <span className="ml-2 text-xs text-amber-700 dark:text-amber-300">{t('unassessed')}</span>}
                    </td>
                    <td className="px-2 py-2">
                      <span
                        className={`rounded-md px-1.5 py-0.5 text-xs font-semibold ${
                          r.match === 'EXISTING'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : r.match === 'NEW'
                              ? 'bg-[var(--app-brand-soft)] text-[var(--app-brand-dark)]'
                              : 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300'
                        }`}
                      >
                        {t(`matchKind.${r.match}`)}
                      </span>
                      {r.matchedName && <span className="ml-2 text-xs text-[var(--app-muted)]">{r.matchedName}</span>}
                    </td>
                    <td className="px-2 py-2 text-xs text-[var(--app-muted)]">
                      {r.changes === 0 ? (
                        t('noChange')
                      ) : (
                        <span className="flex flex-wrap gap-1">
                          {r.cells
                            .filter((c) => c.level !== c.currentLevel)
                            .slice(0, 12)
                            .map((c) => (
                              <span key={c.skillCode} className="whitespace-nowrap">
                                {c.skillCode}: {levelText(c.currentLevel)}→
                                <span className={`rounded px-1 font-semibold ${levelClass(c.level)}`}>{levelText(c.level)}</span>
                              </span>
                            ))}
                          {r.changes > 12 && <span>+{r.changes - 12}</span>}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--app-muted)]">
              {t('label')}
              <input value={label} onChange={(e) => setLabel(e.target.value)} className={`${inputClass} w-32`} />
            </label>
            <label className="flex min-w-64 flex-1 flex-col gap-1 text-xs font-semibold text-[var(--app-muted)]">
              {t('reason')}
              <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t('importReasonHint')} className={inputClass} />
            </label>
            <button
              type="button"
              disabled={!preview.canCommit || !label.trim() || !reason.trim() || commit.isPending}
              onClick={() => commit.mutate()}
              className={primaryButton}
            >
              {commit.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {t('commit')}
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}
