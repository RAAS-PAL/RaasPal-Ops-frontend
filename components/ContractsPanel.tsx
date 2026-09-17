'use client';

/**
 * ContractsPanel — robots whose contract ends within the window, and robots whose
 * contract has already ended.
 *
 * A renewal should be visible a month out, not discovered when the robot stops
 * reporting. The backend also emails each contract once as it enters the window
 * (the morning ops alert); this is the same list, always current.
 */
import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  FileSignature,
  FileText,
  Loader2,
  Mail,
  Paperclip,
  RefreshCw,
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
  const doc = row.document;

  const view = async () => {
    // The bucket is private; ask for a five-minute link, then open it. The tab is
    // opened first so the browser treats it as the click it is, not a popup.
    const tab = window.open('', '_blank');
    setOpening(true);
    try {
      const url = (await contractsApi.documentUrl(row.robotUnitId)).data.data?.url;
      if (!url) throw new Error('No link returned');
      if (tab) tab.location.href = url;
      else window.open(url, '_blank');
    } catch (e) {
      tab?.close();
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

  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <button
        type="button"
        onClick={view}
        disabled={opening}
        title={`${doc.fileName} · ${fileSize(doc.sizeBytes)} · attached ${new Date(doc.uploadedAt).toLocaleDateString()}${doc.uploadedBy ? ` by ${doc.uploadedBy}` : ''}${doc.sharedWith > 1 ? ` · shared by ${doc.sharedWith} robots` : ''}`}
        className="inline-flex min-w-0 items-center gap-1.5 text-xs font-medium text-[var(--app-brand-dark)] hover:underline disabled:opacity-60"
      >
        {opening ? <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" /> : <FileText className="h-3.5 w-3.5 shrink-0" />}
        <span className="max-w-[11rem] truncate">{doc.fileName}</span>
      </button>
      {doc.sharedWith > 1 && (
        <span className="shrink-0 rounded bg-[var(--app-faint)] px-1 text-[10px] font-semibold text-[var(--app-muted)]" title={`Shared by ${doc.sharedWith} robots on this contract`}>
          ×{doc.sharedWith}
        </span>
      )}
      <button type="button" onClick={onAttach} title="Replace the PDF" aria-label="Replace contract PDF" className="rounded p-1 text-[var(--app-muted)] hover:bg-[var(--app-faint)] hover:text-[var(--app-brand-dark)]">
        <Paperclip className="h-3.5 w-3.5" />
      </button>
      <button type="button" onClick={onRemove} title="Remove the PDF from this robot" aria-label="Remove contract PDF" className="rounded p-1 text-[var(--app-muted)] hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/40">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function Table({
  rows,
  ended,
  onAttach,
  onRemove,
  onError,
}: {
  rows: ExpiringContract[];
  ended: boolean;
  onAttach: (row: ExpiringContract) => void;
  onRemove: (row: ExpiringContract) => void;
  onError: (message: string) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)]">
      <table className="w-full min-w-[68rem] text-left text-sm">
        <thead className="border-b border-[var(--app-border)] text-xs uppercase tracking-wide text-[var(--app-muted)]">
          <tr>
            <th className="px-3 py-2.5 font-semibold">Customer</th>
            <th className="px-3 py-2.5 font-semibold">Site</th>
            <th className="px-3 py-2.5 font-semibold">Robot</th>
            <th className="px-3 py-2.5 font-semibold">Contract</th>
            <th className="px-3 py-2.5 text-right font-semibold">{ended ? 'Ended' : 'Ends in'}</th>
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
        </tbody>
      </table>
    </div>
  );
}

export function ContractsPanel() {
  const [windowDays, setWindowDays] = useState(30);
  const [attaching, setAttaching] = useState<ExpiringContract | null>(null);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const queryClient = useQueryClient();
  const { confirm, confirmDialog } = useConfirm();

  const query = useQuery({
    queryKey: ['contracts-expiring', windowDays],
    queryFn: () => contractsApi.expiring(windowDays).then((r) => r.data.data),
  });
  const data = query.data;
  const allRows = data ? [...data.endingSoon, ...data.ended] : [];

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['contracts-expiring'] });

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

      {data && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-[var(--app-text)]">Ending within {data.windowDays} days</h3>
          {data.endingSoon.length === 0 ? (
            <p className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              No contracts end in the next {data.windowDays} days.
            </p>
          ) : (
            <Table rows={data.endingSoon} ended={false} onAttach={setAttaching} onRemove={askRemove} onError={(text) => setNotice({ kind: 'error', text })} />
          )}
        </section>
      )}

      {data && data.ended.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-[var(--app-text)]">Already ended</h3>
          <Table rows={data.ended} ended onAttach={setAttaching} onRemove={askRemove} onError={(text) => setNotice({ kind: 'error', text })} />
          <p className="text-xs leading-5 text-[var(--app-muted)]">
            An ended robot gets no monthly report and is not on the No data list. If the contract was renewed, extend the end date on the robot; if the robot came back, clear it.
          </p>
        </section>
      )}

      <p className="text-xs leading-5 text-[var(--app-muted)]">
        Only robots with an end date appear here. Each contract is emailed to the customer success address once as it enters the 30-day
        window; changing the end date re-arms that alert. The Contract PDF is the signed document, kept in private storage; one upload can
        cover every robot of the customer on the same contract dates.
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
