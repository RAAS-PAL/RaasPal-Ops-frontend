'use client';

import { useEffect, useState } from 'react';
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
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

function ErrorBox({ error }: { error: unknown }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{errorMessage(error, 'Something went wrong. Check that the backend is running.')}</span>
    </div>
  );
}

/** What a test read found: the headers to choose from, and anything that would stop a sync. */
function PreviewResult({ preview }: { preview: AotSheetPreview }) {
  const problems = [
    ...preview.missingHeaders.map((h) => `No column named “${h}” on the sheet.`),
    ...(preview.duplicateIds.length > 0
      ? [`${preview.duplicateIds.length} id(s) appear on more than one row — each case needs its own id.`]
      : []),
    ...(preview.openDateUnreadable > 0
      ? [`${preview.openDateUnreadable} row(s) have an Issue Date that is not a date.`]
      : []),
  ];
  return (
    <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900 dark:bg-emerald-950/20">
      <p className="flex items-center gap-2 text-sm font-semibold text-[var(--app-text)]">
        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        Connected — read {preview.rows} row{preview.rows === 1 ? '' : 's'} from tab “{preview.tab}”.
      </p>
      <dl className="grid gap-2 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-xs text-[var(--app-muted)]">Rows</dt>
          <dd className="font-semibold">{preview.rows}</dd>
        </div>
        <div>
          <dt className="text-xs text-[var(--app-muted)]">Without an id</dt>
          <dd className="font-semibold">{preview.rowsWithoutId}</dd>
        </div>
        <div>
          <dt className="text-xs text-[var(--app-muted)]">Open</dt>
          <dd className="font-semibold">{preview.open ?? '— set a closed column'}</dd>
        </div>
        <div>
          <dt className="text-xs text-[var(--app-muted)]">Closed</dt>
          <dd className="font-semibold">{preview.closed ?? '—'}</dd>
        </div>
      </dl>
      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--app-muted)]">
          Columns on the sheet ({preview.headers.length}, hidden ones included)
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
      title: 'Remove the sheet link?',
      kind: 'delete',
      confirmLabel: 'Remove link',
      message:
        'RAASPAL stops reading this sheet and the daily sync stops. The sheet itself is not touched, and you can paste the link again at any time. Cases already copied from it stay in the database but are no longer listed.',
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
          <FileSpreadsheet className="h-4 w-4" /> The sheet
        </h3>
        <label className="flex flex-col gap-1.5">
          <Label hint="Copy it from the browser's address bar while the sheet is open. Change it here whenever the sheet moves.">
            Google Sheet link
          </Label>
          <input
            className={input}
            value={form.sheetUrl}
            onChange={(e) => set('sheetUrl', e.target.value)}
            placeholder="https://docs.google.com/spreadsheets/d/…/edit"
          />
          {saved.spreadsheetId && (
            <span className="text-xs text-[var(--app-muted)]">
              Saved sheet id: <span className="font-mono">{saved.spreadsheetId}</span>
            </span>
          )}
        </label>
        <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
          <label className="flex flex-col gap-1.5">
            <Label hint="The tab's name exactly as its label shows — capitals matter.">Tab</Label>
            <input className={input} value={form.tab} onChange={(e) => set('tab', e.target.value)} />
          </label>
          <label className="flex flex-col gap-1.5">
            <Label hint="Usually 1.">Header row</Label>
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
        <h3 className="text-base font-semibold text-[var(--app-text)]">Which columns mean what</h3>
        <p className="text-sm text-[var(--app-muted)]">
          Press <b>Test connection</b> first — the column names on the sheet then appear as suggestions in these fields.
          Fill the id, and either a status column with its closed values or a close-date column.
        </p>
        <datalist id="aot-sheet-headers">
          {headers.map((h) => (
            <option key={h} value={h} />
          ))}
        </datalist>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <Label hint="Unique per case and never changes. Row numbers are not safe: sorting moves them.">
              Case id column
            </Label>
            <input
              className={input}
              list="aot-sheet-headers"
              value={form.rowIdHeader}
              onChange={(e) => set('rowIdHeader', e.target.value)}
              placeholder="e.g. Case ID"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <Label hint="Any date here means the case is closed. Leave empty if you use a status instead.">
              Close-date column
            </Label>
            <input
              className={input}
              list="aot-sheet-headers"
              value={form.closeDateHeader}
              onChange={(e) => set('closeDateHeader', e.target.value)}
              placeholder="e.g. Closed Date"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <Label hint="The column that says where a case stands.">Status column</Label>
            <input
              className={input}
              list="aot-sheet-headers"
              value={form.statusHeader}
              onChange={(e) => set('statusHeader', e.target.value)}
              placeholder="e.g. Status"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <Label hint="Comma-separated. Matched ignoring capitals.">Status values that mean closed</Label>
            <input
              className={input}
              value={form.closedStatuses}
              onChange={(e) => set('closedStatuses', e.target.value)}
              placeholder="e.g. Closed, Done"
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
            <span className="block text-sm font-semibold text-[var(--app-text)]">Keep this sheet in sync</span>
            <span className="block text-xs text-[var(--app-muted)]">
              Copies the sheet into RAASPAL&apos;s database by itself: with the monday refresh every 15 minutes
              (07:00–23:45 and at 06:15), and whenever someone opens the AOT tab, at most every 5 minutes. Needs the
              id and closed columns set; saving refuses until they are.
            </span>
          </span>
        </label>
      </section>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className={primary} onClick={() => save.mutate()} disabled={save.isPending || !dirty}>
          {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save
        </button>
        <button
          type="button"
          className={secondary}
          onClick={() => test.mutate()}
          disabled={test.isPending || !saved.spreadsheetId || dirty}
          title={
            dirty ? 'Save first — the test reads the saved sheet.' : 'Read the sheet now, without writing anything.'
          }
        >
          {test.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlugZap className="h-4 w-4" />}
          Test connection
        </button>
        <button
          type="button"
          className={secondary}
          onClick={() => sync.mutate()}
          disabled={sync.isPending || !saved.syncEnabled || dirty}
          title={saved.syncEnabled ? 'Copy the sheet into the database now.' : 'Turn the sync on and save first.'}
        >
          {sync.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Sync now
        </button>
        {dirty && <span className="text-xs text-amber-700 dark:text-amber-300">Unsaved changes</span>}
        {save.isSuccess && !dirty && <span className="text-xs text-emerald-700 dark:text-emerald-300">Saved</span>}
        {saved.savedInConsole && (
          <button
            type="button"
            onClick={askRemove}
            disabled={remove.isPending}
            title="Unlink the sheet. It stays linked until you press this."
            className={`${button} ml-auto text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/40`}
          >
            {remove.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Remove link
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
          Synced {sync.data.seen} rows: {sync.data.created} new, {sync.data.updated} updated, {sync.data.statusChanges}{' '}
          status change{sync.data.statusChanges === 1 ? '' : 's'}, {sync.data.closed} removed from the sheet.
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
  const share = settings.shareWith ?? 'raaspal-sheets-reader@<project>.iam.gserviceaccount.com';
  return (
    <div className="space-y-2">
      <p className="text-sm text-[var(--app-muted)]">
        Open a step for the detail. Steps 1–2 are done once by whoever runs the server; step 3 by whoever owns the
        sheet; the rest here.
      </p>

      <Step n="?" title="How the link works" who="Read this first" open={!settings.savedInConsole}>
        <p>
          Three things connect RAASPAL to the sheet. Nothing is copied or moved — AOT keeps working in their sheet
          exactly as now.
        </p>
        <ol>
          <li>
            <b>The link says which sheet.</b> The long code between <code>/d/</code> and <code>/edit</code> is the
            sheet&apos;s id; it is all the system needs from the link.
          </li>
          <li>
            <b>The Share list says who may read it.</b> The sheet is shared with one more “person”: RAASPAL&apos;s
            system account, as a <b>Viewer</b>. It can read; it can never edit.
          </li>
          <li>
            <b>A key proves the system is that account.</b> Google gives the account a key file; the server keeps it and
            uses it to sign in. Without the key, the share does nothing; without the share, the key opens nothing.
          </li>
        </ol>
        <p>
          You being able to open the sheet in your browser does not help the server: it has no browser and cannot sign
          in as you, which is why it needs its own account.
        </p>
      </Step>

      <Step
        n={1}
        title="Create the system account (once)"
        who="Whoever manages RAASPAL's Google Cloud — about 5 minutes"
      >
        <ol>
          <li>
            Open <code>console.cloud.google.com</code> and pick or create a project (e.g. <code>raaspal-ops</code>).
          </li>
          <li>
            <b>APIs &amp; Services → Library</b> → search <b>Google Sheets API</b> → <b>Enable</b>.
          </li>
          <li>
            <b>IAM &amp; Admin → Service Accounts → Create service account</b>. Name it{' '}
            <code>raaspal-sheets-reader</code>. Skip the role and user steps — it needs no project permissions.
          </li>
          <li>
            Open the new account → <b>Keys → Add key → Create new key → JSON</b>. A <code>.json</code> file downloads.
          </li>
          <li>
            Note the account&apos;s email on its page (<code>…@….iam.gserviceaccount.com</code>) — the sheet is shared
            with that address.
          </li>
        </ol>
        <p className="text-amber-800 dark:text-amber-300">
          If Google says key creation is disabled, your organisation blocks it by policy; a Google Workspace admin has
          to allow it for this project.
        </p>
      </Step>

      <Step
        n={2}
        title="Give the key to the server"
        who="Whoever runs the backend — never paste it into chat, git or this page"
      >
        <p>
          <b>On a laptop:</b> keep the file outside the code folder (e.g. <code>~/.config/raaspal/sheets-key.json</code>
          ) and add one line to <code>application-local.properties</code>:
        </p>
        <p>
          <code>app.googlesheet.credentials=/Users/you/.config/raaspal/sheets-key.json</code>
        </p>
        <p>
          <b>On the server (Lightsail):</b> add <code>GOOGLE_SHEETS_CREDENTIALS</code> to <code>api.env</code> with the
          file base64-encoded (<code>base64 -i sheets-key.json</code>), then redeploy (<code>deploy/deploy.sh</code>).
        </p>
        <p>Restart the backend either way. The pill at the top of the AOT tab then stops saying “no Google key on the server”.</p>
        <p>
          The key is a password for that account. If it ever leaks, delete it under <b>Keys</b> in Google Cloud and make
          a new one — the sheet&apos;s sharing does not change.
        </p>
      </Step>

      <Step
        n={3}
        title="Share the sheet with the system account"
        who="The sheet's owner, or anyone with edit rights on it"
      >
        <ol>
          <li>
            Open the AOT sheet → <b>Share</b> (top right).
          </li>
          <li>
            Paste this address:{' '}
            <span className="inline-flex items-center gap-2">
              <code>{share}</code>
              {settings.shareWith && <CopyButton text={settings.shareWith} />}
            </span>
          </li>
          <li>
            Set the role to <b>Viewer</b>, untick <b>Notify people</b>, press <b>Share</b> (and <b>Share anyway</b> if
            Google warns it is outside the organisation).
          </li>
        </ol>
        <p>
          If you only have view rights, the <b>Share</b> button will not let you add people — send the owner the
          two-page guide <code>Report/AOT-Google-Sheet-Access-Setup.pdf</code> (Thai and English) with the address
          above.
        </p>
      </Step>

      <Step n={4} title="Paste the link here, save, test" who="On the AOT tab, under Sheet link & columns">
        <ol>
          <li>
            In the sheet, copy the address bar. Open <b>Sheet link &amp; columns</b> on the AOT tab and paste it into <b>Google Sheet link</b>.
          </li>
          <li>
            Check the <b>Tab</b> name matches the tab at the bottom of the sheet (usually <code>Case</code>). Save.
          </li>
          <li>
            Press <b>Test connection</b>. It reads the sheet and writes nothing. You should see the row count and every
            column name, hidden ones included.
          </li>
        </ol>
        <p>
          The link stays saved until someone changes it or presses <b>Remove link</b>. To point at a different sheet,
          paste the new link and save — that is all. Cases copied from the old sheet stay in the database under the old
          sheet&apos;s id, but are no longer updated or listed here.
        </p>
      </Step>

      <Step n={5} title="Choose the id and closed columns" who="Sheet link & columns — agree the answers with the sheet's owner">
        <p>The system has to know two things the sheet does not say on its own:</p>
        <ul>
          <li>
            <b>Which column names each case, forever.</b> If there is none, ask the owner to add a <code>Case ID</code>{' '}
            column and never reuse a value. Until then, do not sort the sheet or delete rows.
          </li>
          <li>
            <b>How a closed case looks.</b> Either a status column plus the words that mean closed (e.g.{' '}
            <code>Closed, Done</code>), or a column with the date it closed. Without this, every case since 2023 would
            count as still open — so the sync refuses to run.
          </li>
        </ul>
        <p>Fill the fields, save, and Test connection again: the Open / Closed counts should look right.</p>
      </Step>

      <Step n={6} title="Turn the sync on" who="Sheet link & columns">
        <p>
          Tick <b>Keep this sheet in sync</b> and save. From then on the sheet is copied by itself — with the monday
          refresh every 15 minutes, and whenever someone opens the AOT tab (at most every 5 minutes); <b>Sync now</b>
          does it immediately. Each case becomes one row in RAASPAL&apos;s case table,
          beside the monday tickets, and the daily copy is what lets past days be reported later — the sheet itself
          keeps no history.
        </p>
      </Step>

      <Step n="!" title="When something goes wrong" who="What the messages mean">
        <ul>
          <li>
            <b>“The service account cannot open spreadsheet …”</b> — the sheet is not shared with the address in step 3,
            or was un-shared. Share it again.
          </li>
          <li>
            <b>“Spreadsheet … was not found”</b> — the link is wrong or the sheet was deleted. Paste the link again.
          </li>
          <li>
            <b>“… has no tab named …”</b> — the tab was renamed. Fix the Tab field (capitals matter).
          </li>
          <li>
            <b>“No Google service-account key configured”</b> — step 2 is not done on this server, or it was not
            restarted afterwards.
          </li>
          <li>
            <b>“These ids are on more than one row”</b> — two cases share an id. Fix them in the sheet; nothing is
            synced until they are unique.
          </li>
          <li>
            <b>“The AOT sheet has no column named …”</b> — a column chosen in Sheet link &amp; columns was renamed on the sheet. Choose it
            again; nothing was synced.
          </li>
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
        aria-label="How to set up the Google Sheet"
        title="How to set up the Google Sheet"
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
                    Setting up the AOT Google Sheet
                  </h2>
                  <p className="text-xs text-[var(--app-muted)]">
                    How the link works, the Google account and key, sharing, columns, and what each error means.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close"
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
  settings: AotSheetSettings | undefined,
  cases: AotSheetOpenCases | undefined,
  refresh?: { syncing: boolean; outcome?: AotSheetRefreshOutcome },
): SheetState {
  if (!settings) return { tone: 'off', label: 'Google Sheet', detail: 'checking…' };
  if (refresh?.syncing) return { tone: 'busy', label: 'Google Sheet', detail: 'syncing…' };
  if (refresh?.outcome?.failed) return { tone: 'bad', label: 'Google Sheet', detail: 'last sync failed' };
  if (!settings.credentialsConfigured)
    return { tone: 'off', label: 'Google Sheet', detail: 'no Google key on the server' };
  if (!settings.spreadsheetId) return { tone: 'off', label: 'Google Sheet', detail: 'not linked' };
  if (cases?.lastSyncedAt) {
    const at = new Date(cases.lastSyncedAt).toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Bangkok',
    });
    return {
      tone: settings.syncEnabled ? 'ok' : 'warn',
      label: 'Google Sheet connected',
      detail: settings.syncEnabled ? `synced ${at}` : `last synced ${at} · daily sync off`,
    };
  }
  return { tone: 'warn', label: 'Google Sheet linked', detail: 'not synced yet' };
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
  const state = sheetState(settings.data, linked ? cases.data : undefined, {
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
          ? `The last sync did not run: ${refresh.data.reason}`
          : "Open the Google Sheet's link settings"
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
        The sheet&apos;s cases are listed for today only: the sheet keeps no history, so a past day is not available
        from it. The monday AOTGA sheet above covers past days.
      </p>
    );
  }
  if (query.isPending) {
    return (
      <div className="flex items-center gap-2 text-sm text-[var(--app-muted)]">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading the sheet&apos;s cases…
      </div>
    );
  }
  if (query.isError) return <ErrorBox error={query.error} />;

  const data: AotSheetOpenCases = query.data;
  if (!data.linked) return null;
  if (!data.lastSyncedAt) {
    return (
      <p className="rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] p-3 text-sm text-[var(--app-muted)]">
        Linked, but not synced yet: its cases appear here after the first sync. Turn on <b>Keep this sheet in sync</b>{' '}
        under Sheet link &amp; columns and it syncs by itself (or press{' '}
        <b>Sync now</b>).
      </p>
    );
  }

  const th = 'px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-[var(--app-muted)]';
  const td = 'px-3 py-2.5 align-top text-[var(--app-text)]';
  return (
    <div className="space-y-2">
      <p className="text-sm text-[var(--app-muted)]">
        <span className="text-2xl font-semibold text-[var(--app-text)]">{data.cases.length}</span> open case
        {data.cases.length === 1 ? '' : 's'} on the sheet · last synced{' '}
        {new Date(data.lastSyncedAt).toLocaleString('en-GB', { timeZone: 'Asia/Bangkok' })}
      </p>
      {data.cases.length > 0 && (
        <div className="overflow-x-auto rounded-lg ring-1 ring-inset ring-[var(--app-border)]">
          <table className="w-full min-w-[60rem] text-sm">
            <thead className="border-b border-[var(--app-border)]">
              <tr>
                <th className={th}>Case</th>
                <th className={th}>Location</th>
                <th className={th}>Robot</th>
                <th className={th}>S/N</th>
                <th className={th}>Problem</th>
                <th className={th}>Spare part</th>
                <th className={th}>Repair by</th>
                <th className={th}>Open date</th>
                <th className={`${th} text-right`}>Days</th>
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
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }
  if (query.isError || !settings) return <ErrorBox error={query.error} />;

  const state = sheetState(settings, settings.spreadsheetId ? cases.data : undefined, {
    syncing: refresh.isFetching,
    outcome: refresh.data,
  });

  const tiles = (
    <>
      <div className="grid gap-2 sm:grid-cols-3">
        <StatusItem
          ok={settings.credentialsConfigured}
          label={settings.credentialsConfigured ? 'Google key: configured' : 'Google key: missing'}
          detail={
            settings.credentialsConfigured ? 'The server can sign in to Google.' : 'Press ? at the top right of this card: step 2.'
          }
        />
        <StatusItem
          ok={!!settings.spreadsheetId}
          label={settings.spreadsheetId ? 'Sheet linked' : 'No sheet linked'}
          detail={
            settings.updatedAt
              ? `Saved ${new Date(settings.updatedAt).toLocaleString('en-GB', { timeZone: 'Asia/Bangkok' })}${settings.updatedBy ? ` by ${settings.updatedBy}` : ''}`
              : settings.spreadsheetId
                ? "From the server's config file"
                : 'Paste the link below.'
          }
        />
        <StatusItem
          ok={settings.syncEnabled}
          label={settings.syncEnabled ? 'Daily sync on' : 'Daily sync off'}
          detail={
            settings.syncEnabled
              ? 'Every 15 minutes, and when the AOT tab opens.'
              : settings.notReadyForSync.length > 0
                ? `Still needed: ${settings.notReadyForSync.length} setting(s).`
                : 'Ready to turn on.'
          }
        />
      </div>

      {settings.credentialsConfigured && settings.shareWith && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--app-brand)] bg-[var(--app-brand-soft)] p-3">
          <KeyRound className="h-4 w-4 text-[var(--app-brand-dark)]" />
          <span className="text-sm text-[var(--app-text)]">
            Share the sheet with <code className="font-mono text-xs">{settings.shareWith}</code> as a Viewer.
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
            <span className="block text-sm font-semibold text-[var(--app-text)]">Sheet link &amp; columns</span>
            <span className="block text-xs text-[var(--app-muted)]">
              {settings.spreadsheetId
                ? `Tab “${settings.tab}” · case id ${settings.rowIdHeader ? `“${settings.rowIdHeader}”` : 'not chosen'} · ${state.detail}`
                : 'Paste the sheet’s link to connect it.'}
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
