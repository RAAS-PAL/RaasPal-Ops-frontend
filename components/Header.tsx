/**
 * components/Header.tsx  — Server Component
 *
 * The Header itself is a Server Component (no 'use client') so it renders
 * translated nav labels on the server with zero client JS.
 * LanguageSwitcher is a Client Component imported inside — React handles the
 * server/client boundary automatically at the import boundary.
 */
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { LanguageSwitcher } from './LanguageSwitcher';
import { Bot } from 'lucide-react';

export async function Header() {
  const t = await getTranslations('nav');

  return (
    <header className="
      sticky top-0 z-40 w-full
      border-b border-edge
      bg-surface/80 backdrop-blur-md backdrop-saturate-150
    ">
      <div className="mx-auto flex h-14 max-w-screen-2xl items-center gap-4 px-4 sm:px-6">

        {/* ── Brand ── */}
        <Link
          href="/"
          className="flex items-center gap-2.5 mr-auto group"
          aria-label="RAAS PAL home"
        >
          {/* Logo icon */}
          <span className="
            flex h-8 w-8 items-center justify-center rounded-lg
            bg-accent shadow-[0_0_12px_var(--accent-glow)]
            group-hover:shadow-[0_0_20px_var(--accent-glow)]
            transition-shadow duration-300
          ">
            <Bot className="h-4.5 w-4.5 text-canvas" strokeWidth={2.5} />
          </span>

          <span className="flex flex-col leading-none">
            <span className="text-sm font-bold text-ink tracking-tight">
              RAAS PAL
            </span>
            <span className="text-[10px] text-ink-dim font-medium tracking-widest uppercase">
              Robot as a Service
            </span>
          </span>
        </Link>

        {/* ── Nav links (hidden on mobile, shown sm+) ── */}
        <nav className="hidden sm:flex items-center gap-1" aria-label="Main navigation">
          {[
            { href: '/dashboard',    label: t('dashboard')    },
            { href: '/solutions?tab=generate', label: t('generateSolution') },
            { href: '/solutions?tab=solutions', label: t('solutions') },
            { href: '/robots',       label: t('robots')       },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="
                px-3 py-1.5 rounded-md text-sm font-medium
                text-ink-muted hover:text-ink hover:bg-elevated
                transition-colors duration-150
              "
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* ── Right side ── */}
        <div className="flex items-center gap-2">
          <LanguageSwitcher />

          {/* Login button */}
          <Link
            href="/login"
            className="
              hidden sm:flex items-center gap-1.5
              rounded-lg border border-edge px-3 py-1.5
              text-sm font-medium text-ink-muted
              hover:border-accent/50 hover:text-accent hover:bg-accent-faint
              transition-all duration-150
            "
          >
            {t('login')}
          </Link>
        </div>

      </div>
    </header>
  );
}
