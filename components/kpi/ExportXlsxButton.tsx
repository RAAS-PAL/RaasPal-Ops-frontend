'use client';

/**
 * Downloads the current period as a spreadsheet.
 *
 * These charts are HTML, so the only way to get one into a deck is a picture —
 * and a picture is no help to someone who has to correct a figure or recolour a
 * series on the slide. The .xlsx carries the numbers instead, one sheet per
 * chart, so Excel draws a real chart object that stays editable in PowerPoint.
 *
 * The request asks for a blob, which means an error arrives as one too: a 400
 * from the CSAT export ("set KPI_CSAT_FOLDER…") is JSON inside a Blob, so it is
 * read back out rather than shown as a bare status line.
 */
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Download, Loader2 } from 'lucide-react';
import { kpiApi } from '@/lib/api';
import type { Period } from '@/lib/kpi/period';

type Props = {
  /** Which export: the report's four KPIs, or CSAT's Top Box. */
  kind: 'report' | 'csat';
  period: Period;
};

/** The backend's own message, dug out of a blob error body. */
async function messageFrom(error: unknown, fallback: string): Promise<string> {
  const data = (error as { response?: { data?: unknown } } | null)?.response?.data;
  if (data instanceof Blob) {
    try {
      const parsed = JSON.parse(await data.text()) as { message?: string };
      if (parsed.message) return parsed.message;
    } catch {
      // Not JSON — a truncated file or a proxy error page. Fall through.
    }
  }
  return error instanceof Error ? error.message : fallback;
}

export function ExportXlsxButton({ kind, period }: Props) {
  const t = useTranslations('kpi');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const download = async () => {
    setBusy(true);
    setError(null);
    try {
      const response =
        kind === 'csat'
          ? await kpiApi.exportCsat(period.from, period.to)
          : await kpiApi.exportReport(period.from, period.to);

      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `re-kpi-${kind}_${period.from}_${period.to}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      // Safari can still be reading the blob when the click returns, so the URL
      // outlives the click by a moment rather than being revoked under it.
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (e) {
      setError(await messageFrom(e, t('export.failed')));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        className="flex items-center gap-1.5 rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)] px-3 py-2 text-xs font-semibold text-[var(--app-text)] transition hover:border-[var(--app-brand)] hover:text-[var(--app-brand-dark)] disabled:opacity-50"
        disabled={busy}
        onClick={download}
        title={t('export.hint')}
        type="button"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
        {busy ? t('export.busy') : t('export.label')}
      </button>
      {error && <p className="max-w-xs text-right text-[10px] leading-tight text-[#DC2F2F]">{error}</p>}
    </div>
  );
}
