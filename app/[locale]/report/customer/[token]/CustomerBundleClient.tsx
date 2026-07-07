'use client';

/**
 * CustomerBundleClient — renders a combined monthly report for all of a
 * customer's robots, stacked into one page.
 *
 * This is the page the monthly email links to. Token "example" shows the sample
 * layout; any other token fetches the real bundle from the public (no-auth)
 * endpoint. A "Download PDF" button calls window.print(), capturing every robot
 * report in a single PDF with page breaks between them.
 */
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Download, Loader2 } from 'lucide-react';
import { reportApi } from '@/lib/api';
import { MonthlyReportView } from '@/components/report/MonthlyReportView';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { sampleGausiumReport } from '@/lib/reports/gausium';
import type { MonthlyPerformanceReport } from '@/lib/reports/types';

const EXAMPLE_BUNDLE = {
  customerName: 'Sample Customer Co., Ltd.',
  periodLabel: sampleGausiumReport.periodLabel,
  robots: [sampleGausiumReport] as MonthlyPerformanceReport[],
};

export function CustomerBundleClient({ token }: { token: string }) {
  const t = useTranslations('report');
  const isExample = token === 'example';

  const { data, isLoading, isError } = useQuery({
    queryKey: ['public-bundle', token],
    queryFn: () => reportApi.publicBundle(token).then((r) => r.data.data),
    enabled: !isExample,
  });

  const bundle = isExample ? EXAMPLE_BUNDLE : data;

  return (
    <div className="min-h-dvh bg-[#eef1f6] print:bg-white">
      {/* Page chrome — hidden in the printed/saved PDF */}
      <div className="mx-auto flex max-w-5xl items-center justify-end gap-3 px-4 pt-4 sm:px-6 print:hidden">
        {bundle && (
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)] px-3 py-2 text-sm font-semibold text-[var(--app-text)] shadow-sm transition hover:border-[var(--app-brand)] hover:text-[var(--app-brand-dark)]"
          >
            <Download className="h-4 w-4 text-[var(--app-brand)]" />
            {t('downloadPdf')}
          </button>
        )}
        <LanguageSwitcher />
      </div>

      {!isExample && isLoading && (
        <div className="flex items-center justify-center gap-2 py-32 text-sm text-[#6b7785]">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading report…
        </div>
      )}

      {!isExample && isError && (
        <div className="mx-auto max-w-md px-6 py-32 text-center">
          <p className="text-lg font-semibold text-[#16243a]">Report not available</p>
          <p className="mt-2 text-sm text-[#6b7785]">
            This report link is invalid or has expired. Please request a new link.
          </p>
        </div>
      )}

      {bundle &&
        bundle.robots.map((robot, idx) => (
          <div
            key={robot.serialNumber ?? idx}
            // content-visibility:auto defers rendering of off-screen reports, so a
            // customer with 70+ robots doesn't paint every report at once (which
            // can freeze low-end devices). contain-intrinsic-size keeps the scroll
            // bar stable; printing renders everything so the PDF has all pages.
            className={`[content-visibility:auto] [contain-intrinsic-size:auto_1400px] print:[content-visibility:visible] ${
              idx < bundle.robots.length - 1 ? 'print:break-after-page' : ''
            }`}
          >
            <MonthlyReportView report={robot} page={{ number: idx + 1, total: bundle.robots.length }} />
          </div>
        ))}
    </div>
  );
}
