'use client';

import { useState } from 'react';
import { AlertTriangle, Loader2, Trash2, X } from 'lucide-react';
import { isManualCaseRow } from '@/types/api';
import type { CaseReportRow, CaseRowEdit, SlaStatus } from '@/types/api';

/**
 * Correct one row of a generated report, or write a new one.
 *
 * <p>Every printed cell is a field, because every one has been wrong at least once:
 * a serial copied from the intake form, a branch code the board left blank, an open
 * date the team counts from a later event. Days and SLA are left blank by default and
 * the backend works them out from the Open Date and Province on save — a reviewer who
 * corrects the date should not also have to redo the arithmetic, and typing it by hand
 * is how the two drift apart. Either can still be overtyped for the row where the rule
 * is wrong.
 *
 * <p>With no row, the same form adds one: a case the team is tracking that the board
 * keeps in another group. Only rows added that way can be removed here — a board row
 * would be back on the next regeneration, so it has to be closed or moved on monday.
 */

const SLA_CHOICES: { value: SlaStatus | ''; label: string }[] = [
  { value: '', label: 'Work out from Open Date and Province' },
  { value: 'WITHIN', label: 'Within SLA' },
  { value: 'BREACHED', label: 'over SLA' },
  { value: 'ON_HOLD', label: 'On Hold' },
  { value: 'UNKNOWN', label: 'No verdict (blank)' },
];

interface FormState {
  project: string;
  branch: string;
  robot: string;
  serialNumber: string;
  problem: string;
  solution: string;
  openDate: string;
  reOnSite: string;
  days: string;
  sla: SlaStatus | '';
  province: string;
}

/** What a new row starts with; the sheet decides the customer and the usual robot. */
export interface NewRowDefaults {
  project: string;
  robot: string;
}

function toForm(row: CaseReportRow | null, defaults: NewRowDefaults): FormState {
  if (!row) {
    return {
      project: defaults.project,
      branch: '',
      robot: defaults.robot,
      serialNumber: '',
      problem: '',
      solution: '',
      openDate: '',
      reOnSite: '',
      days: '',
      sla: '',
      province: '',
    };
  }
  return {
    project: row.project ?? '',
    branch: row.branch ?? '',
    robot: row.robot ?? '',
    serialNumber: row.serialNumber ?? '',
    problem: row.problem ?? '',
    solution: row.solution ?? '',
    openDate: row.openDate ?? '',
    reOnSite: row.reOnSite ?? '',
    // Blank on purpose: recomputed from Open Date unless the reviewer types a number.
    days: '',
    sla: '',
    province: row.province ?? '',
  };
}

function toEdit(form: FormState): CaseRowEdit {
  const text = (s: string) => (s.trim() === '' ? null : s.trim());
  return {
    project: text(form.project),
    branch: text(form.branch),
    robot: text(form.robot),
    serialNumber: text(form.serialNumber),
    problem: text(form.problem),
    solution: text(form.solution),
    openDate: form.openDate || null,
    reOnSite: form.reOnSite || null,
    days: form.days.trim() === '' ? null : Number(form.days),
    sla: form.sla === '' ? null : form.sla,
    province: text(form.province),
  };
}

const FIELD =
  'w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-2 text-sm text-[var(--app-text)] focus:outline-none focus:ring-2 focus:ring-[var(--app-brand)]';
const LABEL = 'text-xs font-semibold uppercase tracking-wide text-[var(--app-muted)]';

interface Props {
  /** The row to correct, or null to add one. */
  row: CaseReportRow | null;
  /** Pre-filled when `row` is null. */
  newRow: NewRowDefaults;
  saving: boolean;
  error: string | null;
  onSave: (edit: CaseRowEdit) => void;
  /** Only offered for a row that was added by hand. */
  onRemove?: () => void;
  onClose: () => void;
}

export function CaseRowEditDialog({ row, newRow, saving, error, onSave, onRemove, onClose }: Props) {
  const [form, setForm] = useState<FormState>(() => toForm(row, newRow));
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));
  const adding = row === null;
  const removable = row !== null && isManualCaseRow(row) && onRemove !== undefined;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="case-row-edit-title"
          className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-[var(--app-border)] bg-[var(--app-panel)] shadow-2xl"
        >
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[var(--app-border)] px-6 py-4">
            <div>
              <p id="case-row-edit-title" className="text-base font-bold text-[var(--app-text)]">
                {adding ? 'Add a row' : `Edit row ${row.no}`}
              </p>
              <p className="text-xs text-[var(--app-muted)]">
                {adding
                  ? 'For a case the board does not list. It goes at the bottom of this date’s report and is kept if the report is regenerated. Nothing is written to monday.'
                  : 'Changes are saved into this date’s report and kept if it is regenerated. The monday ticket is not changed.'}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-lg p-1.5 text-[var(--app-muted)] transition hover:bg-[var(--app-faint)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={(e) => {
              e.preventDefault();
              onSave(toEdit(form));
            }}
          >
            <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto px-6 py-5 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className={LABEL}>Project</span>
                <input className={FIELD} value={form.project} onChange={(e) => set('project', e.target.value)} />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={LABEL}>Branch</span>
                <input className={FIELD} placeholder="M154 โลตัส จันทบุรี" value={form.branch} onChange={(e) => set('branch', e.target.value)} />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={LABEL}>Robot</span>
                <input className={FIELD} value={form.robot} onChange={(e) => set('robot', e.target.value)} />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={LABEL}>SN</span>
                <input className={`${FIELD} font-mono`} value={form.serialNumber} onChange={(e) => set('serialNumber', e.target.value)} />
              </label>
              <label className="flex flex-col gap-1.5 sm:col-span-2">
                <span className={LABEL}>Problem</span>
                <textarea className={FIELD} rows={2} value={form.problem} onChange={(e) => set('problem', e.target.value)} />
              </label>
              <label className="flex flex-col gap-1.5 sm:col-span-2">
                <span className={LABEL}>Solution</span>
                <textarea
                  className={`${FIELD} resize-y leading-relaxed`}
                  rows={12}
                  value={form.solution}
                  onChange={(e) => set('solution', e.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={LABEL}>Open Date</span>
                <input type="date" className={FIELD} value={form.openDate} onChange={(e) => set('openDate', e.target.value)} />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={LABEL}>RE On Site</span>
                <input type="date" className={FIELD} value={form.reOnSite} onChange={(e) => set('reOnSite', e.target.value)} />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={LABEL}>Province</span>
                <input
                  className={FIELD}
                  placeholder="Bangkok, ชลบุรี…"
                  title="Decides the SLA threshold: 3 days in greater Bangkok, 5 elsewhere. Not printed."
                  value={form.province}
                  onChange={(e) => set('province', e.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={LABEL}>Days</span>
                <input
                  type="number"
                  min={0}
                  className={FIELD}
                  placeholder={row?.days == null ? 'Worked out from Open Date' : `Worked out from Open Date (now ${row.days})`}
                  value={form.days}
                  onChange={(e) => set('days', e.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1.5 sm:col-span-2">
                <span className={LABEL}>SLA</span>
                <select className={FIELD} value={form.sla} onChange={(e) => set('sla', e.target.value as SlaStatus | '')}>
                  {SLA_CHOICES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {error && (
              <div className="mx-6 mb-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex shrink-0 items-center gap-2 border-t border-[var(--app-border)] px-6 py-4">
              {removable && (
                <button
                  type="button"
                  onClick={onRemove}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60 dark:text-red-300 dark:hover:bg-red-950/40"
                >
                  <Trash2 className="h-4 w-4" />
                  Remove row
                </button>
              )}
              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={saving}
                  className="rounded-lg border border-[var(--app-border)] px-4 py-2 text-sm font-semibold text-[var(--app-text)] transition hover:bg-[var(--app-faint)] disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-[var(--app-brand)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-60"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {saving ? 'Saving…' : adding ? 'Add row' : 'Save row'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
