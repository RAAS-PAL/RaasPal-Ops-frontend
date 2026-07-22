'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, usePathname } from '@/i18n/navigation';
import { navigationItems } from './AppSidebar';

export function TopNavigationMenu() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const t = useTranslations('nav');
  const sidebarT = useTranslations('sidebar');

  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
      setOpen(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, handleClickOutside]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div ref={containerRef} className="relative lg:hidden">
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
        className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)] text-[var(--app-muted)] transition hover:border-[var(--app-brand)] hover:text-[var(--app-brand-dark)]"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            animate={{ height: 'auto', opacity: 1, y: 0 }}
            className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] shadow-2xl shadow-slate-950/15"
            exit={{ height: 0, opacity: 0, y: -10 }}
            initial={{ height: 0, opacity: 0, y: -10 }}
            role="menu"
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-center gap-3 border-b border-[var(--app-border)] bg-[var(--app-panel-alt)] p-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--app-brand)] to-[var(--app-brand-dark)] shadow-md shadow-[var(--app-brand-glow)]">
                <Image
                  alt="RAAS PAL logo"
                  className="h-7 w-7 object-contain"
                  height={28}
                  src="/raas-pal-logo.png"
                  width={28}
                />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--app-text)]">RAAS PAL</p>
                <p className="text-xs text-[var(--app-muted)]">{sidebarT('teamWorkspace')}</p>
              </div>
            </div>

            <nav className="p-2" aria-label="Workspace navigation">
              {navigationItems.map((item) => {
                const active = item.href === '/' ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);

                return (
                <Link
                  key={item.labelKey}
                  className={`relative flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${
                    active
                      ? 'bg-gradient-to-r from-[var(--app-brand-soft)] to-transparent text-[var(--app-brand-dark)]'
                      : 'text-[var(--app-muted)] hover:bg-[var(--app-faint)] hover:text-[var(--app-brand-dark)]'
                  }`}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  role="menuitem"
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-[var(--app-brand)] to-[var(--app-brand-dark)]" />
                  )}
                  <item.icon className={`h-4 w-4 shrink-0 ${active ? 'text-[var(--app-brand)]' : ''}`} />
                  {t(item.labelKey)}
                </Link>
              )})}
            </nav>

            <div className="border-t border-[var(--app-border)] p-4">
              <p className="text-xs font-semibold uppercase text-[var(--app-muted)]">{sidebarT('signedInAs')}</p>
              <div className="mt-3 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[var(--app-brand)] to-[var(--app-brand-dark)] text-sm font-bold text-white shadow-sm shadow-[var(--app-brand-glow)]">
                  RE
                </span>
                <div>
                  <p className="text-sm font-semibold text-[var(--app-text)]">Raas Pal Specialist</p>
                  <p className="text-xs text-[var(--app-muted)]">RAASPAL_TEAM</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
