'use client';

/**
 * ContractsPanel — every robot's contract, with the signed PDF attached, and the ones
 * ending soon or already ended a chip away.
 *
 * A renewal should be visible a month out, not discovered when the robot stops
 * reporting. The backend also emails each contract once as it enters the window
 * (the morning ops alert); the Ending soon chip is that same list, always current.
 *
 * The Follow-up column is the CS team's side of it: have they called the customer,
 * and what did the customer say. It belongs to the current term - recording the
 * renewal (a new end date on the robot) puts it back to "not contacted".
 */
import { useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  Eye,
  FileSignature,
  FileText,
  Loader2,
  Mail,
  Paperclip,
  Plus,
  RefreshCw,
  Search,
  StickyNote,
  Trash2,
  X,
} from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { contractsApi } from '@/lib/api';
import { intlLocale } from '@/lib/intlLocale';
import { useConfirm } from '@/components/ui/confirm-dialog';
import type { ContractRenewalStatus, ExpiringContract } from '@/types/api';

function errorMessage(e: unknown, fallback: string): string {
  const detail =
    typeof e === 'object' && e !== null && 'response' in e
      ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (e as any).response?.data?.message
      : undefined;
  return typeof detail === 'string' && detail.trim() !== '' ? detail : fallback;
}

function fileSize(bytes: number): string {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * The other rows on the same contract as one: same customer, same dates. What the
 * "also attach to…" checkbox will do, counted from the rows on screen. The server
 * counts across every active deployment, so the real number can be higher when
 * some of the contract's robots are outside the current window.
 */
function sameContract(row: ExpiringContract, rows: ExpiringContract[]): ExpiringContract[] {
  return rows.filter(
    (r) =>
      r.robotUnitId !== row.robotUnitId &&
      r.customerProfileId === row.customerProfileId &&
      r.contractStartDate === row.contractStartDate &&
      r.contractEndDate === row.contractEndDate,
  );
}

/**
 * Attach a PDF to one row. A small dialog rather than a bare file input, because
 * the one decision worth a sentence - does this file cover the customer's other
 * robots too? - has to be asked before the upload, not after.
 */
function AttachDialog({
  row,
  siblings,
  replacing,
  onClose,
  onDone,
}: {
  row: ExpiringContract;
  siblings: ExpiringContract[];
  replacing: boolean;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const t = useTranslations('contracts');
  const [file, setFile] = useState<File | null>(null);
  const [applyToAll, setApplyToAll] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const upload = useMutation({
    mutationFn: () => contractsApi.attachDocument(row.robotUnitId, file!, applyToAll),
    onSuccess: (r) => onDone(r.data.message ?? t('contractAttached')),
    onError: (e) => setError(errorMessage(e, t('attachFailed'))),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="attach-title">
      <div className="w-full max-w-md rounded-2xl border border-[var(--app-border)] bg-[var(--app-panel)] shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-[var(--app-border)] px-5 py-4">
          <div>
            <p id="attach-title" className="text-sm font-semibold text-[var(--app-text)]">
              {replacing ? t('replaceTitle') : t('attachTitle')}
            </p>
            <p className="mt-0.5 text-xs text-[var(--app-muted)]">
              {row.customerName} · {row.serialNumber} · {row.contractStartDate ?? '…'} → {row.contractEndDate}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label={t('close')} className="rounded-lg p-1 text-[var(--app-muted)] hover:bg-[var(--app-faint)]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <input
            ref={input}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(e) => {
              setError(null);
              setFile(e.target.files?.[0] ?? null);
            }}
          />
          <button
            type="button"
            onClick={() => input.current?.click()}
            className="flex w-full items-center gap-3 rounded-xl border border-dashed border-[var(--app-border)] px-4 py-4 text-left transition hover:border-[var(--app-brand)]"
          >
            <FileText className="h-5 w-5 shrink-0 text-[var(--app-muted)]" />
            {file ? (
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-[var(--app-text)]">{file.name}</span>
                <span className="text-xs text-[var(--app-muted)]">{fileSize(file.size)}</span>
              </span>
            ) : (
              <span className="text-sm text-[var(--app-muted)]">{t('choosePdf')}</span>
            )}
          </button>

          {siblings.length > 0 && (
            <label className="flex cursor-pointer items-start gap-2.5 text-sm text-[var(--app-text)]">
              <input
                type="checkbox"
                checked={applyToAll}
                onChange={(e) => setApplyToAll(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-[var(--app-border)]"
              />
              <span>
                {t('alsoAttach', { count: siblings.length, customer: row.customerName })}
                <span className="block text-xs text-[var(--app-muted)]">
                  {siblings.map((s) => s.serialNumber).join(', ')}
                </span>
              </span>
            </label>
          )}
          {siblings.length === 0 && (
            <label className="flex cursor-pointer items-start gap-2.5 text-sm text-[var(--app-text)]">
              <input
                type="checkbox"
                checked={applyToAll}
                onChange={(e) => setApplyToAll(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-[var(--app-border)]"
              />
              <span>
                {t('alsoAttachAny', { customer: row.customerName })}
                <span className="block text-xs text-[var(--app-muted)]">{t('noneInWindow')}</span>
              </span>
            </label>
          )}

          {error && (
            <p className="flex items-start gap-2 text-xs text-red-600">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {error}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[var(--app-border)] px-5 py-3">
          <button type="button" onClick={onClose} disabled={upload.isPending} className="rounded-lg px-3 py-2 text-sm font-semibold text-[var(--app-muted)] hover:bg-[var(--app-faint)]">
            {t('cancel')}
          </button>
          <button
            type="button"
            onClick={() => upload.mutate()}
            disabled={!file || upload.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--app-brand)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {upload.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
            {upload.isPending ? t('uploading') : replacing ? t('replace') : t('attach')}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * The PDF, on the page. A large box over the table rather than a new tab: the
 * staff are checking a contract against the row beside it, and a tab switch
 * loses the row. The browser's own PDF viewer renders inside the frame, so
 * zoom, search and print are its. The link behind it lasts five minutes,
 * long enough to load; once loaded the document is the browser's.
 */
function PdfViewer({ title, url, onClose }: { title: string; url: string; onClose: () => void }) {
  const t = useTranslations('contracts');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    // The page behind must not scroll while the viewer is up.
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-panel)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-[var(--app-border)] px-4 py-3">
          <FileText className="h-4 w-4 shrink-0 text-[var(--app-muted)]" />
          <p className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--app-text)]" title={title}>
            {title}
          </p>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--app-border)] px-2.5 py-1.5 text-xs font-semibold text-[var(--app-text)] transition hover:border-[var(--app-brand)]"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            {t('openInTab')}
          </a>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('closeViewer')}
            className="rounded-lg p-1.5 text-[var(--app-muted)] transition hover:bg-[var(--app-faint)] hover:text-[var(--app-text)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="relative flex-1 bg-[var(--app-faint)]">
          {!loaded && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-[var(--app-muted)]">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('loadingPdf')}
            </div>
          )}
          <iframe src={url} title={title} onLoad={() => setLoaded(true)} className="h-full w-full border-0" />
        </div>
      </div>
    </div>
  );
}

/** The Contract PDF cell: attach, or view / replace / remove what is attached. */
function DocumentCell({
  row,
  onAttach,
  onRemove,
  onError,
}: {
  row: ExpiringContract;
  onAttach: () => void;
  onRemove: () => void;
  onError: (message: string) => void;
}) {
  const t = useTranslations('contracts');
  const locale = useLocale();
  const [opening, setOpening] = useState(false);
  const [viewing, setViewing] = useState<string | null>(null);
  const doc = row.document;

  const view = async () => {
    // The bucket is private; ask for a five-minute link, then show it in the viewer.
    setOpening(true);
    try {
      const url = (await contractsApi.documentUrl(row.robotUnitId)).data.data?.url;
      if (!url) throw new Error(t('noLink'));
      setViewing(url);
    } catch (e) {
      onError(errorMessage(e, t('openFailed')));
    } finally {
      setOpening(false);
    }
  };

  if (!doc) {
    return (
      <button
        type="button"
        onClick={onAttach}
        className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-[var(--app-border)] px-2.5 py-1 text-xs font-semibold text-[var(--app-muted)] transition hover:border-[var(--app-brand)] hover:text-[var(--app-brand-dark)]"
      >
        <Paperclip className="h-3.5 w-3.5" />
        {t('attachPdf')}
      </button>
    );
  }

  const details = `${doc.fileName} · ${fileSize(doc.sizeBytes)} · ${t('attachedOn', { date: new Date(doc.uploadedAt).toLocaleDateString(intlLocale(locale)) })}${doc.uploadedBy ? t('attachedBy', { user: doc.uploadedBy }) : ''}${doc.sharedWith > 1 ? t('sharedBy', { count: doc.sharedWith }) : ''}`;

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <div className="flex min-w-0 items-center gap-1.5 text-xs text-[var(--app-muted)]" title={details}>
        <FileText className="h-3.5 w-3.5 shrink-0" />
        <span className="max-w-[11rem] truncate">{doc.fileName}</span>
        {doc.sharedWith > 1 && (
          <span className="shrink-0 rounded bg-[var(--app-faint)] px-1 text-[10px] font-semibold" title={t('sharedTitle', { count: doc.sharedWith })}>
            ×{doc.sharedWith}
          </span>
        )}
      </div>
      {viewing && doc && <PdfViewer title={doc.fileName} url={viewing} onClose={() => setViewing(null)} />}
      <div className="flex items-center gap-1">
        {/* The one action the staff take every day, as a button that says so. */}
        <button
          type="button"
          onClick={view}
          disabled={opening}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--app-brand)] px-2.5 py-1 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
        >
          {opening ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
          {t('viewPdf')}
        </button>
        <button type="button" onClick={onAttach} title={t('replaceTitleBtn')} aria-label={t('replaceTitle')} className="rounded-lg p-1.5 text-[var(--app-muted)] hover:bg-[var(--app-faint)] hover:text-[var(--app-brand-dark)]">
          <Paperclip className="h-3.5 w-3.5" />
        </button>
        <button type="button" onClick={onRemove} title={t('removeTitle')} aria-label={t('removeAria')} className="rounded-lg p-1.5 text-[var(--app-muted)] hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/40">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

/** The colours of each follow-up status; its wording is `contracts.followup.<status>.*`. */
const FOLLOWUP: Record<ContractRenewalStatus, { className: string; dot: string }> = {
  NOT_CONTACTED: {
    className: 'bg-transparent text-[var(--app-muted)] ring-[var(--app-border)] ring-dashed',
    dot: 'bg-[var(--app-muted)]',
  },
  CONTACTED: {
    className: 'bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:ring-sky-900',
    dot: 'bg-sky-500',
  },
  WILL_RENEW: {
    className: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900',
    dot: 'bg-emerald-500',
  },
  WILL_NOT_RENEW: {
    className: 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900',
    dot: 'bg-red-500',
  },
};

const FOLLOWUP_ORDER: ContractRenewalStatus[] = ['NOT_CONTACTED', 'CONTACTED', 'WILL_RENEW', 'WILL_NOT_RENEW'];

function FollowupBadge({ status }: { status: ContractRenewalStatus }) {
  const t = useTranslations('contracts');
  const key: ContractRenewalStatus = status in FOLLOWUP ? status : 'NOT_CONTACTED';
  const f = FOLLOWUP[key];
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${f.className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${f.dot}`} />
      {t(`followup.${key}.label`)}
    </span>
  );
}

/**
 * The note behind a follow-up, on its own. The status is a dropdown in the row
 * and saves on change; the note is the one thing that needs a box to type in.
 */
function NoteDialog({
  row,
  siblings,
  onClose,
  onDone,
}: {
  row: ExpiringContract;
  siblings: ExpiringContract[];
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const t = useTranslations('contracts');
  const [note, setNote] = useState(row.followup.note ?? '');
  const [applyToAll, setApplyToAll] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () => contractsApi.updateFollowup(row.robotUnitId, { status: row.followup.status, note, applyToSameContract: applyToAll }),
    onSuccess: (r) => onDone(r.data.message ?? t('noteSaved')),
    onError: (e) => setError(errorMessage(e, t('noteFailed'))),
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="note-title">
      <div className="w-full max-w-md rounded-2xl border border-[var(--app-border)] bg-[var(--app-panel)] shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-[var(--app-border)] px-5 py-4">
          <div>
            <p id="note-title" className="text-sm font-semibold text-[var(--app-text)]">{t('noteTitle')}</p>
            <p className="mt-0.5 text-xs text-[var(--app-muted)]">
              {row.customerName} · {row.serialNumber} · <FollowupBadge status={row.followup.status} />
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label={t('close')} className="rounded-lg p-1 text-[var(--app-muted)] hover:bg-[var(--app-faint)]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 2000))}
            rows={4}
            autoFocus
            placeholder={t('notePlaceholder')}
            className="w-full resize-y rounded-lg border border-[var(--app-border)] bg-[var(--app-panel-alt)] px-3 py-2 text-sm outline-none focus:border-[var(--app-brand)]"
          />

          <label className="flex cursor-pointer items-start gap-2.5 text-sm text-[var(--app-text)]">
            <input
              type="checkbox"
              checked={applyToAll}
              onChange={(e) => setApplyToAll(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-[var(--app-border)]"
            />
            <span>
              {siblings.length > 0 ? (
                <>
                  {t('alsoOn', { count: siblings.length, customer: row.customerName })}
                  <span className="block text-xs text-[var(--app-muted)]">{siblings.map((s) => s.serialNumber).join(', ')}</span>
                </>
              ) : (
                <>
                  {t('alsoOnAny', { customer: row.customerName })}
                  <span className="block text-xs text-[var(--app-muted)]">{t('noneOnScreen')}</span>
                </>
              )}
            </span>
          </label>

          {error && (
            <p className="flex items-start gap-2 text-xs text-red-600">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {error}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[var(--app-border)] px-5 py-3">
          <button type="button" onClick={onClose} disabled={save.isPending} className="rounded-lg px-3 py-2 text-sm font-semibold text-[var(--app-muted)] hover:bg-[var(--app-faint)]">
            {t('cancel')}
          </button>
          <button
            type="button"
            onClick={() => save.mutate()}
            disabled={save.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--app-brand)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <StickyNote className="h-4 w-4" />}
            {save.isPending ? t('saving') : t('saveNote')}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * The follow-up as a cell: the status is a dropdown that saves the moment it is
 * changed - one click for the common case, a call just made - and covers the
 * customer's other robots on the same contract dates, as one call does. The note
 * sits under it and opens its own small box.
 */
function FollowupCell({
  row,
  onNote,
  onSaved,
  onError,
}: {
  row: ExpiringContract;
  onNote: () => void;
  onSaved: (message: string) => void;
  onError: (message: string) => void;
}) {
  const t = useTranslations('contracts');
  const locale = useLocale();
  const f = row.followup;
  const styleKey: ContractRenewalStatus = f.status in FOLLOWUP ? f.status : 'NOT_CONTACTED';
  const style = FOLLOWUP[styleKey];
  const when = f.updatedAt ? new Date(f.updatedAt).toLocaleDateString(intlLocale(locale), { day: 'numeric', month: 'short' }) : null;

  const change = useMutation({
    mutationFn: (status: ContractRenewalStatus) =>
      contractsApi.updateFollowup(row.robotUnitId, { status, note: f.note, applyToSameContract: true }),
    onSuccess: (r) => onSaved(r.data.message ?? t('followupRecorded')),
    onError: (e) => onError(errorMessage(e, t('followupFailed', { serial: row.serialNumber }))),
  });

  return (
    <div className="min-w-[11rem]">
      <span className="relative inline-flex items-center">
        <select
          value={f.status}
          disabled={change.isPending}
          onChange={(e) => change.mutate(e.target.value as ContractRenewalStatus)}
          aria-label={t('followupAria', { serial: row.serialNumber })}
          title={t(`followup.${styleKey}.hint`)}
          className={`h-6 cursor-pointer appearance-none rounded-full pl-2.5 pr-6 text-xs font-semibold ring-1 ring-inset outline-none transition focus:ring-2 focus:ring-[var(--app-brand)] disabled:cursor-wait disabled:opacity-60 ${style.className}`}
        >
          {FOLLOWUP_ORDER.map((s) => (
            <option key={s} value={s}>
              {t(`followup.${s}.label`)}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2">
          {change.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <ChevronDown className="h-3 w-3 opacity-70" />}
        </span>
      </span>
      {f.note ? (
        <button
          type="button"
          onClick={onNote}
          title={t('clickToEdit', { note: f.note })}
          className="mt-1 block max-w-[16rem] text-left text-xs text-[var(--app-text)] hover:text-[var(--app-brand-dark)]"
        >
          <span className="line-clamp-2 whitespace-pre-line">{f.note}</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={onNote}
          className="mt-1 inline-flex items-center gap-1 text-[11px] text-[var(--app-muted)] transition hover:text-[var(--app-brand-dark)]"
        >
          <Plus className="h-3 w-3" /> {t('addNote')}
        </button>
      )}
      {(f.updatedBy || when) && (
        <p className="mt-0.5 text-[11px] text-[var(--app-muted)]" title={f.updatedAt ? new Date(f.updatedAt).toLocaleString(intlLocale(locale)) : undefined}>
          {[f.updatedBy, when].filter(Boolean).join(' · ')}
        </p>
      )}
    </div>
  );
}

type StatusFilter = 'all' | 'soon' | 'ended' | 'none';
type FollowupFilter = 'any' | ContractRenewalStatus;

/** The colours of each contract status; its wording is `contracts.status.*`. */
const STATUS_BADGE: Record<ExpiringContract['status'], { className: string }> = {
  ENDED: { className: 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900' },
  ENDING_SOON: { className: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900' },
  ACTIVE: { className: 'bg-[var(--app-faint)] text-[var(--app-text)] ring-[var(--app-border)]' },
  NONE: { className: 'bg-transparent text-[var(--app-muted)] ring-[var(--app-border)] ring-dashed' },
};

function StatusBadge({ status }: { status: ExpiringContract['status'] }) {
  const t = useTranslations('contracts');
  const s = STATUS_BADGE[status];
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${s.className}`}>{t(`status.${status}`)}</span>;
}

function EndsIn({ c }: { c: ExpiringContract }) {
  const t = useTranslations('contracts');
  if (c.daysToEnd === null) return <span className="text-[var(--app-muted)]">—</span>;
  if (c.daysToEnd < 0) return <span className="font-semibold text-red-600">{t('daysAgo', { days: Math.abs(c.daysToEnd) })}</span>;
  if (c.status === 'ENDING_SOON') {
    return (
      <span className={`font-semibold ${c.daysToEnd <= 7 ? 'text-red-600' : 'text-amber-600'}`}>
        {c.daysToEnd === 0 ? t('today') : t('days', { days: c.daysToEnd })}
      </span>
    );
  }
  return <span className="text-[var(--app-muted)]">{t('days', { days: c.daysToEnd })}</span>;
}

function Table({
  rows,
  onAttach,
  onRemove,
  onNote,
  onSaved,
  onError,
}: {
  rows: ExpiringContract[];
  onAttach: (row: ExpiringContract) => void;
  onRemove: (row: ExpiringContract) => void;
  onNote: (row: ExpiringContract) => void;
  onSaved: (message: string) => void;
  onError: (message: string) => void;
}) {
  const t = useTranslations('contracts');
  const locale = useLocale();
  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)]">
      <table className="w-full min-w-[72rem] text-left text-sm">
        <thead className="border-b border-[var(--app-border)] text-xs uppercase tracking-wide text-[var(--app-muted)]">
          <tr>
            <th className="px-3 py-2.5 font-semibold">{t('col.customer')}</th>
            <th className="px-3 py-2.5 font-semibold">{t('col.site')}</th>
            <th className="px-3 py-2.5 font-semibold">{t('col.robot')}</th>
            <th className="px-3 py-2.5 font-semibold">{t('col.contract')}</th>
            <th className="px-3 py-2.5 text-right font-semibold">{t('col.endsIn')}</th>
            <th className="px-3 py-2.5 font-semibold">{t('col.status')}</th>
            <th className="px-3 py-2.5 font-semibold">{t('col.followup')}</th>
            <th className="px-3 py-2.5 font-semibold">{t('col.pdf')}</th>
            <th className="px-3 py-2.5"><span className="sr-only">{t('col.open')}</span></th>
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
                {c.contractStartDate ?? '…'} → {c.contractEndDate ?? '…'}
              </td>
              <td className="px-3 py-2.5 whitespace-nowrap text-right tabular-nums">
                <EndsIn c={c} />
              </td>
              <td className="px-3 py-2.5">
                <StatusBadge status={c.status} />
                {c.alertedAt ? (
                  <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-[var(--app-muted)]" title={t('alertEmailed', { when: new Date(c.alertedAt).toLocaleString(intlLocale(locale)) })}>
                    <Mail className="h-3 w-3" /> {t('alertSent')}
                  </p>
                ) : c.status === 'ENDING_SOON' ? (
                  <p className="mt-1 text-[11px] text-[var(--app-muted)]">{t('alertPending')}</p>
                ) : null}
              </td>
              <td className="px-3 py-2.5">
                <FollowupCell row={c} onNote={() => onNote(c)} onSaved={onSaved} onError={onError} />
              </td>
              <td className="px-3 py-2.5">
                <DocumentCell row={c} onAttach={() => onAttach(c)} onRemove={() => onRemove(c)} onError={onError} />
              </td>
              <td className="px-3 py-2.5">
                <Link
                  href="/tools?tab=robots"
                  title={t('openTools')}
                  className="text-[var(--app-muted)] transition hover:text-[var(--app-brand-dark)]"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={9} className="px-3 py-10 text-center text-sm text-[var(--app-muted)]">
                {t('noMatch')}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Every active deployment is a contract row; the chips narrow by status and the box
 * by customer or serial. Opens on All, sorted soonest end first, so the first screen
 * is the ending-soon list anyway - and a contract can have its PDF attached long
 * before it is nearly over. The morning alert email is what nudges about renewals;
 * this page no longer needs to open on them.
 */
export function ContractsPanel() {
  const t = useTranslations('contracts');
  const [windowDays, setWindowDays] = useState(90);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [followupFilter, setFollowupFilter] = useState<FollowupFilter>('any');
  const [attaching, setAttaching] = useState<ExpiringContract | null>(null);
  const [noting, setNoting] = useState<ExpiringContract | null>(null);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const queryClient = useQueryClient();
  const { confirm, confirmDialog } = useConfirm();

  const query = useQuery({
    queryKey: ['contracts-all', windowDays],
    queryFn: () => contractsApi.all(windowDays).then((r) => r.data.data),
  });
  const data = query.data;
  const allRows = data?.contracts ?? [];

  const counts = {
    all: allRows.length,
    soon: allRows.filter((c) => c.status === 'ENDING_SOON').length,
    ended: allRows.filter((c) => c.status === 'ENDED').length,
    none: allRows.filter((c) => c.status === 'NONE').length,
    // The call list: ending soon and nobody has picked up the phone yet.
    soonNotContacted: allRows.filter((c) => c.status === 'ENDING_SOON' && c.followup.status === 'NOT_CONTACTED').length,
  };
  const followupCounts = Object.fromEntries(
    FOLLOWUP_ORDER.map((s) => [s, allRows.filter((c) => c.followup.status === s).length]),
  ) as Record<ContractRenewalStatus, number>;

  const needle = search.trim().toLowerCase();
  const visible = allRows
    .filter((c) => {
      if (filter === 'soon') return c.status === 'ENDING_SOON';
      if (filter === 'ended') return c.status === 'ENDED';
      if (filter === 'none') return c.status === 'NONE';
      return true;
    })
    .filter((c) => followupFilter === 'any' || c.followup.status === followupFilter)
    .filter(
      (c) =>
        !needle ||
        c.customerName.toLowerCase().includes(needle) ||
        c.serialNumber.toLowerCase().includes(needle) ||
        (c.site ?? '').toLowerCase().includes(needle) ||
        (c.name ?? '').toLowerCase().includes(needle),
    );
  // Ended contracts read best most-recent first: the ones somebody can still act on.
  const rows = filter === 'ended' ? [...visible].reverse() : visible;

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['contracts-all'] });

  const remove = useMutation({
    mutationFn: (row: ExpiringContract) => contractsApi.removeDocument(row.robotUnitId),
    onSuccess: async (_r, row) => {
      setNotice({ kind: 'ok', text: t('removedNotice', { serial: row.serialNumber }) });
      await refresh();
    },
    onError: (e) => setNotice({ kind: 'error', text: errorMessage(e, t('removeFailed')) }),
  });

  const askRemove = (row: ExpiringContract) => {
    const shared = (row.document?.sharedWith ?? 1) > 1;
    void confirm({
      title: t('confirmRemoveTitle'),
      kind: 'delete',
      confirmLabel: t('confirmRemove'),
      message: shared
        ? t('removeShared', { serial: row.serialNumber, count: row.document!.sharedWith - 1 })
        : t('removeSole', { serial: row.serialNumber }),
    }).then((ok) => ok && remove.mutate(row));
  };

  const chips: { id: StatusFilter; label: string; count: number; tone: string }[] = [
    { id: 'all', label: t('all'), count: counts.all, tone: '' },
    { id: 'soon', label: t('status.ENDING_SOON'), count: counts.soon, tone: counts.soon > 0 ? 'text-amber-700 dark:text-amber-300' : '' },
    { id: 'ended', label: t('status.ENDED'), count: counts.ended, tone: counts.ended > 0 ? 'text-red-700 dark:text-red-300' : '' },
    { id: 'none', label: t('status.NONE'), count: counts.none, tone: '' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2.5 rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--app-brand-soft)] text-[var(--app-brand-dark)]">
          <FileSignature className="h-4.5 w-4.5" />
        </span>
        <div>
          <p className="text-sm font-semibold text-[var(--app-text)]">{t('title')}</p>
          <p className="text-xs text-[var(--app-muted)]">
            {t('intro')}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-3">
        <div className="flex flex-col gap-1 text-xs font-semibold text-[var(--app-muted)]">
          {t('show')}
          <div role="radiogroup" aria-label={t('filterAria')} className="inline-flex overflow-hidden rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] text-sm font-normal">
            {chips.map((chip) => {
              const active = filter === chip.id;
              return (
                <button
                  key={chip.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setFilter(chip.id)}
                  className={`h-9 px-3 font-semibold transition ${
                    active ? 'bg-[var(--app-brand)] text-white' : `text-[var(--app-text)] hover:bg-[var(--app-faint)] ${chip.tone}`
                  }`}
                >
                  {chip.label}
                  {data && <span className={`ml-1.5 tabular-nums ${active ? 'opacity-80' : 'opacity-60'}`}>{chip.count}</span>}
                </button>
              );
            })}
          </div>
        </div>

        <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--app-muted)]">
          {t('endingWithin')}
          <select
            value={windowDays}
            onChange={(e) => setWindowDays(Number(e.target.value))}
            className="h-9 rounded-lg border border-[var(--app-border)] bg-[var(--app-panel-alt)] px-3 text-sm font-normal text-[var(--app-text)] outline-none focus:border-[var(--app-brand)]"
          >
            <option value={90}>{t('daysOption', { n: 90 })}</option>
            <option value={60}>{t('daysOption', { n: 60 })}</option>
            <option value={30}>{t('daysOption', { n: 30 })}</option>
            <option value={180}>{t('daysOption', { n: 180 })}</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--app-muted)]">
          {t('followupLabel')}
          <select
            value={followupFilter}
            onChange={(e) => setFollowupFilter(e.target.value as FollowupFilter)}
            className="h-9 rounded-lg border border-[var(--app-border)] bg-[var(--app-panel-alt)] px-3 text-sm font-normal text-[var(--app-text)] outline-none focus:border-[var(--app-brand)]"
          >
            <option value="any">{t('any')}</option>
            {FOLLOWUP_ORDER.map((s) => (
              <option key={s} value={s}>
                {t(`followup.${s}.label`)}
                {data ? ` (${followupCounts[s]})` : ''}
              </option>
            ))}
          </select>
        </label>

        <label className="flex min-w-[14rem] flex-1 flex-col gap-1 text-xs font-semibold text-[var(--app-muted)]">
          {t('search')}
          <span className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--app-muted)]" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="h-9 w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-panel-alt)] pl-9 pr-3 text-sm font-normal text-[var(--app-text)] outline-none focus:border-[var(--app-brand)]"
            />
          </span>
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
          <p className="ml-auto text-xs text-[var(--app-muted)]">
            {t.rich(counts.soon > 0 ? 'summaryWithCalls' : 'summary', {
              asOf: data.asOf,
              soon: counts.soon,
              days: data.windowDays,
              notContacted: counts.soonNotContacted,
              ended: counts.ended,
              shown: rows.length,
              total: counts.all,
              b: (chunks) => <b className="text-[var(--app-text)]">{chunks}</b>,
              n: (chunks) => (
                <b className={counts.soonNotContacted > 0 ? 'text-amber-700 dark:text-amber-300' : 'text-[var(--app-text)]'}>{chunks}</b>
              ),
            })}
          </p>
        )}
      </div>

      {query.isError && (
        <p className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {t('loadFailed')}
        </p>
      )}

      {notice && (
        <p
          className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${
            notice.kind === 'ok'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300'
              : 'border-red-200 bg-red-50 text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400'
          }`}
        >
          {notice.kind === 'ok' ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
          <span className="flex-1">{notice.text}</span>
          <button type="button" onClick={() => setNotice(null)} aria-label={t('dismiss')} className="rounded p-0.5 opacity-70 hover:opacity-100">
            <X className="h-3.5 w-3.5" />
          </button>
        </p>
      )}

      {data && filter === 'soon' && counts.soon === 0 && !needle ? (
        <p className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {t('noneEnding', { days: data.windowDays })}
        </p>
      ) : (
        data && (
          <Table
            rows={rows}
            onAttach={setAttaching}
            onRemove={askRemove}
            onNote={setNoting}
            onSaved={async (text) => {
              setNotice({ kind: 'ok', text });
              await refresh();
            }}
            onError={(text) => setNotice({ kind: 'error', text })}
          />
        )
      )}

      {filter === 'ended' && counts.ended > 0 && (
        <p className="text-xs leading-5 text-[var(--app-muted)]">
          {t('endedNote')}
        </p>
      )}
      {filter === 'none' && counts.none > 0 && (
        <p className="text-xs leading-5 text-[var(--app-muted)]">
          {t('noEndNote')}
        </p>
      )}

      <p className="text-xs leading-5 text-[var(--app-muted)]">
        {t.rich('footnote', { i: (chunks) => <i>{chunks}</i> })}
      </p>

      {attaching && (
        <AttachDialog
          row={attaching}
          siblings={sameContract(attaching, allRows)}
          replacing={attaching.document !== null}
          onClose={() => setAttaching(null)}
          onDone={async (message) => {
            setAttaching(null);
            setNotice({ kind: 'ok', text: message });
            await refresh();
          }}
        />
      )}
      {noting && (
        <NoteDialog
          row={noting}
          siblings={sameContract(noting, allRows)}
          onClose={() => setNoting(null)}
          onDone={async (message) => {
            setNoting(null);
            setNotice({ kind: 'ok', text: message });
            await refresh();
          }}
        />
      )}
      {confirmDialog}
    </div>
  );
}
