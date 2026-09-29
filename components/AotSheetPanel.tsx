'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Copy,
  FileSpreadsheet,
  HelpCircle,
  KeyRound,
  Loader2,
  PlugZap,
  RefreshCw,
  Save,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import { aotSheetApi } from '@/lib/api';
import { useConfirm } from '@/components/ui/confirm-dialog';
import type {
  AotSheetOpenCases,
  AotSheetPreview,
  AotSheetRefreshOutcome,
  AotSheetSettings,
  AotSheetSettingsRequest,
} from '@/types/api';
import { errorMessage, todayInBangkok } from './CasePendingPanel';

/**
 * AOT's Google Sheet, on the AOT tab of Pending cases: which sheet AOT's cases are read
 * from, how, and the cases it holds.
 *
 * <p>The link and the column choices are saved in the database, so they stay until
 * somebody changes them or presses Remove link, with no redeploy either way. The Google
 * key that proves who is reading is not: it is a secret and stays in the server's
 * environment, which is why this page can say whether one is configured but never shows
 * or accepts it.
 */

const input =
  'w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-2 text-sm text-[var(--app-text)]';
const button =
  'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition disabled:opacity-60';
const primary = `${button} bg-[var(--app-brand)] text-white shadow-sm hover:opacity-90`;
const secondary = `${button} border border-[var(--app-border)] bg-[var(--app-bg)] text-[var(--app-text)] hover:bg-[var(--app-faint)]`;

/** The tags the guide's rich messages use. */
const rich = {
  b: (chunks: React.ReactNode) => <b>{chunks}</b>,
  code: (chunks: React.ReactNode) => <code>{chunks}</code>,
  mono: (chunks: React.ReactNode) => <span className="font-mono">{chunks}</span>,
};

/** A moment on Bangkok's clock, in the language of the page. */
const stamp = (value: string, locale: string, short = false) =>
  new Date(value).toLocaleString(
    locale === 'th' ? 'th-TH' : 'en-GB',
    short
      ? { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok' }
      : { timeZone: 'Asia/Bangkok' },
  );

function Label({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <span className="flex flex-col gap-0.5">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--app-muted)]">{children}</span>
      {hint && <span className="text-xs text-[var(--app-muted)]">{hint}</span>}
    </span>
  );
}

function StatusItem({ ok, label, detail }: { ok: boolean; label: string; detail: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] p-3">
      {ok ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
      ) : (
        <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--app-muted)]" />
      )}
      <div>
        <p className="text-sm font-semibold text-[var(--app-text)]">{label}</p>
        <p className="text-xs text-[var(--app-muted)]">{detail}</p>
      </div>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const t = useTranslations('aotSheet');
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      className={secondary}
    >
      <Copy className="h-4 w-4" />
      {copied ? t('copied') : t('copy')}
    </button>
  );
}

function ErrorBox({ error }: { error: unknown }) {
  const t = useTranslations('aotSheet');
  return (
    <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{errorMessage(error, t('errorFallback'))}</span>
    </div>
  );
}

/** What a test read found: the headers to choose from, and anything that would stop a sync. */
function PreviewResult({ preview }: { preview: AotSheetPreview }) {
  const t = useTranslations('aotSheet');
  const problems = [
    ...preview.missingHeaders.map((h) => t('problemMissingColumn', { name: h })),
    ...(preview.duplicateIds.length > 0 ? [t('problemDuplicateIds', { count: preview.duplicateIds.length })] : []),
    ...(preview.openDateUnreadable > 0 ? [t('problemOpenDate', { count: preview.openDateUnreadable })] : []),
  ];
  return (
    <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900 dark:bg-emerald-950/20">
      <p className="flex items-center gap-2 text-sm font-semibold text-[var(--app-text)]">
        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        {t('connected', { count: preview.rows, tab: preview.tab })}
      </p>
      <dl className="grid gap-2 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-xs text-[var(--app-muted)]">{t('previewRows')}</dt>
          <dd className="font-semibold">{preview.rows}</dd>
        </div>
        <div>
          <dt className="text-xs text-[var(--app-muted)]">{t('previewNoId')}</dt>
          <dd className="font-semibold">{preview.rowsWithoutId}</dd>
        </div>
        <div>
          <dt className="text-xs text-[var(--app-muted)]">{t('previewOpen')}</dt>
          <dd className="font-semibold">{preview.open ?? t('previewSetClosed')}</dd>
        </div>
        <div>
          <dt className="text-xs text-[var(--app-muted)]">{t('previewClosed')}</dt>
          <dd className="font-semibold">{preview.closed ?? '—'}</dd>
        </div>
      </dl>
      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--app-muted)]">
          {t('previewColumns', { count: preview.headers.length })}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {preview.headers.map((h) => (
            <span
              key={h}
              className="rounded-md border border-[var(--app-border)] bg-[var(--app-panel)] px-2 py-0.5 text-xs text-[var(--app-text)]"
            >
              {h}
            </span>
          ))}
        </div>
      </div>
      {problems.length > 0 && (
        <ul className="space-y-1 text-sm text-amber-800 dark:text-amber-300">
          {problems.map((p) => (
            <li key={p} className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {p}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * The form. Keyed by the saved version, so it starts from what is stored and resets after
 * each save without copying server data into state from an effect.
 */
function SettingsForm({ saved }: { saved: AotSheetSettings }) {
  const t = useTranslations('aotSheet');
  const queryClient = useQueryClient();
  const { confirm, confirmDialog } = useConfirm();
  const [form, setForm] = useState<AotSheetSettingsRequest>({
    sheetUrl: saved.sheetUrl ?? '',
    tab: saved.tab ?? 'Case',
    headerRow: saved.headerRow ?? 1,
    rowIdHeader: saved.rowIdHeader ?? '',
    statusHeader: saved.statusHeader ?? '',
    closedStatuses: saved.closedStatuses ?? '',
    closeDateHeader: saved.closeDateHeader ?? '',
    syncEnabled: saved.syncEnabled,
  });
  const set = <K extends keyof AotSheetSettingsRequest>(key: K, value: AotSheetSettingsRequest[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const save = useMutation({
    mutationFn: async () => (await aotSheetApi.saveSettings(form)).data.data,
    onSuccess: (fresh) => queryClient.setQueryData(['aot-sheet-settings'], fresh),
  });
  const remove = useMutation({
    mutationFn: async () => (await aotSheetApi.removeSettings()).data.data,
    onSuccess: (fresh) => {
      queryClient.setQueryData(['aot-sheet-settings'], fresh);
      void queryClient.invalidateQueries({ queryKey: ['aot-sheet-cases'] });
    },
  });
  const test = useMutation({ mutationFn: async () => (await aotSheetApi.preview(0)).data.data });
  const sync = useMutation({
    mutationFn: async () => (await aotSheetApi.sync()).data.data,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['aot-sheet-cases'] }),
  });

  const askRemove = () =>
    void confirm({
      title: t('removeConfirmTitle'),
      kind: 'delete',
      confirmLabel: t('removeLink'),
      message: t('removeConfirmBody'),
    }).then((ok) => ok && remove.mutate());

  const headers = test.data?.headers ?? [];
  const dirty =
    form.sheetUrl !== (saved.sheetUrl ?? '') ||
    form.tab !== saved.tab ||
    form.headerRow !== saved.headerRow ||
    form.rowIdHeader !== (saved.rowIdHeader ?? '') ||
    form.statusHeader !== (saved.statusHeader ?? '') ||
    form.closedStatuses !== (saved.closedStatuses ?? '') ||
    form.closeDateHeader !== (saved.closeDateHeader ?? '') ||
    form.syncEnabled !== saved.syncEnabled;

  return (
    <div className="space-y-4">
      {/* The sheet */}
      <section className="space-y-4 rounded-lg bg-[var(--app-bg)] p-4">
        <h3 className="flex items-center gap-2 text-base font-semibold text-[var(--app-text)]">
          <FileSpreadsheet className="h-4 w-4" /> {t('theSheet')}
        </h3>
        <label className="flex flex-col gap-1.5">
          <Label hint={t('sheetLinkHint')}>{t('sheetLink')}</Label>
          <input
            className={input}
            value={form.sheetUrl}
            onChange={(e) => set('sheetUrl', e.target.value)}
            placeholder="https://docs.google.com/spreadsheets/d/…/edit"
          />
          {saved.spreadsheetId && (
            <span className="text-xs text-[var(--app-muted)]">
              {t.rich('savedSheetId', { id: saved.spreadsheetId, ...rich })}
            </span>
          )}
        </label>
        <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
          <label className="flex flex-col gap-1.5">
            <Label hint={t('tabHint')}>{t('tab')}</Label>
            <input className={input} value={form.tab} onChange={(e) => set('tab', e.target.value)} />
          </label>
          <label className="flex flex-col gap-1.5">
            <Label hint={t('headerRowHint')}>{t('headerRow')}</Label>
            <input
              type="number"
              min={1}
              className={input}
              value={form.headerRow}
              onChange={(e) => set('headerRow', Math.max(1, Number(e.target.value) || 1))}
            />
          </label>
        </div>
      </section>

      {/* The columns */}
      <section className="space-y-4 rounded-lg bg-[var(--app-bg)] p-4">
        <h3 className="text-base font-semibold text-[var(--app-text)]">{t('columnsTitle')}</h3>
        <p className="text-sm text-[var(--app-muted)]">
          {t.rich('columnsIntro', rich)}
        </p>
        <datalist id="aot-sheet-headers">
          {headers.map((h) => (
            <option key={h} value={h} />
          ))}
        </datalist>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <Label hint={t('idColumnHint')}>{t('idColumn')}</Label>
            <input
              className={input}
              list="aot-sheet-headers"
              value={form.rowIdHeader}
              onChange={(e) => set('rowIdHeader', e.target.value)}
              placeholder={t('idPlaceholder')}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <Label hint={t('closeDateHint')}>{t('closeDateColumn')}</Label>
            <input
              className={input}
              list="aot-sheet-headers"
              value={form.closeDateHeader}
              onChange={(e) => set('closeDateHeader', e.target.value)}
              placeholder={t('closeDatePlaceholder')}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <Label hint={t('statusColumnHint')}>{t('statusColumn')}</Label>
            <input
              className={input}
              list="aot-sheet-headers"
              value={form.statusHeader}
              onChange={(e) => set('statusHeader', e.target.value)}
              placeholder={t('statusPlaceholder')}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <Label hint={t('closedValuesHint')}>{t('closedValues')}</Label>
            <input
              className={input}
              value={form.closedStatuses}
              onChange={(e) => set('closedStatuses', e.target.value)}
              placeholder={t('closedValuesPlaceholder')}
            />
          </label>
        </div>
        <label className="flex items-start gap-3 rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] p-3">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4"
            checked={form.syncEnabled}
            onChange={(e) => set('syncEnabled', e.target.checked)}
          />
          <span>
            <span className="block text-sm font-semibold text-[var(--app-text)]">{t('keepInSync')}</span>
            <span className="block text-xs text-[var(--app-muted)]">
              {t('keepInSyncBody')}
            </span>
          </span>
        </label>
      </section>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className={primary} onClick={() => save.mutate()} disabled={save.isPending || !dirty}>
          {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {t('save')}
        </button>
        <button
          type="button"
          className={secondary}
          onClick={() => test.mutate()}
          disabled={test.isPending || !saved.spreadsheetId || dirty}
          title={dirty ? t('testTitleDirty') : t('testTitle')}
        >
          {test.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlugZap className="h-4 w-4" />}
          {t('testConnection')}
        </button>
        <button
          type="button"
          className={secondary}
          onClick={() => sync.mutate()}
          disabled={sync.isPending || !saved.syncEnabled || dirty}
          title={saved.syncEnabled ? t('syncNowTitle') : t('syncNowTitleOff')}
        >
          {sync.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {t('syncNow')}
        </button>
        {dirty && <span className="text-xs text-amber-700 dark:text-amber-300">{t('unsaved')}</span>}
        {save.isSuccess && !dirty && <span className="text-xs text-emerald-700 dark:text-emerald-300">{t('savedDone')}</span>}
        {saved.savedInConsole && (
          <button
            type="button"
            onClick={askRemove}
            disabled={remove.isPending}
            title={t('removeLinkTitle')}
            className={`${button} ml-auto text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/40`}
          >
            {remove.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            {t('removeLink')}
          </button>
        )}
      </div>

      {save.isError && <ErrorBox error={save.error} />}
      {remove.isError && <ErrorBox error={remove.error} />}
      {test.isError && <ErrorBox error={test.error} />}
      {sync.isError && <ErrorBox error={sync.error} />}
      {test.data && <PreviewResult preview={test.data} />}
      {sync.data && (
        <p className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 text-sm dark:border-emerald-900 dark:bg-emerald-950/20">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          {t('syncResult', {
            seen: sync.data.seen,
            created: sync.data.created,
            updated: sync.data.updated,
            statusChanges: sync.data.statusChanges,
            closed: sync.data.closed,
          })}
        </p>
      )}
      {confirmDialog}
    </div>
  );
}

/** One collapsible step of the guide. */
function Step({
  n,
  title,
  who,
  open,
  children,
}: {
  n: number | string;
  title: string;
  who?: string;
  open?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details
      open={open}
      className="group rounded-lg bg-[var(--app-panel)] ring-1 ring-inset ring-[var(--app-border)] [&_summary::-webkit-details-marker]:hidden"
    >
      <summary className="flex cursor-pointer list-none items-center gap-3 p-4">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--app-brand)] text-sm font-bold text-white">
          {n}
        </span>
        <span className="flex-1">
          <span className="block text-sm font-semibold text-[var(--app-text)]">{title}</span>
          {who && <span className="block text-xs text-[var(--app-muted)]">{who}</span>}
        </span>
        <ChevronRight className="h-4 w-4 text-[var(--app-muted)] transition group-open:rotate-90" />
      </summary>
      <div className="space-y-2 border-t border-[var(--app-border)] px-4 pb-4 pt-3 text-sm leading-relaxed text-[var(--app-text)] [&_code]:rounded [&_code]:bg-[var(--app-bg)] [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs [&_li]:ml-5 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ul]:list-disc [&_ul]:space-y-1">
        {children}
      </div>
    </details>
  );
}

/**
 * How to set it up, step by step. Read once, so it lives behind the card's "?" rather than
 * on the page; the form is what is used every day after.
 */
function Guide({ settings }: { settings: AotSheetSettings }) {
  const t = useTranslations('aotSheet');
  const share = settings.shareWith ?? 'raaspal-sheets-reader@<project>.iam.gserviceaccount.com';
  return (
    <div className="space-y-2">
      <p className="text-sm text-[var(--app-muted)]">{t('guide.intro')}</p>

      <Step n="?" title={t('guide.how.title')} who={t('guide.how.who')} open={!settings.savedInConsole}>
        <p>{t('guide.how.intro')}</p>
        <ol>
          <li>{t.rich('guide.how.link', rich)}</li>
          <li>{t.rich('guide.how.share', rich)}</li>
          <li>{t.rich('guide.how.key', rich)}</li>
        </ol>
        <p>{t('guide.how.browser')}</p>
      </Step>

      <Step n={1} title={t('guide.account.title')} who={t('guide.account.who')}>
        <ol>
          <li>{t.rich('guide.account.project', rich)}</li>
          <li>{t.rich('guide.account.api', rich)}</li>
          <li>{t.rich('guide.account.create', rich)}</li>
          <li>{t.rich('guide.account.key', rich)}</li>
          <li>{t.rich('guide.account.email', rich)}</li>
        </ol>
        <p className="text-amber-800 dark:text-amber-300">{t('guide.account.policy')}</p>
      </Step>

      <Step n={2} title={t('guide.server.title')} who={t('guide.server.who')}>
        <p>{t.rich('guide.server.laptop', rich)}</p>
        <p>
          <code>app.googlesheet.credentials=/Users/you/.config/raaspal/sheets-key.json</code>
        </p>
        <p>{t.rich('guide.server.host', rich)}</p>
        <p>{t('guide.server.restart')}</p>
        <p>{t.rich('guide.server.leak', rich)}</p>
      </Step>

      <Step n={3} title={t('guide.share.title')} who={t('guide.share.who')}>
        <ol>
          <li>{t.rich('guide.share.open', rich)}</li>
          <li>
            {t('guide.share.paste')}{' '}
            <span className="inline-flex items-center gap-2">
              <code>{share}</code>
              {settings.shareWith && <CopyButton text={settings.shareWith} />}
            </span>
          </li>
          <li>{t.rich('guide.share.role', rich)}</li>
        </ol>
        <p>{t.rich('guide.share.viewOnly', rich)}</p>
      </Step>

      <Step n={4} title={t('guide.paste.title')} who={t('guide.paste.who')}>
        <ol>
          <li>{t.rich('guide.paste.copy', rich)}</li>
          <li>{t.rich('guide.paste.tab', rich)}</li>
          <li>{t.rich('guide.paste.test', rich)}</li>
        </ol>
        <p>{t.rich('guide.paste.stays', rich)}</p>
      </Step>

      <Step n={5} title={t('guide.columns.title')} who={t('guide.columns.who')}>
        <p>{t('guide.columns.intro')}</p>
        <ul>
          <li>{t.rich('guide.columns.id', rich)}</li>
          <li>{t.rich('guide.columns.closed', rich)}</li>
        </ul>
        <p>{t('guide.columns.retest')}</p>
      </Step>

      <Step n={6} title={t('guide.sync.title')} who={t('guide.sync.who')}>
        <p>{t.rich('guide.sync.body', rich)}</p>
      </Step>

      <Step n="!" title={t('guide.errors.title')} who={t('guide.errors.who')}>
        <ul>
          <li>{t.rich('guide.errors.cannotOpen', rich)}</li>
          <li>{t.rich('guide.errors.notFound', rich)}</li>
          <li>{t.rich('guide.errors.noTab', rich)}</li>
          <li>{t.rich('guide.errors.noKey', rich)}</li>
          <li>{t.rich('guide.errors.dupIds', rich)}</li>
          <li>{t.rich('guide.errors.noColumn', rich)}</li>
        </ul>
      </Step>
    </div>
  );
}

/**
 * The setup guide as a dialog, opened from the "?" in the Google Sheet card's corner.
 * Escape or the backdrop closes it, as the app's other dialogs do.
 */
export function AotSheetHelp() {
  const t = useTranslations('aotSheet');
  const [open, setOpen] = useState(false);
  const query = useQuery({
    queryKey: ['aot-sheet-settings'],
    queryFn: async () => (await aotSheetApi.settings()).data.data,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t('help.aria')}
        title={t('help.aria')}
        className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)] text-[var(--app-muted)] transition-colors duration-150 hover:bg-[var(--app-faint)] hover:text-[var(--app-text)]"
      >
        <HelpCircle className="h-4 w-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="aot-sheet-help-title"
              className="pointer-events-auto flex max-h-full w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-[var(--app-panel)] shadow-2xl"
            >
              <div className="flex items-start justify-between gap-3 border-b border-[var(--app-border-strong)] px-5 py-4">
                <div>
                  <h2 id="aot-sheet-help-title" className="text-base font-semibold text-[var(--app-text)]">
                    {t('help.title')}
                  </h2>
                  <p className="text-xs text-[var(--app-muted)]">{t('help.subtitle')}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label={t('close')}
                  className="cursor-pointer rounded-lg p-1.5 text-[var(--app-muted)] transition-colors duration-150 hover:bg-[var(--app-faint)] hover:text-[var(--app-text)]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="overflow-y-auto bg-[var(--app-bg)] p-5">
                {query.data ? <Guide settings={query.data} /> : <Loader2 className="h-4 w-4 animate-spin" />}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

/**
 * Opening the AOT tab brings the sheet up to date: one call when the tab mounts, which the
 * server turns into a sync only if the last one is more than 5 minutes old, and nothing at
 * all while the sync is off. The case list re-reads when a sync lands.
 */
export function useAotSheetAutoSync() {
  const queryClient = useQueryClient();
  const settings = useQuery({
    queryKey: ['aot-sheet-settings'],
    queryFn: async () => (await aotSheetApi.settings()).data.data,
    refetchOnWindowFocus: false,
  });
  const on = !!settings.data?.spreadsheetId && !!settings.data?.syncEnabled;
  return useQuery({
    queryKey: ['aot-sheet-refresh'],
    queryFn: async () => {
      const outcome = (await aotSheetApi.refresh()).data.data;
      if (outcome.synced) await queryClient.invalidateQueries({ queryKey: ['aot-sheet-cases'] });
      return outcome;
    },
    enabled: on,
    // Reopening the tab within 5 minutes asks nothing; the server would skip it anyway.
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: false,
  });
}

type SheetState = { tone: 'ok' | 'warn' | 'off' | 'bad' | 'busy'; label: string; detail: string };

/** One line on where the sheet stands, for the pill and the collapsed section's summary. */
function sheetState(
  t: ReturnType<typeof useTranslations>,
  locale: string,
  settings: AotSheetSettings | undefined,
  cases: AotSheetOpenCases | undefined,
  refresh?: { syncing: boolean; outcome?: AotSheetRefreshOutcome },
): SheetState {
  const name = t('state.name');
  if (!settings) return { tone: 'off', label: name, detail: t('state.checking') };
  if (refresh?.syncing) return { tone: 'busy', label: name, detail: t('state.syncing') };
  if (refresh?.outcome?.failed) return { tone: 'bad', label: name, detail: t('state.lastFailed') };
  if (!settings.credentialsConfigured) return { tone: 'off', label: name, detail: t('state.noKey') };
  if (!settings.spreadsheetId) return { tone: 'off', label: name, detail: t('state.notLinked') };
  if (cases?.lastSyncedAt) {
    const at = stamp(cases.lastSyncedAt, locale, true);
    return {
      tone: settings.syncEnabled ? 'ok' : 'warn',
      label: t('state.connected'),
      detail: t(settings.syncEnabled ? 'state.synced' : 'state.syncedOff', { at }),
    };
  }
  return { tone: 'warn', label: t('state.linked'), detail: t('state.notSynced') };
}

const DOT: Record<SheetState['tone'], string> = {
  ok: 'bg-emerald-500',
  warn: 'bg-amber-500',
  off: 'bg-slate-400',
  bad: 'bg-red-500',
  busy: 'bg-sky-500 motion-safe:animate-pulse',
};

/**
 * Is AOT's Google Sheet connected: a pill for the toolbar of the AOT tab. Clicking it opens
 * the sheet's link settings below.
 */
export function AotSheetStatusPill() {
  const t = useTranslations('aotSheet');
  const locale = useLocale();
  const settings = useQuery({
    queryKey: ['aot-sheet-settings'],
    queryFn: async () => (await aotSheetApi.settings()).data.data,
    refetchOnWindowFocus: false,
  });
  const linked = !!settings.data?.spreadsheetId;
  const cases = useQuery({
    queryKey: ['aot-sheet-cases'],
    queryFn: async () => (await aotSheetApi.openCases()).data.data,
    refetchOnWindowFocus: false,
    enabled: linked,
  });
  const refresh = useAotSheetAutoSync();
  const state = sheetState(t, locale, settings.data, linked ? cases.data : undefined, {
    syncing: refresh.isFetching,
    outcome: refresh.data,
  });

  const openSettings = () => {
    const section = document.getElementById(SETTINGS_ID) as HTMLDetailsElement | null;
    if (!section) return;
    section.open = true;
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <button
      type="button"
      onClick={openSettings}
      title={
        refresh.data?.failed && refresh.data.reason
          ? t('pill.failedTitle', { reason: refresh.data.reason })
          : t('pill.openTitle')
      }
      className="inline-flex h-[2.625rem] cursor-pointer items-center gap-2 rounded-lg bg-[var(--app-panel)] px-3 text-sm shadow-sm ring-1 ring-inset ring-[var(--app-border)] transition-colors duration-150 hover:bg-[var(--app-faint)]"
    >
      <span aria-hidden className={`h-2 w-2 shrink-0 rounded-full ${DOT[state.tone]}`} />
      <FileSpreadsheet className="h-4 w-4 text-[var(--app-muted)]" />
      <span className="font-semibold text-[var(--app-text)]">{state.label}</span>
      <span className="text-[var(--app-muted)]">· {state.detail}</span>
    </button>
  );
}

const SETTINGS_ID = 'aot-sheet-settings';

/**
 * The linked sheet's open cases, as the last sync stored them. The sheet keeps no history
 * of its own, so this is today's list only; a past day shows the monday sheet above.
 */
function SheetCases({ asOf }: { asOf: string }) {
  const t = useTranslations('aotSheet');
  const locale = useLocale();
  const today = asOf === todayInBangkok();
  const query = useQuery({
    queryKey: ['aot-sheet-cases'],
    queryFn: async () => (await aotSheetApi.openCases()).data.data,
    refetchOnWindowFocus: false,
    enabled: today,
  });

  if (!today) {
    return (
      <p className="rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] p-3 text-sm text-[var(--app-muted)]">
        {t('cases.pastDay')}
      </p>
    );
  }
  if (query.isPending) {
    return (
      <div className="flex items-center gap-2 text-sm text-[var(--app-muted)]">
        <Loader2 className="h-4 w-4 animate-spin" /> {t('cases.loading')}
      </div>
    );
  }
  if (query.isError) return <ErrorBox error={query.error} />;

  const data: AotSheetOpenCases = query.data;
  if (!data.linked) return null;
  if (!data.lastSyncedAt) {
    return (
      <p className="rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] p-3 text-sm text-[var(--app-muted)]">
        {t.rich('cases.notSynced', rich)}
      </p>
    );
  }

  const th = 'px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-[var(--app-muted)]';
  const td = 'px-3 py-2.5 align-top text-[var(--app-text)]';
  return (
    <div className="space-y-2">
      <p className="text-sm text-[var(--app-muted)]">
        {t.rich('cases.summary', {
          count: data.cases.length,
          at: stamp(data.lastSyncedAt, locale),
          n: (chunks) => <span className="text-2xl font-semibold text-[var(--app-text)]">{chunks}</span>,
        })}
      </p>
      {data.cases.length > 0 && (
        <div className="overflow-x-auto rounded-lg ring-1 ring-inset ring-[var(--app-border)]">
          <table className="w-full min-w-[60rem] text-sm">
            <thead className="border-b border-[var(--app-border)]">
              <tr>
                <th className={th}>{t('cases.col.case')}</th>
                <th className={th}>{t('cases.col.location')}</th>
                <th className={th}>{t('cases.col.robot')}</th>
                <th className={th}>{t('cases.col.sn')}</th>
                <th className={th}>{t('cases.col.problem')}</th>
                <th className={th}>{t('cases.col.part')}</th>
                <th className={th}>{t('cases.col.repairBy')}</th>
                <th className={th}>{t('cases.col.openDate')}</th>
                <th className={`${th} text-right`}>{t('cases.col.days')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--app-border)]">
              {data.cases.map((c) => (
                <tr key={c.rowId ?? c.ticketNo ?? c.problem}>
                  <td className={`${td} whitespace-nowrap`}>
                    <span className="font-semibold">{c.rowId ?? '—'}</span>
                    {c.ticketNo && <span className="block text-xs text-[var(--app-muted)]">{c.ticketNo}</span>}
                  </td>
                  <td className={td}>{c.site ?? '—'}</td>
                  <td className={`${td} whitespace-nowrap`}>{c.model ?? '—'}</td>
                  <td className={`${td} font-mono text-xs`}>{c.serialNumbers ?? '—'}</td>
                  <td className={`${td} max-w-[18rem]`}>
                    <span className="line-clamp-3" title={c.problem ?? undefined}>
                      {c.problem ?? '—'}
                    </span>
                  </td>
                  <td className={`${td} max-w-[14rem]`}>{c.requestedPart ?? '—'}</td>
                  <td className={td}>{c.repairBy ?? '—'}</td>
                  <td className={`${td} whitespace-nowrap tabular-nums`}>{c.openDate ?? '—'}</td>
                  <td className={`${td} text-right font-semibold tabular-nums`}>{c.days ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/**
 * The Google Sheet part of the AOT tab: is it linked, its open cases, the link and columns,
 * and the setup guide, collapsed.
 *
 * @param asOf the period's day; the sheet's cases are shown for today only
 */
export function AotSheetPanel({ asOf }: { asOf: string }) {
  const t = useTranslations('aotSheet');
  const locale = useLocale();
  const query = useQuery({
    queryKey: ['aot-sheet-settings'],
    queryFn: async () => (await aotSheetApi.settings()).data.data,
    refetchOnWindowFocus: false,
  });
  const settings = query.data;
  // The same query as the case list and the toolbar pill: one fetch, and the summary line
  // below updates when a sync lands.
  const cases = useQuery({
    queryKey: ['aot-sheet-cases'],
    queryFn: async () => (await aotSheetApi.openCases()).data.data,
    refetchOnWindowFocus: false,
    enabled: !!settings?.spreadsheetId,
  });
  const refresh = useAotSheetAutoSync();

  if (query.isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-[var(--app-muted)]">
        <Loader2 className="h-4 w-4 animate-spin" /> {t('panel.loading')}
      </div>
    );
  }
  if (query.isError || !settings) return <ErrorBox error={query.error} />;

  const state = sheetState(t, locale, settings, settings.spreadsheetId ? cases.data : undefined, {
    syncing: refresh.isFetching,
    outcome: refresh.data,
  });

  const tiles = (
    <>
      <div className="grid gap-2 sm:grid-cols-3">
        <StatusItem
          ok={settings.credentialsConfigured}
          label={settings.credentialsConfigured ? t('panel.keyOk') : t('panel.keyMissing')}
          detail={settings.credentialsConfigured ? t('panel.keyOkDetail') : t('panel.keyMissingDetail')}
        />
        <StatusItem
          ok={!!settings.spreadsheetId}
          label={settings.spreadsheetId ? t('panel.linked') : t('panel.notLinked')}
          detail={
            settings.updatedAt
              ? settings.updatedBy
                ? t('panel.savedAtBy', { at: stamp(settings.updatedAt, locale), by: settings.updatedBy })
                : t('panel.savedAt', { at: stamp(settings.updatedAt, locale) })
              : settings.spreadsheetId
                ? t('panel.fromConfig')
                : t('panel.pasteBelow')
          }
        />
        <StatusItem
          ok={settings.syncEnabled}
          label={settings.syncEnabled ? t('panel.syncOn') : t('panel.syncOff')}
          detail={
            settings.syncEnabled
              ? t('panel.syncOnDetail')
              : settings.notReadyForSync.length > 0
                ? t('panel.stillNeeded', { count: settings.notReadyForSync.length })
                : t('panel.readyToTurnOn')
          }
        />
      </div>

      {settings.credentialsConfigured && settings.shareWith && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--app-brand)] bg-[var(--app-brand-soft)] p-3">
          <KeyRound className="h-4 w-4 text-[var(--app-brand-dark)]" />
          <span className="text-sm text-[var(--app-text)]">
            {t.rich('panel.shareBanner', {
              address: settings.shareWith,
              code: (chunks) => <code className="font-mono text-xs">{chunks}</code>,
            })}
          </span>
          <CopyButton text={settings.shareWith} />
        </div>
      )}
    </>
  );

  return (
    <div className="space-y-4">
      {settings.spreadsheetId && <SheetCases asOf={asOf} />}

      {/* The link and columns are set once and changed rarely, so they fold away; open
          until a sheet is linked, because then they are the only thing to do here. */}
      <details
        id={SETTINGS_ID}
        open={!settings.spreadsheetId}
        className="group/settings scroll-mt-24 rounded-lg ring-1 ring-inset ring-[var(--app-border)] [&>summary::-webkit-details-marker]:hidden"
      >
        <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3">
          <ChevronRight className="h-4 w-4 shrink-0 text-[var(--app-muted)] transition-transform duration-150 group-open/settings:rotate-90" />
          <span className="flex-1">
            <span className="block text-sm font-semibold text-[var(--app-text)]">{t('panel.linkAndColumns')}</span>
            <span className="block text-xs text-[var(--app-muted)]">
              {settings.spreadsheetId
                ? t('panel.summaryLinked', {
                    tab: settings.tab,
                    id: settings.rowIdHeader ? `“${settings.rowIdHeader}”` : t('panel.notChosen'),
                    state: state.detail,
                  })
                : t('panel.pasteToConnect')}
            </span>
          </span>
          <span aria-hidden className={`h-2 w-2 shrink-0 rounded-full ${DOT[state.tone]}`} />
        </summary>
        <div className="space-y-4 px-4 pb-4">
          {tiles}
          <SettingsForm key={`${settings.updatedAt ?? 'none'}-${settings.spreadsheetId ?? ''}`} saved={settings} />
        </div>
      </details>
    </div>
  );
}
