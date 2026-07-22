/**
 * UploadClient.tsx
 * Client component — handles drag-and-drop + click-to-upload survey file.
 *
 * Flow:
 *   1. User drops / selects file
 *   2. POST /api/v1/files/upload       → fileId
 *   3. POST /api/v1/requirements/extract-from-file/{fileId}  → requirementId
 *   4. Navigate to /recommendation?reqId=...
 */

'use client';

import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { fileApi, requirementApi } from '@/lib/api';
import type { RobotType } from '@/types/api';
import { AppSidebar } from '@/components/AppSidebar';
import { AppTopBar } from '@/components/AppTopBar';
import { FlowStepper } from '@/components/FlowStepper';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Loader2,
  UploadCloud,
  X,
} from 'lucide-react';
import { Link } from '@/i18n/navigation';

const ROBOT_TYPE_MAP: Record<string, RobotType> = {
  cleaning: 'CLEANING',
  delivery: 'DELIVERY',
  mowing: 'MOWING',
};

const ACCEPT_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'image/png',
  'image/jpeg',
];

function FileIcon({ type }: { type: string }) {
  if (type.startsWith('image/')) return <ImageIcon className="h-5 w-5 text-blue-500" />;
  if (type.includes('sheet') || type.includes('excel'))
    return <FileSpreadsheet className="h-5 w-5 text-green-600" />;
  return <FileText className="h-5 w-5 text-red-500" />;
}

interface UploadClientProps {
  locale: string;
  solutionType: string;
  meta: { title: string; description: string };
}

type Stage = 'idle' | 'uploading' | 'extracting' | 'done' | 'error';

export function UploadClient({ locale, solutionType, meta }: UploadClientProps) {
  const router = useRouter();
  const t = useTranslations('generateSolution.upload');
  const [solutionName, setSolutionName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [stage, setStage] = useState<Stage>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const robotType: RobotType = ROBOT_TYPE_MAP[solutionType] ?? 'CLEANING';

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);
    const dropped = event.dataTransfer.files[0];
    if (dropped && ACCEPT_TYPES.includes(dropped.type)) {
      setFile(dropped);
      setErrorMsg(null);
    } else {
      setErrorMsg(t('unsupportedFile'));
    }
  }, []);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    if (selected) {
      setFile(selected);
      setErrorMsg(null);
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!file) return;
    if (!solutionName.trim()) {
      setErrorMsg(t('solutionNameRequired'));
      return;
    }
    setStage('uploading');
    setErrorMsg(null);

    try {
      // Step 1: Upload file
      const uploadRes = await fileApi.upload(file);
      if (!uploadRes.data.success) {
        throw new Error(uploadRes.data.message ?? 'File upload failed');
      }
      const { id: fileId } = uploadRes.data.data;

      // Step 2: Extract requirements from file
      setStage('extracting');
      const extractRes = await requirementApi.extractFromFile(fileId, robotType);
      if (!extractRes.data.success) {
        throw new Error(extractRes.data.message ?? 'Requirement extraction failed');
      }
      const { id: requirementId } = extractRes.data.data;

      setStage('done');

      // Step 3: Navigate to recommendation page
      setTimeout(() => {
        const name = encodeURIComponent(solutionName.trim());
        router.push(
          `/generate-solution/${solutionType}/recommendation?reqId=${requirementId}&solutionName=${name}`,
          { locale } as Parameters<typeof router.push>[1],
        );
      }, 800);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        (err as Error)?.message ??
        'Something went wrong';
      setErrorMsg(msg);
      setStage('error');
    }
  }, [file, solutionName, robotType, solutionType, locale, router, t]);

  const stageLabel: Record<Stage, string> = {
    idle: t('generate'),
    uploading: t('uploading'),
    extracting: t('extracting'),
    done: t('done'),
    error: t('retry'),
  };

  return (
    <main className="min-h-dvh bg-[var(--app-bg)] text-[var(--app-text)] transition-colors">
      <div className="flex min-h-dvh">
        <AppSidebar />

        <section className="flex min-w-0 flex-1 flex-col">
          <AppTopBar
            eyebrow={t('eyebrow')}
            searchPlaceholder="Search customers, sites, robot criteria"
            title={meta.title}
          />

          <div className="mx-auto w-full max-w-2xl space-y-6 p-4 sm:p-6">
            {/* Back link */}
            <Link
              className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--app-muted)] hover:text-[var(--app-brand-dark)]"
              href={`/generate-solution/${solutionType}`}
            >
              <ArrowLeft className="h-4 w-4" />
              {t('backToTypes')}
            </Link>

            {/* Pipeline position */}
            <FlowStepper current="upload" />

            {/* Header */}
            <div className="bg-aurora animate-aurora relative overflow-hidden rounded-2xl p-6 text-white shadow-lg shadow-[var(--app-brand-glow)]">
              <p className="text-sm font-semibold uppercase tracking-wider text-cyan-100">{t('step')}</p>
              <h2 className="mt-2 text-2xl font-bold">{meta.title}</h2>
              <p className="mt-2 max-w-lg text-sm leading-6 text-white/75">{meta.description}</p>
            </div>

            {/* Solution name */}
            <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-5">
              <label
                className="mb-2 block text-sm font-semibold text-[var(--app-text)]"
                htmlFor="solution-name"
              >
                {t('solutionNameLabel')}
                <span className="ml-1 text-red-500">*</span>
              </label>
              <input
                autoComplete="off"
                className="w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] px-4 py-2.5 text-sm text-[var(--app-text)] placeholder:text-[var(--app-muted)] focus:border-[var(--app-brand)] focus:outline-none focus:ring-2 focus:ring-[var(--app-brand)]/20"
                disabled={stage === 'uploading' || stage === 'extracting' || stage === 'done'}
                id="solution-name"
                maxLength={255}
                onChange={(e) => setSolutionName(e.target.value)}
                placeholder={t('solutionNamePlaceholder')}
                type="text"
                value={solutionName}
              />
            </div>

            {/* Drop zone */}
            <div
              className={`relative cursor-pointer rounded-xl border-2 border-dashed transition ${
                dragOver
                  ? 'border-[var(--app-brand)] bg-[var(--app-brand-soft)]'
                  : 'border-[var(--app-border)] bg-[var(--app-panel)] hover:border-[var(--app-brand)]'
              }`}
              onClick={() => document.getElementById('file-input')?.click()}
              onDragLeave={() => setDragOver(false)}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDrop={handleDrop}
            >
              <input
                accept=".pdf,.xlsx,.xls,.png,.jpg,.jpeg"
                className="sr-only"
                id="file-input"
                onChange={handleFileChange}
                type="file"
              />

              <div className="flex flex-col items-center gap-4 p-10">
                <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--app-brand-soft)] text-[var(--app-brand-dark)]">
                  <UploadCloud className="h-8 w-8" />
                </span>
                <div className="text-center">
                  <p className="font-semibold text-[var(--app-text)]">{t('dropFileBrowse')}</p>
                  <p className="mt-1 text-sm text-[var(--app-muted)]">{t('fileTypes')}</p>
                </div>
              </div>
            </div>

            {/* Selected file */}
            {file && (
              <div className="flex items-center gap-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] px-4 py-3">
                <FileIcon type={file.type} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[var(--app-text)]">{file.name}</p>
                  <p className="text-xs text-[var(--app-muted)]">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                {stage === 'done' && <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />}
                {stage === 'idle' || stage === 'error' ? (
                  <button
                    aria-label={t('removeFile')}
                    className="rounded-lg p-1 text-[var(--app-muted)] hover:bg-[var(--app-faint)] hover:text-[var(--app-text)]"
                    onClick={(e) => { e.stopPropagation(); setFile(null); setErrorMsg(null); setStage('idle'); }}
                    type="button"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            )}

            {/* Progress indicator */}
            {(stage === 'uploading' || stage === 'extracting') && (
              <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-4">
                <div className="flex items-center gap-3 text-sm">
                  <Loader2 className="h-5 w-5 animate-spin text-[var(--app-brand)]" />
                  <span className="font-semibold text-[var(--app-text)]">
                    {stage === 'uploading' ? t('statusUploading') : t('statusExtracting')}
                  </span>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--app-border)]">
                  <div
                    className="h-full rounded-full bg-[var(--app-brand)] transition-all duration-500"
                    style={{ width: stage === 'uploading' ? '40%' : '80%' }}
                  />
                </div>
              </div>
            )}

            {/* Error */}
            {errorMsg && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
                {errorMsg}
              </div>
            )}

            {/* Submit */}
            <Button
              className="w-full bg-[var(--app-brand)] font-semibold text-white hover:bg-[var(--app-brand-dark)] disabled:opacity-50"
              disabled={!file || !solutionName.trim() || stage === 'uploading' || stage === 'extracting' || stage === 'done'}
              onClick={handleSubmit}
              size="lg"
              type="button"
            >
              {stage === 'uploading' || stage === 'extracting' || stage === 'done' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {stageLabel[stage]}
                </>
              ) : (
                stageLabel[stage]
              )}
            </Button>

            {/* Disclaimer */}
            <p className="text-center text-xs text-[var(--app-muted)]">
              {t('disclaimer')}
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
