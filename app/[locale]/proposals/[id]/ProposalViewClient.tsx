'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardCopy,
  Download,
  FileText,
  Loader2,
  Presentation,
  Printer,
} from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { proposalApi } from '@/lib/api';
import { exportProposalToPdf } from '@/lib/pdf-export';
import { AppSidebar } from '@/components/AppSidebar';
import { AppTopBar } from '@/components/AppTopBar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ProposalViewClientProps {
  id: string;
}

export function ProposalViewClient({ id }: ProposalViewClientProps) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadingPptx, setDownloadingPptx] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['proposal', id],
    queryFn: () => proposalApi.getById(id).then((r) => r.data.data),
  });

  const proposal = data ?? null;

  async function handleCopy() {
    if (!proposal?.proposalContent) return;
    await navigator.clipboard.writeText(proposal.proposalContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleDownloadPdf() {
    if (!proposal) return;
    setDownloading(true);
    try {
      await exportProposalToPdf(proposal);
    } finally {
      setDownloading(false);
    }
  }

  async function handleDownloadPptx() {
    if (!proposal) return;
    setDownloadingPptx(true);
    try {
      const res = await proposalApi.exportPptx(proposal.id);
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `proposal-${proposal.title ?? proposal.id}.pptx`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloadingPptx(false);
    }
  }

  return (
    <main className="min-h-dvh bg-[var(--app-bg)] text-[var(--app-text)] transition-colors">
      <div className="flex min-h-dvh">
        <AppSidebar />

        <section className="flex min-w-0 flex-1 flex-col">
          <AppTopBar
            eyebrow="Proposals"
            searchPlaceholder="Search proposals…"
            title="View Proposal"
          />

          <div className="mx-auto w-full max-w-3xl space-y-6 p-4 sm:p-6">

            {/* Back */}
            <Link
              className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--app-muted)] hover:text-[var(--app-brand-dark)]"
              href="/solutions?tab=proposals"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to proposals
            </Link>

            {/* Header banner — Bold & Premium (customer-facing) */}
            <div className="bg-[var(--app-hero)] relative overflow-hidden rounded-3xl p-6 text-white shadow-sm sm:p-8">
              <div className="relative z-10">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-blue-200 ring-1 ring-white/20 backdrop-blur-sm">
                  <FileText className="h-3.5 w-3.5" />
                  Proposal
                </span>
                <h2 className="mt-3 text-2xl font-bold sm:text-3xl">Customer Proposal</h2>
                <p className="mt-2 max-w-lg text-sm leading-6 text-white/75">
                  AI-generated proposal. Review and verify with the RAASPAL team before presenting to the customer.
                </p>
              </div>
            </div>

            {/* Loading */}
            {isLoading && (
              <div className="flex flex-col items-center gap-4 py-16">
                <Loader2 className="h-10 w-10 animate-spin text-[var(--app-brand)]" />
                <p className="font-semibold text-[var(--app-text)]">Loading proposal…</p>
              </div>
            )}

            {/* Error */}
            {isError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
                Failed to load proposal. It may have been deleted or the ID is invalid.
              </div>
            )}

            {/* Content */}
            {proposal && (
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
                        Generated {new Date(proposal.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
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
                    onClick={handleDownloadPdf}
                    type="button"
                  >
                    {downloading ? (
                      <><Loader2 className="h-4 w-4 animate-spin" />Preparing PDF…</>
                    ) : (
                      <><Download className="h-4 w-4" />Download PDF</>
                    )}
                  </Button>
                  <Button
                    className="gap-2 border-[var(--app-border)] bg-[var(--app-panel)] text-[var(--app-text)] hover:bg-[var(--app-faint)]"
                    disabled={downloadingPptx}
                    onClick={handleDownloadPptx}
                    type="button"
                    variant="outline"
                  >
                    {downloadingPptx ? (
                      <><Loader2 className="h-4 w-4 animate-spin" />Preparing PPTX…</>
                    ) : (
                      <><Presentation className="h-4 w-4" />Download PowerPoint</>
                    )}
                  </Button>
                  <Button
                    className="gap-2 border-[var(--app-border)] bg-[var(--app-panel)] text-[var(--app-text)] hover:bg-[var(--app-faint)]"
                    onClick={handleCopy}
                    type="button"
                    variant="outline"
                  >
                    {copied ? (
                      <><CheckCircle2 className="h-4 w-4 text-emerald-500" />Copied!</>
                    ) : (
                      <><ClipboardCopy className="h-4 w-4" />Copy text</>
                    )}
                  </Button>
                  <Button
                    className="gap-2 border-[var(--app-border)] bg-[var(--app-panel)] text-[var(--app-text)] hover:bg-[var(--app-faint)]"
                    onClick={() => window.print()}
                    type="button"
                    variant="outline"
                  >
                    <Printer className="h-4 w-4" />
                    Print
                  </Button>
                </div>

                {/* Proposal body — document surface */}
                <div className="relative overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-panel)] p-6 shadow-sm sm:p-8">
                  <div className="absolute inset-x-0 top-0 h-1 bg-[var(--app-brand)]" />
                  {proposal.proposalContent ? (
                    <pre className="whitespace-pre-wrap font-sans text-sm leading-7 text-[var(--app-text)]">
                      {proposal.proposalContent}
                    </pre>
                  ) : (
                    <p className="text-sm italic text-[var(--app-muted)]">No content available.</p>
                  )}
                </div>

                {/* Disclaimer */}
                <div className="rounded-xl border border-amber-200/60 bg-amber-50/50 px-5 py-4 text-sm text-amber-700 dark:border-amber-900/30 dark:bg-amber-950/20 dark:text-amber-400">
                  <p className="font-semibold">⚠ RAASPAL Verification Required</p>
                  <p className="mt-1">
                    This proposal was AI-generated from customer requirements and the robot catalog.
                    Final specifications, pricing, and site suitability must be confirmed by the RAASPAL
                    team and an on-site survey before presenting to the customer.
                  </p>
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
