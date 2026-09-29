/**
 * app/[locale]/generate-solution/[solutionType]/page.tsx
 *
 * Solution type landing page — describes the workflow and links to the
 * file upload step (step 1 of the MVP generate flow).
 *
 * URL: /[locale]/generate-solution/[solutionType]
 * e.g. /en/generate-solution/cleaning
 */

import {
  ArrowLeft,
  ArrowRight,
  ConciergeBell,
  PackageCheck,
  SprayCan,
  Upload,
} from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { AppSidebar } from '@/components/AppSidebar';
import { AppTopBar } from '@/components/AppTopBar';

const solutionConfig = {
  cleaning: { icon: SprayCan },
  delivery: { icon: PackageCheck },
  concierge: { icon: ConciergeBell },
} as const;

type SolutionType = keyof typeof solutionConfig;

const FLOW_STEPS = ['step1', 'step2', 'step3', 'step4'] as const;

export function generateStaticParams() {
  return Object.keys(solutionConfig).map((solutionType) => ({ solutionType }));
}

export default async function SolutionTypePage({
  params,
}: {
  params: Promise<{ solutionType: string; locale: string }>;
}) {
  const { solutionType, locale } = await params;
  setRequestLocale(locale);

  if (!(solutionType in solutionConfig)) {
    notFound();
  }

  const type = solutionType as SolutionType;
  const config = solutionConfig[type];
  const Icon = config.icon;
  const t = await getTranslations('generateSolution');

  return (
    <main className="min-h-dvh bg-[var(--app-bg)] text-[var(--app-text)] transition-colors">
      <div className="flex min-h-dvh">
        <AppSidebar />

        <section className="flex min-w-0 flex-1 flex-col">
          <AppTopBar
            eyebrow={t(`forms.${type}.eyebrow`)}
            searchPlaceholder={t('searchPlaceholder')}
            title={t(`forms.${type}.title`)}
          />

          <div className="mx-auto w-full max-w-2xl space-y-6 p-4 sm:p-6">
            {/* Back */}
            <Link
              className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--app-muted)] hover:text-[var(--app-brand-dark)]"
              href="/generate-solution"
            >
              <ArrowLeft className="h-4 w-4" />
              {t('forms.back')}
            </Link>

            {/* Hero banner */}
            <div className="bg-[var(--app-hero)] relative overflow-hidden rounded-2xl p-6 text-white shadow-sm">
              <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wider text-blue-200">{t(`forms.${type}.kicker`)}</p>
                  <h2 className="mt-3 max-w-xl text-3xl font-bold">{t(`forms.${type}.headline`)}</h2>
                  <p className="mt-3 max-w-lg text-sm leading-6 text-white/75">{t(`forms.${type}.description`)}</p>
                </div>
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-blue-200 ring-1 ring-white/20 backdrop-blur-sm">
                  <Icon className="h-7 w-7" />
                </span>
              </div>
            </div>

            {/* Flow steps */}
            <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-5 shadow-sm">
              <p className="mb-4 text-xs font-semibold uppercase text-[var(--app-muted)]">{t('flow.howItWorks')}</p>
              <div className="space-y-4">
                {FLOW_STEPS.map((step, index) => (
                  <div key={step} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--app-brand-soft)] text-xs font-bold text-[var(--app-brand-dark)]">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      {index < FLOW_STEPS.length - 1 && (
                        <div className="mt-2 h-full w-px bg-[var(--app-border)]" />
                      )}
                    </div>
                    <div className="pb-4">
                      <p className="font-semibold text-[var(--app-text)]">{t(`flow.${step}Title`)}</p>
                      <p className="mt-1 text-sm leading-5 text-[var(--app-muted)]">{t(`flow.${step}Body`)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <Link
              className="flex h-14 w-full items-center justify-center gap-3 rounded-xl bg-[var(--app-brand)] text-base font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl"
              href={`/generate-solution/${solutionType}/upload`}
            >
              <Upload className="h-5 w-5" />
              {t('flow.cta')}
              <ArrowRight className="h-5 w-5" />
            </Link>

            <p className="text-center text-xs text-[var(--app-muted)]">
              {t('flow.disclaimer')}
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
