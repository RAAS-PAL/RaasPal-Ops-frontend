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
import { Bot, FileText, Sparkles } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { LoginForm } from './LoginForm';
import { setRequestLocale } from 'next-intl/server';

const highlights = [
  {
    icon: Sparkles,
    title: 'AI requirement extraction',
    description: 'Upload any survey — Excel, PDF, or image — and let AI structure it instantly.',
  },
  {
    icon: Bot,
    title: 'Smart robot matching',
    description: 'Compare requirements against the approved catalog for 2–3 ranked options.',
  },
  {
    icon: FileText,
    title: 'Instant proposals',
    description: 'Generate a polished, on-brand proposal for the option you choose.',
  },
];

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main className="relative min-h-dvh overflow-hidden bg-[var(--app-bg)]">
      {/* Soft gradient backdrop + glow orbs (visible behind the glass card on all sizes) */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-[var(--app-brand)]/20 blur-3xl animate-float-orb" />
        <div className="absolute -right-24 bottom-0 h-[28rem] w-[28rem] rounded-full bg-sky-500/20 blur-3xl animate-float-orb-alt" />
      </div>

      <div className="relative grid min-h-dvh lg:grid-cols-2">
        {/* ─── Brand showcase panel (left) ─────────────────────────────────── */}
        <aside className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
          {/* Animated aurora gradient */}
          <div className="animate-aurora absolute inset-0 bg-gradient-to-br from-[#0a4d6b] via-[var(--app-brand-dark)] to-[#1b4ed8]" />
          <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_0%_0%,rgba(255,255,255,0.18),transparent_50%)]" />

          {/* glow orbs inside the panel */}
          <div className="pointer-events-none absolute -right-16 top-12 h-72 w-72 rounded-full bg-cyan-300/30 blur-3xl animate-float-orb" />
          <div className="pointer-events-none absolute -left-10 bottom-10 h-64 w-64 rounded-full bg-indigo-400/25 blur-3xl animate-float-orb-alt" />

          {/* Brand lockup */}
          <div className="relative z-10 flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25 backdrop-blur-sm">
              <Image
                alt="RAAS PAL logo"
                className="h-9 w-9 object-contain"
                height={36}
                priority
                src="/raas-pal-logo.png"
                width={36}
              />
            </div>
            <div className="text-white">
              <p className="text-lg font-bold tracking-tight">RAAS PAL</p>
              <p className="text-xs font-medium text-white/70">Team Operations</p>
            </div>
          </div>

          {/* Headline + feature highlights */}
          <div className="relative z-10 max-w-md">
            <h2 className="text-3xl font-bold leading-tight text-white xl:text-4xl">
              The right robot for every space — in minutes.
            </h2>
            <p className="mt-3 text-sm leading-6 text-white/70">
              RAAS PAL turns a customer survey into ranked robot recommendations and a
              ready-to-send proposal, powered by AI.
            </p>

            <ul className="mt-8 space-y-4">
              {highlights.map(({ icon: Icon, title, description }) => (
                <li key={title} className="flex gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20 backdrop-blur-sm">
                    <Icon className="h-5 w-5 text-cyan-200" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">{title}</p>
                    <p className="text-xs leading-5 text-white/65">{description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <p className="relative z-10 text-xs text-white/50">
            © {new Date().getFullYear()} RAAS PAL · Internal team portal
          </p>
        </aside>

        {/* ─── Sign-in panel (right) ───────────────────────────────────────── */}
        <section className="flex items-center justify-center px-4 py-12 sm:px-8">
          <div className="w-full max-w-md">
            {/* Compact brand header — only on small screens where the panel is hidden */}
            <div className="mb-8 flex flex-col items-center text-center lg:hidden">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--app-brand)] to-[var(--app-brand-dark)] shadow-lg shadow-[var(--app-brand-glow)]">
                <Image
                  alt="RAAS PAL logo"
                  className="h-10 w-10 object-contain"
                  height={40}
                  priority
                  src="/raas-pal-logo.png"
                  width={40}
                />
              </div>
              <h1 className="text-2xl font-bold text-[var(--app-text)]">RAAS PAL</h1>
              <p className="mt-1 text-sm text-[var(--app-muted)]">
                AI-powered robot recommendation platform
              </p>
            </div>

            {/* Glass sign-in card */}
            <div className="rounded-3xl border border-white/40 bg-[var(--app-panel)]/70 p-8 shadow-2xl shadow-slate-900/10 backdrop-blur-xl dark:border-white/10 sm:p-10">
              <div className="mb-7">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--app-brand-soft)] px-3 py-1 text-xs font-semibold text-[var(--app-brand-dark)]">
                  <Sparkles className="h-3.5 w-3.5" />
                  Team portal
                </span>
                <h2 className="mt-4 text-2xl font-bold tracking-tight text-[var(--app-text)]">
                  Welcome back
                </h2>
                <p className="mt-1 text-sm text-[var(--app-muted)]">
                  Sign in with your team credentials to continue.
                </p>
              </div>

              <LoginForm locale={locale} />

              {/* No self-registration: this is an internal platform, and accounts are
                  created by an admin from inside it. A public "create one" link on the
                  sign-in page invites exactly the wrong thing. */}
              <p className="mt-6 text-center text-sm text-[var(--app-muted)]">
                Need an account? Ask a RAASPAL administrator.
              </p>
            </div>

            <p className="mt-6 text-center text-xs text-[var(--app-muted)]">
              Final solution confirmation requires RAASPAL verification and/or site survey.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
