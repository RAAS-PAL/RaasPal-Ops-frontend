import { getTranslations } from 'next-intl/server';
import { Bot, CalendarClock, ChevronRight, FileSearch, Mail, Users } from 'lucide-react';
import { AppSidebar } from '@/components/AppSidebar';
import { AppTopBar } from '@/components/AppTopBar';
import { BrandTicketHealthCard } from '@/components/BrandTicketHealthCard';
import { CvteStatusSummary } from '@/components/CvteStatusSummary';
import { MonthlyDeliveryCard } from '@/components/MonthlyDeliveryCard';
import { ReportCadenceStats } from '@/components/ReportCadenceStats';
import { RecentDeliveries } from '@/components/RecentDeliveries';
import { ReportDeliveryStats } from '@/components/ReportDeliveryStats';
import { Link } from '@/i18n/navigation';

export default async function LocaleHomePage() {
  const t = await getTranslations('teamDashboard');

  const steps = [
    { number: '1', title: t('reportFlow.step1Title'), description: t('reportFlow.step1Description') },
    { number: '2', title: t('reportFlow.step2Title'), description: t('reportFlow.step2Description') },
    { number: '3', title: t('reportFlow.step3Title'), description: t('reportFlow.step3Description') },
    { number: '4', title: t('reportFlow.step4Title'), description: t('reportFlow.step4Description') },
  ];

  const quickLinks = [
    { href: '/reports?tab=email',   icon: Mail,       label: t('quickAccess.emailLabel') },
    { href: '/reports?tab=preview', icon: FileSearch, label: t('quickAccess.previewLabel') },
    { href: '/tools?tab=robots',    icon: Bot,        label: t('quickAccess.robotsLabel') },
    { href: '/tools?tab=customers', icon: Users,      label: t('quickAccess.customersLabel') },
  ];

  return (
    <main className="min-h-dvh bg-[var(--app-bg)] text-[var(--app-text)] transition-colors">
      <div className="flex min-h-dvh">
        <AppSidebar />

        <section className="flex min-w-0 flex-1 flex-col">
          <AppTopBar
            eyebrow={t('eyebrow')}
            searchPlaceholder="Search…"
            title={t('title')}
          />

          <div className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">

            {/* Slim hero band — report automation is the primary destination */}
            <div className="relative overflow-hidden rounded-2xl px-5 py-4 text-white shadow-sm sm:px-6">
              <div className="absolute inset-0 bg-[var(--app-hero)]" />

              <div className="relative z-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <h2 className="text-lg font-bold leading-tight">{t('hero.title')}</h2>
                  <p className="mt-0.5 hidden max-w-xl truncate text-sm text-white/75 sm:block">
                    {t('hero.description')}
                  </p>
                </div>

                <Link
                  className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-[var(--app-brand-dark)] shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0 active:scale-95"
                  href="/reports"
                >
                  <CalendarClock className="h-4 w-4" />
                  {t('hero.cta')}
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            {/* Report delivery KPI tiles */}
            <ReportDeliveryStats />

            {/* How many robots are on each report cadence, and who that actually emails */}
            <ReportCadenceStats />

            {/* Delivery status centerpiece + recent deliveries */}
            <div className="grid gap-4 lg:grid-cols-2">
              <MonthlyDeliveryCard />
              <RecentDeliveries />
            </div>

            {/* Service health for the delivery-robot brand under review; the full analysis has its own page */}
            <BrandTicketHealthCard />

            {/* Robot monitoring stays visible for operations */}
            <CvteStatusSummary />

            {/* Quick links — report actions first */}
            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--app-muted)]">
                {t('quickAccess.heading')}
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {quickLinks.map(({ href, icon: Icon, label }) => (
                  <Link
                    key={href}
                    className="group flex items-center gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-panel)] p-4 transition hover:-translate-y-0.5 hover:border-[var(--app-brand)]"
                    href={href}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--app-brand-soft)] text-[var(--app-brand-dark)] transition group-hover:bg-[var(--app-brand)] group-hover:text-white">
                      <Icon className="h-5 w-5" />
                    </span>
                    <p className="min-w-0 truncate text-sm font-semibold text-[var(--app-text)]">{label}</p>
                    <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-[var(--app-muted)] transition group-hover:translate-x-0.5 group-hover:text-[var(--app-brand)]" />
                  </Link>
                ))}
              </div>
            </div>

            {/* How automated delivery works — onboarding strip for the team */}
            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--app-muted)]">
                {t('reportFlow.heading')}
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {steps.map((step) => (
                  <div
                    key={step.number}
                    className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-panel)] p-4"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--app-brand-soft)] text-xs font-bold text-[var(--app-brand-dark)]">
                        {step.number}
                      </span>
                      <p className="text-sm font-semibold text-[var(--app-text)]">{step.title}</p>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-[var(--app-muted)]">{step.description}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </section>
      </div>
    </main>
  );
}
