'use client';

/**
 * Uploading the CSAT survey workbooks, and the history of every upload.
 *
 * CSAT is the one KPI with no monday source: the RE team tallies the post-job
 * phone survey into four workbooks by hand and replaces them monthly. Those used
 * to live in an S3 bucket, which meant credentials to change a number. Now the
 * file is dropped here and stored with the figures computed from it.
 *
 * Every upload is kept. The newest per survey is the one CSAT is computed from
 * — marked "current" — and the rest are the record of what the numbers used to
 * be built from, and who changed them. Deleting is how a wrong upload is undone,
 * including deleting the current one: "current" is the most recent row rather
 * than a stored flag, so the previous file simply takes over again.
 */
import { useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Clock, Download, Trash2, Upload } from 'lucide-react';
import { kpiApi } from '@/lib/api';
import type { CsatWorkbookHistoryEntry, CsatWorkbookUploadResult } from '@/lib/kpi/api-types';
import { dateLocale } from '@/lib/kpi/period';

function errorMessage(error: unknown, fallback: string): string {
  const message = (error as { response?: { data?: { message?: string } } } | null)?.response?.data?.message;
  if (message) return message;
  return error instanceof Error ? error.message : fallback;
}

/** KB below a megabyte, MB above — a workbook is never big enough to need more. */
function fileSize(bytes: number): string {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function CsatWorkbookManager() {
  const t = useTranslations('kpi.csat.workbooks');
  const locale = useLocale();
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<CsatWorkbookUploadResult | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  const dateFmt = new Intl.DateTimeFormat(dateLocale(locale), {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const history = useQuery({
    queryKey: ['kpi', 'csat-workbooks'],
    queryFn: async () => (await kpiApi.csatWorkbooks()).data.data,
    enabled: open,
  });

  /** Every CSAT figure is derived from these files, so both refresh together. */
  const refreshEverything = async () => {
    await queryClient.invalidateQueries({ queryKey: ['kpi', 'csat'] });
    await queryClient.invalidateQueries({ queryKey: ['kpi', 'csat-workbooks'] });
  };

  const upload = useMutation({
    mutationFn: async (file: File) => (await kpiApi.uploadCsatWorkbook(file)).data.data,
    onSuccess: async (data) => {
      setResult(data);
      setOpen(true);
      await refreshEverything();
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => (await kpiApi.deleteCsatWorkbook(id)).data.data,
    onSuccess: async () => {
      setConfirming(null);
      await refreshEverything();
    },
  });

  const download = async (entry: CsatWorkbookHistoryEntry) => {
    const blob = (await kpiApi.downloadCsatWorkbook(entry.id)).data;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = entry.fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  const pick = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Reset first: picking the same file twice in a row fires no change event
    // otherwise, and a failed upload is exactly when you retry the same file.
    event.target.value = '';
    if (file) {
      setResult(null);
      upload.mutate(file);
    }
  };

  return (
    <div className="mt-3 border-t border-[var(--app-border)] pt-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          accept=".xlsx"
          className="hidden"
          onChange={pick}
          ref={fileInput}
          type="file"
        />
        <button
          className="flex items-center gap-1.5 rounded-md border border-[var(--app-border)] px-2 py-1 text-[10px] font-medium text-[var(--app-muted)] transition hover:bg-[var(--app-panel-soft)] hover:text-[var(--app-text)] disabled:opacity-50"
          disabled={upload.isPending}
          onClick={() => fileInput.current?.click()}
          type="button"
        >
          <Upload className="h-3 w-3" />
          {upload.isPending ? t('uploading') : t('upload')}
        </button>
        <button
          aria-expanded={open}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-medium text-[var(--app-muted)] transition hover:text-[var(--app-text)]"
          onClick={() => setOpen((value) => !value)}
          type="button"
        >
          <Clock className="h-3 w-3" />
          {open ? t('hideHistory') : t('history')}
        </button>
      </div>

      {upload.isError && (
        <p className="mt-2 text-[10px] leading-snug text-[#DC2F2F]">
          {errorMessage(upload.error, t('uploadFailed'))}
        </p>
      )}

      {result && (
        <div className="mt-2">
          <p className="text-[10px] leading-snug text-[#2FA36B]">
            {result.duplicate
              ? t('duplicate', { file: result.fileName })
              : t('uploaded', { file: result.fileName, survey: t(`survey.${result.stream}`) })}
          </p>
          {/* A workbook can store fine and still have a sheet that would not read.
              Saying so now beats it being noticed as a gap in the chart later. */}
          {result.warnings.length > 0 && (
            <ul className="mt-1 space-y-0.5">
              {result.warnings.map((w) => (
                <li className="flex gap-1 text-[10px] leading-snug text-[#B4690E]" key={w}>
                  <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {open && (
        <div className="mt-2">
          {history.isPending && <p className="text-[10px] text-[var(--app-muted)]">{t('loading')}</p>}
          {history.isError && (
            <p className="text-[10px] text-[#DC2F2F]">{errorMessage(history.error, t('historyFailed'))}</p>
          )}
          {history.data?.length === 0 && (
            <p className="text-[10px] text-[var(--app-muted)]">{t('empty')}</p>
          )}

          <ul className="space-y-1.5">
            {history.data?.map((entry) => (
              <li
                className="rounded-lg border border-[var(--app-border)] bg-[var(--app-panel-alt)] p-2"
                key={entry.id}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold leading-tight text-[var(--app-text)]">
                      {t(`survey.${entry.streamLabel}`)}
                      {entry.current && (
                        <span className="rounded bg-[var(--app-brand-soft)] px-1 py-0.5 text-[9px] font-semibold uppercase text-[var(--app-brand-dark)]">
                          {t('current')}
                        </span>
                      )}
                    </p>
                    <p className="truncate text-[10px] leading-tight text-[var(--app-muted)]" title={entry.fileName}>
                      {entry.fileName} · {fileSize(entry.sizeBytes)}
                    </p>
                    <p className="text-[10px] leading-tight text-[var(--app-muted)]">
                      {dateFmt.format(new Date(entry.uploadedAt))}
                      {' · '}
                      {entry.uploadedByName ?? t('unknownUploader')}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-0.5">
                    <button
                      aria-label={t('download')}
                      className="rounded p-1 text-[var(--app-muted)] transition hover:bg-[var(--app-panel)] hover:text-[var(--app-text)]"
                      onClick={() => download(entry)}
                      title={t('download')}
                      type="button"
                    >
                      <Download className="h-3 w-3" />
                    </button>
                    <button
                      aria-label={t('delete')}
                      className="rounded p-1 text-[var(--app-muted)] transition hover:bg-[var(--app-panel)] hover:text-[#DC2F2F]"
                      onClick={() => setConfirming(confirming === entry.id ? null : entry.id)}
                      title={t('delete')}
                      type="button"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                {confirming === entry.id && (
                  <div className="mt-1.5 border-t border-[var(--app-border)] pt-1.5">
                    <p className="text-[10px] leading-snug text-[var(--app-text)]">
                      {entry.current ? t('confirmCurrent') : t('confirm')}
                    </p>
                    <div className="mt-1 flex gap-1.5">
                      <button
                        className="rounded border border-[#DC2F2F] px-1.5 py-0.5 text-[10px] font-medium text-[#DC2F2F] transition hover:bg-[#DC2F2F] hover:text-white disabled:opacity-50"
                        disabled={remove.isPending}
                        onClick={() => remove.mutate(entry.id)}
                        type="button"
                      >
                        {remove.isPending ? t('deleting') : t('confirmDelete')}
                      </button>
                      <button
                        className="rounded border border-[var(--app-border)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--app-muted)] transition hover:text-[var(--app-text)]"
                        onClick={() => setConfirming(null)}
                        type="button"
                      >
                        {t('cancel')}
                      </button>
                    </div>
                    {remove.isError && (
                      <p className="mt-1 text-[10px] text-[#DC2F2F]">
                        {errorMessage(remove.error, t('deleteFailed'))}
                      </p>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
