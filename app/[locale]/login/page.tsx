/**
 * app/[locale]/login/page.tsx
 *
 * Login page — the only public route in the app.
 * On success:
 *   1. Stores JWT in Zustand + localStorage (client-side navigation)
 *   2. Sets `raaspal_token` httpOnly cookie via /api/auth/session (edge guard)
 *   3. Redirects to the dashboard
 *
 * Visual: "Bold & Premium" split-screen — a vibrant teal→blue gradient brand
 * panel (with animated glow orbs + feature highlights) beside a frosted-glass
 * sign-in card. The brand panel collapses on small screens, leaving the glass
 * card centred over a soft gradient backdrop.
 */

import Image from 'next/image';
import { FileText, Sparkles, Users } from 'lucide-react';
import { LoginForm } from './LoginForm';
import { getTranslations, setRequestLocale } from 'next-intl/server';

const highlights = [
  { icon: Users, key: 'customers' },
  { icon: FileText, key: 'reports' },
  { icon: Sparkles, key: 'ai' },
] as const;

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('login');

  return (
    <main className="relative min-h-dvh overflow-hidden bg-[var(--app-bg)]">
      <div className="relative grid min-h-dvh lg:grid-cols-2">
        {/* ─── Brand showcase panel (left) ─────────────────────────────────── */}
        <aside className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
          {/* Flat navy: the brand panel is a surface, not a light show. */}
          <div className="absolute inset-0 bg-[var(--app-hero)]" />

          {/* Brand lockup */}
          <div className="relative z-10 flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25 backdrop-blur-sm">
              <Image
                alt={t('logoAlt')}
                className="h-9 w-9 object-contain"
                height={36}
                priority
                src="/raas-pal-logo.png"
                width={36}
              />
            </div>
            <div className="text-white">
              <p className="text-lg font-bold tracking-tight">RAAS PAL</p>
              <p className="text-xs font-medium text-white/70">{t('brandSub')}</p>
            </div>
          </div>

          {/* Headline + feature highlights */}
          <div className="relative z-10 max-w-md">
            <h2 className="text-3xl font-bold leading-tight text-white xl:text-4xl">
              {t('headline')}
            </h2>
            <p className="mt-3 text-sm leading-6 text-white/70">{t('intro')}</p>

            <ul className="mt-8 space-y-4">
              {highlights.map(({ icon: Icon, key }) => (
                <li key={key} className="flex gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20 backdrop-blur-sm">
                    <Icon className="h-5 w-5 text-blue-200" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">{t(`${key}.title`)}</p>
                    <p className="text-xs leading-5 text-white/65">{t(`${key}.body`)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <p className="relative z-10 text-xs text-white/50">
            {t('footer', { year: new Date().getFullYear() })}
          </p>
        </aside>

        {/* ─── Sign-in panel (right) ───────────────────────────────────────── */}
        <section className="flex items-center justify-center px-4 py-12 sm:px-8">
          <div className="w-full max-w-md">
            {/* Compact brand header — only on small screens where the panel is hidden */}
            <div className="mb-8 flex flex-col items-center text-center lg:hidden">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--app-brand)] shadow-sm">
                <Image
                  alt={t('logoAlt')}
                  className="h-10 w-10 object-contain"
                  height={40}
                  priority
                  src="/raas-pal-logo.png"
                  width={40}
                />
              </div>
              <h1 className="text-2xl font-bold text-[var(--app-text)]">RAAS PAL</h1>
              <p className="mt-1 text-sm text-[var(--app-muted)]">{t('platform')}</p>
            </div>

            {/* Glass sign-in card */}
            <div className="rounded-3xl border border-white/40 bg-[var(--app-panel)]/70 p-8 shadow-2xl shadow-slate-900/10 backdrop-blur-xl dark:border-white/10 sm:p-10">
              <div className="mb-7">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--app-brand-soft)] px-3 py-1 text-xs font-semibold text-[var(--app-brand-dark)]">
                  <Sparkles className="h-3.5 w-3.5" />
                  {t('badge')}
                </span>
                <h2 className="mt-4 text-2xl font-bold tracking-tight text-[var(--app-text)]">{t('welcome')}</h2>
                <p className="mt-1 text-sm text-[var(--app-muted)]">{t('subtitle')}</p>
              </div>

              <LoginForm locale={locale} />

              {/* No self-registration: this is an internal platform, and accounts are
                  created by an admin from inside it. A public "create one" link on the
                  sign-in page invites exactly the wrong thing. */}
              <p className="mt-6 text-center text-sm text-[var(--app-muted)]">
                {t('noAccount')}
              </p>
            </div>

            <p className="mt-6 text-center text-xs text-[var(--app-muted)]">
              {t('authorizedOnly')}
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
