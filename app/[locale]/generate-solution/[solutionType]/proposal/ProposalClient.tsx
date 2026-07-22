/**
 * ProposalClient.tsx
 * Client component — generates the proposal and displays the result.
 *
 * Flow:
 *   1. Read recId + robotId from URL search params
 *   2. POST /api/v1/proposals/generate { recommendationId, selectedRobotId }
 *   3. Display proposal content
 *   4. Copy / print actions
 */

'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { proposalApi } from '@/lib/api';
import type { GeneratedProposalResponse } from '@/types/api';
import { AppSidebar } from '@/components/AppSidebar';
import { AppTopBar } from '@/components/AppTopBar';
import { FlowStepper } from '@/components/FlowStepper';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardCopy,
  FileText,
  Loader2,
  Presentation,
  Printer,
} from 'lucide-react';
import { Link } from '@/i18n/navigation';

interface ProposalClientProps {
  locale: string;
  solutionType: string;
}

function ProposalInner({ solutionType }: Pick<ProposalClientProps, 'solutionType'>) {
  const searchParams = useSearchParams();
  const t = useTranslations('generateSolution.proposal');
  const itemId = searchParams.get('itemId');
  const recId = searchParams.get('recId');

  const [proposal, setProposal] = useState<GeneratedProposalResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!itemId) {
      setError(t('errorMissingData'));
      setLoading(false);
      return;
    }

    proposalApi
      .generate({ recommendationItemId: itemId })
      .then((res) => {
        if (res.data.success) {
          setProposal(res.data.data);
        } else {
          setError(res.data.message ?? t('failedGenerate'));
        }
      })
      .catch((err: unknown) => {
        setError(
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          t('errorGeneric'),
        );
      })
      .finally(() => setLoading(false));
  }, [itemId]);

  async function handleCopy() {
    if (!proposal?.proposalContent) return;
    await navigator.clipboard.writeText(proposal.proposalContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleDownloadPptx() {
    if (!proposal) return;
    setDownloading(true);
    try {
      const res = await proposalApi.exportPptx(proposal.id);
      const url = URL.createObjectURL(new Blob([res.data as BlobPart], {
        type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `RAASPAL_Proposal_${(proposal.title ?? 'proposal').replace(/\s+/g, '_')}.pptx`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <main className="min-h-dvh bg-[var(--app-bg)] text-[var(--app-text)] transition-colors">
      <div className="flex min-h-dvh">
        <AppSidebar />

        <section className="flex min-w-0 flex-1 flex-col">
          <AppTopBar
            eyebrow={t('eyebrow')}
            searchPlaceholder="Search customers, sites, robot criteria"
            title={t('title')}
          />

          <div className="mx-auto w-full max-w-3xl space-y-6 p-4 sm:p-6">
            {/* Back link */}
            <Link
              className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--app-muted)] hover:text-[var(--app-brand-dark)]"
              href={`/generate-solution/${solutionType}/recommendation${recId ? `?recId=${recId}` : ''}`}
            >
              <ArrowLeft className="h-4 w-4" />
              {t('backToRecommendations')}
            </Link>

            {/* Pipeline position */}
            <FlowStepper current="proposal" />

            {/* Header */}
            <div className="bg-aurora animate-aurora relative overflow-hidden rounded-2xl p-6 text-white shadow-lg shadow-[var(--app-brand-glow)]">
              <p className="text-sm font-semibold uppercase tracking-wider text-cyan-100">{t('step')}</p>
              <h2 className="mt-2 text-2xl font-bold">{t('heading')}</h2>
              <p className="mt-2 max-w-lg text-sm leading-6 text-white/75">{t('description')}</p>
            </div>

            {/* Loading */}
            {loading && (
              <div className="flex flex-col items-center gap-4 py-16">
                <Loader2 className="h-10 w-10 animate-spin text-[var(--app-brand)]" />
                <p className="font-semibold text-[var(--app-text)]">{t('loading')}</p>
                <p className="text-sm text-[var(--app-muted)]">{t('loadingSub')}</p>
              </div>
            )}

            {/* Error */}
            {error && !loading && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
                {error}
              </div>
            )}

            {/* Proposal content */}
            {proposal && !loading && (
              <>
                {/* Meta */}
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--app-brand-soft)] text-[var(--app-brand-dark)]">
                      <FileText className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="font-semibold text-[var(--app-text)]">{proposal.title ?? 'Proposal'}</p>
                      <p className="text-xs text-[var(--app-muted)]">
                        Generated {new Date(proposal.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Badge
                    className={
                      proposal.status === 'FINAL'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-amber-100 text-amber-700'
                    }
                    variant="secondary"
                  >
                    {proposal.status}
                  </Badge>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-3">
                  <Button
                    className="gap-2 bg-[var(--app-brand)] text-white hover:bg-[var(--app-brand-dark)]"
                    disabled={downloading}
                    onClick={handleDownloadPptx}
                    type="button"
                  >
                    {downloading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t('preparingPptx')}
                      </>
                    ) : (
                      <>
                        <Presentation className="h-4 w-4" />
                        {t('downloadPptx')}
                      </>
                    )}
                  </Button>
                  <Button
                    className="gap-2 border-[var(--app-border)] bg-[var(--app-panel)] text-[var(--app-text)] hover:bg-[var(--app-faint)]"
                    onClick={handleCopy}
                    type="button"
                    variant="outline"
                  >
                    {copied ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        {t('copied')}
                      </>
                    ) : (
                      <>
                        <ClipboardCopy className="h-4 w-4" />
                        {t('copyText')}
                      </>
                    )}
                  </Button>
                  <Button
                    className="gap-2 border-[var(--app-border)] bg-[var(--app-panel)] text-[var(--app-text)] hover:bg-[var(--app-faint)]"
                    onClick={() => window.print()}
                    type="button"
                    variant="outline"
                  >
                    <Printer className="h-4 w-4" />
                    {t('print')}
                  </Button>
                </div>

                {/* Proposal body */}
                <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-6">
                  {proposal.proposalContent ? (
                    <pre className="whitespace-pre-wrap font-sans text-sm leading-7 text-[var(--app-text)]">
                      {proposal.proposalContent}
                    </pre>
                  ) : (
                    <p className="text-sm italic text-[var(--app-muted)]">
                      {t('noContent')}
                    </p>
                  )}
                </div>

                {/* Disclaimer */}
                <div className="rounded-xl border border-amber-200/60 bg-amber-50/50 px-5 py-4 text-sm text-amber-700 dark:border-amber-900/30 dark:bg-amber-950/20 dark:text-amber-400">
                  <p className="font-semibold">{t('verificationTitle')}</p>
                  <p className="mt-1">{t('verificationBody')}</p>
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

/** Outer wrapper provides a Suspense boundary for useSearchParams(). */
export function ProposalClient(props: ProposalClientProps) {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-dvh items-center justify-center bg-[var(--app-bg)]">
          <Loader2 className="h-10 w-10 animate-spin text-[var(--app-brand)]" />
        </main>
      }
    >
      <ProposalInner solutionType={props.solutionType} />
    </Suspense>
  );
}
