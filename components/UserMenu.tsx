'use client';

import {
  ChevronDown,
  LogOut,
  Settings,
  ShieldCheck,
  UserCircle,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { useAuthStore } from '@/store/auth';

export function UserMenu() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { logout, user } = useAuthStore();
  const t = useTranslations('userMenu');

  // Only Profile has somewhere to go. Settings has no page yet, and Access role is
  // a readout - the real role from /me, not the RAASPAL_TEAM placeholder it used to
  // show under every account, admins included.
  const menuItems = [
    { label: t('profile'), detail: t('profileDetail'), icon: UserCircle, href: '/profile' },
    { label: t('settings'), detail: t('settingsDetail'), icon: Settings },
    { label: t('accessRole'), detail: user?.role ?? t('teamRole'), icon: ShieldCheck },
  ];

  const handleLogout = useCallback(async () => {
    logout();
    await fetch('/api/auth/session', { method: 'DELETE' });
    router.push('/login');
  }, [logout, router]);

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
    <div ref={containerRef} className="relative">
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex h-10 items-center gap-2 rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)] px-2 text-[var(--app-text)] transition hover:border-[var(--app-brand)] hover:text-[var(--app-brand-dark)] sm:pr-3"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[var(--app-brand)] to-[var(--app-brand-dark)] text-xs font-bold text-white">
          {user?.fullName?.slice(0, 2).toUpperCase() ?? 'RE'}
        </span>
        <span className="hidden text-left sm:block">
          <span className="block text-xs font-semibold leading-4">{user?.fullName ?? 'Raas Pal Specialist'}</span>
          <span className="block text-[11px] leading-3 text-[var(--app-muted)]">{user?.role ?? 'RAASPAL_TEAM'}</span>
        </span>
        <ChevronDown className={`hidden h-3.5 w-3.5 shrink-0 transition sm:block ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] shadow-2xl shadow-slate-950/15"
            exit={{ opacity: 0, scale: 0.98, y: -4 }}
            initial={{ opacity: 0, scale: 0.98, y: -4 }}
            role="menu"
            transition={{ duration: 0.14, ease: 'easeOut' }}
          >
            <div className="border-b border-[var(--app-border)] bg-[var(--app-panel-alt)] p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[var(--app-brand)] to-[var(--app-brand-dark)] text-sm font-bold text-white">
                  {user?.fullName?.slice(0, 2).toUpperCase() ?? 'RE'}
                </span>
                <div>
                  <p className="text-sm font-semibold text-[var(--app-text)]">{user?.fullName ?? 'Raas Pal Specialist'}</p>
                  <p className="text-xs text-[var(--app-muted)]">{user?.email ?? 'team@raaspal.local'}</p>
                </div>
              </div>
            </div>

            <div className="p-2">
              {menuItems.map((item) => {
                const body = (
                  <>
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--app-brand-soft)] text-[var(--app-brand-dark)]">
                      <item.icon className="h-4 w-4" />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-[var(--app-text)]">{item.label}</span>
                      <span className="block text-xs text-[var(--app-muted)]">{item.detail}</span>
                    </span>
                  </>
                );
                const className = 'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-[var(--app-faint)]';
                return item.href ? (
                  <Link
                    key={item.label}
                    className={className}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    role="menuitem"
                  >
                    {body}
                  </Link>
                ) : (
                  <button key={item.label} className={className} role="menuitem" type="button">
                    {body}
                  </button>
                );
              })}
            </div>

            <div className="border-t border-[var(--app-border)] p-2">
              <button
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-red-500 transition hover:bg-red-500/10"
                onClick={handleLogout}
                role="menuitem"
                type="button"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10">
                  <LogOut className="h-4 w-4" />
                </span>
                {t('signOut')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
