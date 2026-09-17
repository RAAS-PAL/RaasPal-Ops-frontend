'use client';

/**
 * ContractsPanel — every robot's contract, with the signed PDF attached, and the ones
 * ending soon or already ended a chip away.
 *
 * A renewal should be visible a month out, not discovered when the robot stops
 * reporting. The backend also emails each contract once as it enters the window
 * (the morning ops alert); the Ending soon chip is that same list, always current.
 */
import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Eye,
  FileSignature,
  FileText,
  Loader2,
  Mail,
  Paperclip,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { contractsApi } from '@/lib/api';
import { useConfirm } from '@/components/ui/confirm-dialog';
import type { ExpiringContract } from '@/types/api';

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
  const [file, setFile] = useState<File | null>(null);
  const [applyToAll, setApplyToAll] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const upload = useMutation({
    mutationFn: () => contractsApi.attachDocument(row.robotUnitId, file!, applyToAll),
    onSuccess: (r) => onDone(r.data.message ?? 'Contract attached'),
    onError: (e) => setError(errorMessage(e, 'Could not attach the contract.')),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="attach-title">
      <div className="w-full max-w-md rounded-2xl border border-[var(--app-border)] bg-[var(--app-panel)] shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-[var(--app-border)] px-5 py-4">
          <div>
            <p id="attach-title" className="text-sm font-semibold text-[var(--app-text)]">
              {replacing ? 'Replace contract PDF' : 'Attach contract PDF'}
            </p>
            <p className="mt-0.5 text-xs text-[var(--app-muted)]">
              {row.customerName} · {row.serialNumber} · {row.contractStartDate ?? '…'} → {row.contractEndDate}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-[var(--app-muted)] hover:bg-[var(--app-faint)]">
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
              <span className="text-sm text-[var(--app-muted)]">Choose a PDF (up to 20 MB)</span>
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
                Also attach to the {siblings.length} other robot{siblings.length === 1 ? '' : 's'} of {row.customerName} on the same
                contract dates
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
                Also attach to any other robot of {row.customerName} on the same contract dates
                <span className="block text-xs text-[var(--app-muted)]">None are in the current window; the server checks every deployment.</span>
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
            Cancel
          </button>
          <button
            type="button"
            onClick={() => upload.mutate()}
            disabled={!file || upload.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--app-brand)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {upload.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
            {upload.isPending ? 'Uploading…' : replacing ? 'Replace' : 'Attach'}
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
            Open in new tab
          </a>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close viewer"
            className="rounded-lg p-1.5 text-[var(--app-muted)] transition hover:bg-[var(--app-faint)] hover:text-[var(--app-text)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="relative flex-1 bg-[var(--app-faint)]">
          {!loaded && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-[var(--app-muted)]">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading the PDF…
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
  const [opening, setOpening] = useState(false);
  const [viewing, setViewing] = useState<string | null>(null);
  const doc = row.document;

  const view = async () => {
    // The bucket is private; ask for a five-minute link, then show it in the viewer.
    setOpening(true);
    try {
      const url = (await contractsApi.documentUrl(row.robotUnitId)).data.data?.url;
      if (!url) throw new Error('No link returned');
      setViewing(url);
    } catch (e) {
      onError(errorMessage(e, 'Could not open the contract.'));
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
        Attach PDF
      </button>
    );
  }

  const details = `${doc.fileName} · ${fileSize(doc.sizeBytes)} · attached ${new Date(doc.uploadedAt).toLocaleDateString()}${doc.uploadedBy ? ` by ${doc.uploadedBy}` : ''}${doc.sharedWith > 1 ? ` · shared by ${doc.sharedWith} robots` : ''}`;

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <div className="flex min-w-0 items-center gap-1.5 text-xs text-[var(--app-muted)]" title={details}>
        <FileText className="h-3.5 w-3.5 shrink-0" />
        <span className="max-w-[11rem] truncate">{doc.fileName}</span>
        {doc.sharedWith > 1 && (
          <span className="shrink-0 rounded bg-[var(--app-faint)] px-1 text-[10px] font-semibold" title={`Shared by ${doc.sharedWith} robots on this contract`}>
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
          View PDF
        </button>
        <button type="button" onClick={onAttach} title="Replace the PDF" aria-label="Replace contract PDF" className="rounded-lg p-1.5 text-[var(--app-muted)] hover:bg-[var(--app-faint)] hover:text-[var(--app-brand-dark)]">
          <Paperclip className="h-3.5 w-3.5" />
        </button>
        <button type="button" onClick={onRemove} title="Remove the PDF from this robot" aria-label="Remove contract PDF" className="rounded-lg p-1.5 text-[var(--app-muted)] hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/40">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

type StatusFilter = 'all' | 'soon' | 'ended' | 'none';

const STATUS_BADGE: Record<ExpiringContract['status'], { label: string; className: string }> = {
  ENDED: { label: 'Ended', className: 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900' },
  ENDING_SOON: { label: 'Ending soon', className: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900' },
  ACTIVE: { label: 'Active', className: 'bg-[var(--app-faint)] text-[var(--app-text)] ring-[var(--app-border)]' },
  NONE: { label: 'No end date', className: 'bg-transparent text-[var(--app-muted)] ring-[var(--app-border)] ring-dashed' },
};

function StatusBadge({ status }: { status: ExpiringContract['status'] }) {
  const s = STATUS_BADGE[status];
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${s.className}`}>{s.label}</span>;
}

function EndsIn({ c }: { c: ExpiringContract }) {
  if (c.daysToEnd === null) return <span className="text-[var(--app-muted)]">—</span>;
  if (c.daysToEnd < 0) return <span className="font-semibold text-red-600">{Math.abs(c.daysToEnd)} d ago</span>;
  if (c.status === 'ENDING_SOON') {
    return (
      <span className={`font-semibold ${c.daysToEnd <= 7 ? 'text-red-600' : 'text-amber-600'}`}>
        {c.daysToEnd === 0 ? 'today' : `${c.daysToEnd} d`}
      </span>
    );
  }
  return <span className="text-[var(--app-muted)]">{c.daysToEnd} d</span>;
}

function Table({
  rows,
  onAttach,
  onRemove,
  onError,
}: {
  rows: ExpiringContract[];
  onAttach: (row: ExpiringContract) => void;
  onRemove: (row: ExpiringContract) => void;
  onError: (message: string) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)]">
      <table className="w-full min-w-[72rem] text-left text-sm">
        <thead className="border-b border-[var(--app-border)] text-xs uppercase tracking-wide text-[var(--app-muted)]">
          <tr>
            <th className="px-3 py-2.5 font-semibold">Customer</th>
            <th className="px-3 py-2.5 font-semibold">Site</th>
            <th className="px-3 py-2.5 font-semibold">Robot</th>
            <th className="px-3 py-2.5 font-semibold">Contract</th>
            <th className="px-3 py-2.5 text-right font-semibold">Ends in</th>
            <th className="px-3 py-2.5 font-semibold">Status</th>
            <th className="px-3 py-2.5 font-semibold">Alert</th>
            <th className="px-3 py-2.5 font-semibold">Contract PDF</th>
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
                {c.contractStartDate ?? '…'} → {c.contractEndDate ?? '…'}
              </td>
              <td className="px-3 py-2.5 whitespace-nowrap text-right tabular-nums">
                <EndsIn c={c} />
              </td>
              <td className="px-3 py-2.5">
                <StatusBadge status={c.status} />
              </td>
              <td className="px-3 py-2.5 text-xs text-[var(--app-muted)]">
                {c.alertedAt ? (
                  <span className="inline-flex items-center gap-1" title={new Date(c.alertedAt).toLocaleString()}>
                    <Mail className="h-3.5 w-3.5" /> sent
                  </span>
                ) : c.status === 'ENDING_SOON' ? 'pending' : '—'}
              </td>
              <td className="px-3 py-2.5">
                <DocumentCell row={c} onAttach={() => onAttach(c)} onRemove={() => onRemove(c)} onError={onError} />
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
          {rows.length === 0 && (
            <tr>
              <td colSpan={9} className="px-3 py-10 text-center text-sm text-[var(--app-muted)]">
                No contracts match.
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
  const [windowDays, setWindowDays] = useState(30);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [attaching, setAttaching] = useState<ExpiringContract | null>(null);
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
  };

  const needle = search.trim().toLowerCase();
  const visible = allRows
    .filter((c) => {
      if (filter === 'soon') return c.status === 'ENDING_SOON';
      if (filter === 'ended') return c.status === 'ENDED';
      if (filter === 'none') return c.status === 'NONE';
      return true;
    })
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
      setNotice({ kind: 'ok', text: `Contract PDF removed from ${row.serialNumber}.` });
      await refresh();
    },
    onError: (e) => setNotice({ kind: 'error', text: errorMessage(e, 'Could not remove the contract PDF.') }),
  });

  const askRemove = (row: ExpiringContract) => {
    const shared = (row.document?.sharedWith ?? 1) > 1;
    void confirm({
      title: 'Remove this contract PDF?',
      kind: 'delete',
      confirmLabel: 'Remove',
      message: shared
        ? `The PDF is detached from ${row.serialNumber} only. The other ${row.document!.sharedWith - 1} robot(s) on this contract keep it.`
        : `The PDF is detached from ${row.serialNumber} and, as no other robot shares it, deleted from storage.`,
    }).then((ok) => ok && remove.mutate(row));
  };

  const chips: { id: StatusFilter; label: string; count: number; tone: string }[] = [
    { id: 'all', label: 'All', count: counts.all, tone: '' },
    { id: 'soon', label: 'Ending soon', count: counts.soon, tone: counts.soon > 0 ? 'text-amber-700 dark:text-amber-300' : '' },
    { id: 'ended', label: 'Ended', count: counts.ended, tone: counts.ended > 0 ? 'text-red-700 dark:text-red-300' : '' },
    { id: 'none', label: 'No end date', count: counts.none, tone: '' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2.5 rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--app-brand-soft)] text-[var(--app-brand-dark)]">
          <FileSignature className="h-4.5 w-4.5" />
        </span>
        <div>
          <p className="text-sm font-semibold text-[var(--app-text)]">Robot contracts</p>
          <p className="text-xs text-[var(--app-muted)]">
            Every robot&apos;s contract, soonest end first, with the signed PDF attached. Ending soon means a renewal should be arranged before
            the robot stops reporting; ended means the end date should be confirmed or extended.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-3">
        <div className="flex flex-col gap-1 text-xs font-semibold text-[var(--app-muted)]">
          Show
          <div role="radiogroup" aria-label="Filter contracts by status" className="inline-flex overflow-hidden rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] text-sm font-normal">
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

        <label className="flex min-w-[14rem] flex-1 flex-col gap-1 text-xs font-semibold text-[var(--app-muted)]">
          Search
          <span className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--app-muted)]" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Customer, site or serial…"
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
          Refresh
        </button>
        {data && (
          <p className="ml-auto text-xs text-[var(--app-muted)]">
            As of {data.asOf} · <b className="text-[var(--app-text)]">{counts.soon}</b> ending within {data.windowDays} days ·{' '}
            <b className="text-[var(--app-text)]">{counts.ended}</b> ended · showing {rows.length} of {counts.all}
          </p>
        )}
      </div>

      {query.isError && (
        <p className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          Could not load contracts — try again.
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
          <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss" className="rounded p-0.5 opacity-70 hover:opacity-100">
            <X className="h-3.5 w-3.5" />
          </button>
        </p>
      )}

      {data && filter === 'soon' && counts.soon === 0 && !needle ? (
        <p className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          No contracts end in the next {data.windowDays} days.
        </p>
      ) : (
        data && <Table rows={rows} onAttach={setAttaching} onRemove={askRemove} onError={(text) => setNotice({ kind: 'error', text })} />
      )}

      {filter === 'ended' && counts.ended > 0 && (
        <p className="text-xs leading-5 text-[var(--app-muted)]">
          An ended robot gets no monthly report and is not on the No data list. If the contract was renewed, extend the end date on the robot; if the robot came back, clear it.
        </p>
      )}
      {filter === 'none' && counts.none > 0 && (
        <p className="text-xs leading-5 text-[var(--app-muted)]">
          These robots have no contract end date, so they can never appear as ending soon and never trigger the renewal alert. Set the date on the robot when it is known.
        </p>
      )}

      <p className="text-xs leading-5 text-[var(--app-muted)]">
        Each contract is emailed to the customer success address once as it enters the 30-day window; changing the end date re-arms that alert.
        The Contract PDF is the signed document, kept in private storage; one upload can cover every robot of the customer on the same contract dates.
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
      {confirmDialog}
    </div>
  );
}
