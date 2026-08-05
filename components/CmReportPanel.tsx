'use client';

/**
 * CmReportPanel — build one Corrective Maintenance report.
 *
 * Paste the Monday.com ticket, let the AI split it into fields, correct anything
 * it got wrong, attach the two signature photos, then save and print.
 *
 * The review step is deliberate: this document is signed and handed to a customer,
 * so nothing reaches the printed page that a person hasn't looked at. Extraction
 * only ever fills the form — the form is the source of truth for what gets saved.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Check,
  FileText,
  Loader2,
  Printer,
  Save,
  Sparkles,
  Trash2,
  Upload,
  Wrench,
} from 'lucide-react';
import { cmReportApi } from '@/lib/api';
import { fileToSignatureDataUrl } from '@/lib/signature-image';
import { todayIso } from '@/lib/thai-date';
import { CorrectiveMaintenanceReportView } from '@/components/report/CorrectiveMaintenanceReportView';
import type { CmReportRequest, CmReportResponse } from '@/types/api';

const inputClass =
  'h-10 w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-panel-alt)] px-3 text-sm text-[var(--app-text)] outline-none focus:border-[var(--app-brand)]';
const textareaClass =
  'w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-panel-alt)] px-3 py-2 text-sm leading-6 text-[var(--app-text)] outline-none focus:border-[var(--app-brand)]';

const EMPTY_FORM: CmReportRequest = {
  reportDate: '',
  ticketNo: '',
  customerName: '',
  technicianName: '',
  robotModel: '',
  serialNumber: '',
  causeDetail: '',
  inspectionResult: '',
  correctiveActions: '',
  testResult: '',
  sourceText: '',
  providerSignature: '',
  receiverSignature: '',
};

function errorMessage(e: unknown, fallback: string): string {
  const ax = e as { response?: { data?: { message?: string } }; code?: string; message?: string };
  if (ax?.response?.data?.message) return ax.response.data.message;
  if (ax?.code === 'ECONNABORTED' || !ax?.response) {
    return 'This is taking longer than expected — it may still be running on the server. Wait a moment, then try again.';
  }
  return ax?.message ?? fallback;
}

/** Maps a saved report back into the editable form shape. */
function toForm(r: CmReportResponse): CmReportRequest {
  return {
    reportDate: r.reportDate ?? '',
    ticketNo: r.ticketNo ?? '',
    customerName: r.customerName ?? '',
    technicianName: r.technicianName ?? '',
    robotModel: r.robotModel ?? '',
    serialNumber: r.serialNumber ?? '',
    causeDetail: r.causeDetail ?? '',
    inspectionResult: r.inspectionResult ?? '',
    correctiveActions: r.correctiveActions ?? '',
    testResult: r.testResult ?? '',
    sourceText: r.sourceText ?? '',
    providerSignature: r.providerSignature ?? '',
    receiverSignature: r.receiverSignature ?? '',
  };
}

/** One signature slot: upload, preview, remove. */
function SignatureField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (dataUrl: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      onChange(await fileToSignatureDataUrl(file));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read that image.');
    } finally {
      setBusy(false);
      // Clear the input so re-picking the same file fires onChange again.
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold text-[var(--app-muted)]">{label}</span>

      <div className="flex items-center gap-3 rounded-lg border border-dashed border-[var(--app-border)] bg-[var(--app-panel-alt)] p-2">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt={label} className="h-12 w-auto max-w-[160px] object-contain" />
        ) : (
          <span className="px-1 text-xs text-[var(--app-muted)]">
            No image — the report prints a blank box to sign on paper.
          </span>
        )}

        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--app-border)] px-2.5 text-xs font-semibold text-[var(--app-text)] transition hover:border-[var(--app-brand)] disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            {value ? 'Replace' : 'Upload'}
          </button>
          {value && (
            <button
              type="button"
              onClick={() => onChange('')}
              aria-label={`Remove ${label}`}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--app-border)] text-[var(--app-muted)] transition hover:border-red-300 hover:text-red-600"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

export function CmReportPanel({
  initialReport,
  onSaved,
}: {
  /** Present when reopening a saved report from the history tab. */
  initialReport?: CmReportResponse;
  onSaved?: (report: CmReportResponse) => void;
}) {
  const queryClient = useQueryClient();

  const [sourceText, setSourceText] = useState(initialReport?.sourceText ?? '');
  const [form, setForm] = useState<CmReportRequest>(
    initialReport ? toForm(initialReport) : { ...EMPTY_FORM, reportDate: todayIso() },
  );
  const [savedId, setSavedId] = useState<string | null>(initialReport?.id ?? null);
  const [formError, setFormError] = useState<string | null>(null);

  // Reopening a different report from history must reload the form rather than
  // leaving the previous one's edits on screen.
  useEffect(() => {
    if (!initialReport) return;
    setSourceText(initialReport.sourceText ?? '');
    setForm(toForm(initialReport));
    setSavedId(initialReport.id);
    setFormError(null);
  }, [initialReport]);

  const field = (key: keyof CmReportRequest, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const parseMutation = useMutation({
    mutationFn: () => cmReportApi.parse(sourceText).then((r) => r.data.data),
    onSuccess: (draft) => {
      if (!draft) return;
      // Only overwrite what the AI actually found — a null field must not wipe
      // something the operator already typed by hand.
      setForm((f) => ({
        ...f,
        reportDate: draft.reportDate || f.reportDate,
        ticketNo: draft.ticketNo || f.ticketNo,
        customerName: draft.customerName || f.customerName,
        technicianName: draft.technicianName || f.technicianName,
        robotModel: draft.robotModel || f.robotModel,
        serialNumber: draft.serialNumber || f.serialNumber,
        causeDetail: draft.causeDetail || f.causeDetail,
        inspectionResult: draft.inspectionResult || f.inspectionResult,
        correctiveActions: draft.correctiveActions?.length
          ? draft.correctiveActions.join('\n')
          : f.correctiveActions,
        testResult: draft.testResult || f.testResult,
        sourceText,
      }));
    },
  });

  const saveMutation = useMutation({
    mutationFn: (body: CmReportRequest) =>
      (savedId ? cmReportApi.update(savedId, body) : cmReportApi.create(body)).then(
        (r) => r.data.data,
      ),
    onSuccess: (saved) => {
      if (!saved) return;
      setSavedId(saved.id);
      queryClient.invalidateQueries({ queryKey: ['cm-reports'] });
      onSaved?.(saved);
    },
  });

  function submit() {
    setFormError(null);
    if (!form.customerName.trim()) {
      setFormError('Customer name is required.');
      return;
    }
    if (!form.reportDate) {
      setFormError('Report date is required.');
      return;
    }
    saveMutation.mutate({ ...form, sourceText });
  }

  /** The live preview reuses the response shape so it renders exactly what a reprint will. */
  const preview: CmReportResponse = useMemo(
    () => ({
      id: savedId ?? 'preview',
      reportDate: form.reportDate,
      ticketNo: form.ticketNo,
      customerName: form.customerName,
      technicianName: form.technicianName,
      robotModel: form.robotModel,
      serialNumber: form.serialNumber,
      causeDetail: form.causeDetail,
      inspectionResult: form.inspectionResult,
      correctiveActions: form.correctiveActions,
      testResult: form.testResult,
      sourceText: form.sourceText,
      providerSignature: form.providerSignature || null,
      receiverSignature: form.receiverSignature || null,
      createdAt: '',
      updatedAt: '',
    }),
    [form, savedId],
  );

  return (
    <div className="space-y-5">
      {/* Everything above the preview is app chrome — hidden when printing. */}
      <div className="space-y-5 print:hidden">
        {/* Topic header */}
        <div className="flex items-center gap-2.5 rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--app-brand-soft)] text-[var(--app-brand-dark)]">
            <Wrench className="h-4.5 w-4.5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-[var(--app-text)]">
              {savedId ? 'Edit corrective maintenance report' : 'New corrective maintenance report'}
            </p>
            <p className="text-xs text-[var(--app-muted)]">
              Paste the ticket, check the extracted fields, attach the signatures, then print.
            </p>
          </div>
        </div>

        {/* Step 1 — paste + extract */}
        <div className="space-y-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-3">
          <label className="flex flex-col gap-1.5 text-xs font-semibold text-[var(--app-muted)]">
            Ticket content from Monday
            <textarea
              rows={8}
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              placeholder={'วันที่ : 17 มิถุนายน 2569\nTicket No. : 12152391009\nชื่อบริษัทลูกค้า : ...'}
              className={`${textareaClass} font-normal`}
            />
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => parseMutation.mutate()}
              disabled={!sourceText.trim() || parseMutation.isPending}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-[var(--app-brand)] px-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {parseMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {parseMutation.isPending ? 'Extracting…' : 'Extract fields'}
            </button>
            {parseMutation.isSuccess && !parseMutation.isPending && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <Check className="h-3.5 w-3.5" />
                Fields filled — check them below
              </span>
            )}
          </div>

          {parseMutation.isError && (
            <p className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {errorMessage(parseMutation.error, 'Could not extract the fields. Fill them in below instead.')}
            </p>
          )}
        </div>

        {/* Step 2 — review + edit */}
        <div className="space-y-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-3">
          <p className="text-sm font-semibold text-[var(--app-text)]">Report fields</p>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--app-muted)]">
              วันที่ · Date
              <input
                type="date"
                value={form.reportDate}
                onChange={(e) => field('reportDate', e.target.value)}
                className={`${inputClass} font-normal`}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--app-muted)]">
              Ticket No.
              <input
                type="text"
                value={form.ticketNo}
                onChange={(e) => field('ticketNo', e.target.value)}
                className={`${inputClass} font-normal`}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--app-muted)]">
              ชื่อบริษัทลูกค้า · Customer
              <input
                type="text"
                value={form.customerName}
                onChange={(e) => field('customerName', e.target.value)}
                className={`${inputClass} font-normal`}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--app-muted)]">
              เจ้าหน้าที่ผู้เข้าดำเนินการ · Officer
              <input
                type="text"
                value={form.technicianName}
                onChange={(e) => field('technicianName', e.target.value)}
                className={`${inputClass} font-normal`}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--app-muted)]">
              รุ่นหุ่นยนต์ · Robot model
              <input
                type="text"
                value={form.robotModel}
                onChange={(e) => field('robotModel', e.target.value)}
                className={`${inputClass} font-normal`}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--app-muted)]">
              Serial Number
              <input
                type="text"
                value={form.serialNumber}
                onChange={(e) => field('serialNumber', e.target.value)}
                className={`${inputClass} font-normal`}
              />
            </label>
          </div>

          <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--app-muted)]">
            รายละเอียดของสาเหตุ · Reported problem
            <textarea
              rows={2}
              value={form.causeDetail}
              onChange={(e) => field('causeDetail', e.target.value)}
              className={`${textareaClass} font-normal`}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--app-muted)]">
            ผลการตรวจสอบ · Inspection result
            <textarea
              rows={2}
              value={form.inspectionResult}
              onChange={(e) => field('inspectionResult', e.target.value)}
              className={`${textareaClass} font-normal`}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--app-muted)]">
            การดำเนินการแก้ไข · Corrective actions
            <textarea
              rows={4}
              value={form.correctiveActions}
              onChange={(e) => field('correctiveActions', e.target.value)}
              className={`${textareaClass} font-normal`}
            />
            <span className="font-normal">One step per line — the report numbers them for you.</span>
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--app-muted)]">
            ผลการทดสอบ · Test result
            <textarea
              rows={2}
              value={form.testResult}
              onChange={(e) => field('testResult', e.target.value)}
              className={`${textareaClass} font-normal`}
            />
          </label>

          <div className="grid gap-3 pt-1 sm:grid-cols-2">
            <SignatureField
              label="ลงนามผู้ให้บริการ · Service provider signature"
              value={form.providerSignature}
              onChange={(v) => field('providerSignature', v)}
            />
            <SignatureField
              label="ลงนามผู้รับบริการ · Customer signature"
              value={form.receiverSignature}
              onChange={(v) => field('receiverSignature', v)}
            />
          </div>

          {formError && (
            <p className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {formError}
            </p>
          )}
          {saveMutation.isError && (
            <p className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {errorMessage(saveMutation.error, 'Could not save the report.')}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={submit}
              disabled={saveMutation.isPending}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-[var(--app-brand)] px-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {saveMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {savedId ? 'Save changes' : 'Save report'}
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--app-border)] px-3 text-sm font-semibold text-[var(--app-text)] transition hover:border-[var(--app-brand)]"
            >
              <Printer className="h-4 w-4" />
              Print / PDF
            </button>
            {saveMutation.isSuccess && !saveMutation.isPending && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <Check className="h-3.5 w-3.5" />
                Saved
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 px-1">
          <FileText className="h-3.5 w-3.5 text-[var(--app-muted)]" />
          <p className="text-xs text-[var(--app-muted)]">Preview — this is exactly what prints.</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--app-border)] shadow-sm print:rounded-none print:border-0 print:shadow-none">
        <CorrectiveMaintenanceReportView report={preview} />
      </div>
    </div>
  );
}
