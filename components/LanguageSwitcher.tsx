'use client';

/**
 * components/LanguageSwitcher.tsx
 *
 * HOW locale-switching works:
 *   `useRouter` here comes from @/i18n/navigation (not next/navigation).
 *   next-intl wraps the standard router and intercepts push/replace calls
 *   that include `{ locale }` in the options.  When we call:
 *
 *     router.replace(pathname, { locale: 'th' })
 *
 *   next-intl rewrites the URL from /en/dashboard → /th/dashboard, keeping
 *   every path segment after the locale prefix intact.
 *
 *   `usePathname` (also from @/i18n/navigation) returns the pathname WITHOUT
 *   the locale prefix, so we can pass it straight into router.replace.
 */

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/navigation';
import { routing, type Locale } from '@/i18n/routing';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useState, useRef, useEffect, useCallback } from 'react';

/* ─── Language metadata ──────────────────────────────────────────────────── */

const LANGUAGES: { locale: Locale; label: string; nativeLabel: string }[] = [
  { locale: 'en', label: 'English',  nativeLabel: 'English' },
  { locale: 'th', label: 'Thai',     nativeLabel: 'ไทย'    },
];

/* ─── Component ──────────────────────────────────────────────────────────── */

export function LanguageSwitcher() {
  const currentLocale = useLocale() as Locale;
  const router       = useRouter();
  const pathname     = usePathname();

  const [open, setOpen] = useState(false);
  const containerRef    = useRef<HTMLDivElement>(null);

  /* Close on outside click */
  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
      setOpen(false);
    }
  }, []);

  useEffect(() => {
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return ()  => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, handleClickOutside]);

  /* Close on Escape */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const switchLocale = (locale: Locale) => {
    if (locale === currentLocale) { setOpen(false); return; }
    router.replace(pathname, { locale });
    setOpen(false);
  };

  const current = LANGUAGES.find((l) => l.locale === currentLocale) ?? LANGUAGES[0];

  return (
    <div ref={containerRef} className="relative">

      {/* ── Trigger button ── */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Select language"
        className="
          flex items-center gap-2 rounded-lg px-3 py-2
          text-sm font-semibold text-[var(--app-text)]
          border border-[var(--app-border)] bg-[var(--app-panel)] shadow-sm
          hover:border-[var(--app-brand)] hover:bg-[var(--app-brand-soft)] hover:text-[var(--app-brand-dark)]
          transition-all duration-150
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-brand)]
        "
      >
        <Globe className="h-4 w-4 text-[var(--app-brand)] shrink-0" />
        <span className="hidden sm:inline">{current.nativeLabel}</span>
        <ChevronDown
          className={`h-3 w-3 shrink-0 text-[var(--app-muted)] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* ── Dropdown ── */}
      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            aria-label="Language options"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0,  scale: 1    }}
            exit={{    opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.13, ease: 'easeOut' }}
            className="
              absolute right-0 z-50 mt-2 w-44 origin-top-right
              overflow-hidden rounded-xl
              border border-[var(--app-border)] bg-[var(--app-panel)]
              shadow-2xl shadow-slate-900/15
            "
          >
            {LANGUAGES.map((lang) => {
              const isActive = lang.locale === currentLocale;
              return (
                <li key={lang.locale} role="option" aria-selected={isActive}>
                  <button
                    onClick={() => switchLocale(lang.locale)}
                    className={`
                      w-full flex items-center justify-between gap-3
                      px-4 py-2.5 text-sm transition-colors duration-100
                      ${isActive
                        ? 'bg-[var(--app-brand-soft)] text-[var(--app-brand-dark)] font-semibold'
                        : 'text-[var(--app-muted)] hover:bg-[var(--app-faint)] hover:text-[var(--app-text)]'}
                    `}
                  >
                    <span className="flex items-center gap-2.5">
                      {/* Locale badge */}
                      <span
                        className={`
                          inline-flex h-5 w-7 items-center justify-center
                          rounded text-[10px] font-bold uppercase tracking-wider
                          ${isActive ? 'bg-[var(--app-brand)] text-white' : 'bg-[var(--app-faint)] text-[var(--app-muted)]'}
                        `}
                      >
                        {lang.locale}
                      </span>
                      <span>{lang.nativeLabel}</span>
                    </span>
                    {isActive && <Check className="h-3.5 w-3.5 shrink-0" />}
                  </button>
                </li>
              );
            })}

            {/* Bottom label */}
            <li aria-hidden className="border-t border-[var(--app-border)] px-4 py-2">
              <span className="text-[11px] text-[var(--app-muted)]">
                {routing.locales.length} languages available
              </span>
            </li>
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
