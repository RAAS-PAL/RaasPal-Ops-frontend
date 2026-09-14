'use client';

import {
  Bot,
  CalendarClock,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Sparkles,
  Wrench,
} from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Link, usePathname } from '@/i18n/navigation';
import { useAuthStore } from '@/store/auth';

export const navigationItems = [
  { title: 'Team Dashboard', labelKey: 'teamDashboard', href: '/', icon: LayoutDashboard },
  { title: 'Reports', labelKey: 'reports', href: '/reports', icon: CalendarClock },
  // One entry for the whole solution workflow (generate → solutions → proposals);
  // the page has tabs. The generation steps and proposal pages keep their own
  // routes, so those paths light this entry up too.
  { title: 'Solutions', labelKey: 'solutions', href: '/solutions', icon: Sparkles, alsoMatches: ['/generate-solution', '/proposals'] },
  { title: 'PM Planning', labelKey: 'pmPlanning', href: '/pm-planning', icon: CalendarRange },
  { title: 'Robots', labelKey: 'robots', href: '/robots', icon: Bot },
  { title: 'Tools', labelKey: 'tools', href: '/tools', icon: Wrench },
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const t = useTranslations('nav');
  const sidebarT = useTranslations('sidebar');
  const user = useAuthStore((s) => s.user);

  return (
    // print:hidden — see AppTopBar. Navigation never belongs in a printed document,
    // and leaving it in also narrows the printable width of the report beside it.
    // sticky + h-dvh: the page itself scrolls, so as a plain flex child the nav slid
    // away up the screen on any long list — the catalogue, the pending-case table —
    // and getting to another section meant scrolling back to the top first. Sticky
    // keeps it against the viewport without taking the whole shell into a fixed-height
    // layout, which would change how every page scrolls and how they print. Its own
    // overflow-y-auto is for the short-window case: a 600px-tall window cannot fit
    // eight nav items plus the account card, and without it the card is unreachable.
    <aside
      className={`sticky top-0 hidden h-dvh shrink-0 overflow-y-auto border-r border-[var(--app-border)] bg-[var(--app-panel-soft)] px-4 py-5 transition-[width] duration-200 print:hidden lg:flex lg:flex-col ${
        collapsed ? 'w-20' : 'w-64 xl:w-72'
      }`}
    >
      <div className={`mb-8 flex items-center gap-3 px-2 ${collapsed ? 'justify-center' : ''}`}>
        <div className={`flex ${collapsed ? 'h-12 w-12' : 'h-14 w-14'} shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--app-brand)] to-[var(--app-brand-dark)] shadow-md shadow-[var(--app-brand-glow)] transition-[height,width]`}>
          <Image
            alt="RAAS PAL logo"
            className={`${collapsed ? 'h-8 w-8' : 'h-9 w-9'} object-contain transition-[height,width]`}
            height={36}
            priority
            src="/raas-pal-logo.png"
            width={36}
          />
        </div>
        {!collapsed && (
          <div>
            <p className="text-base font-semibold">RAAS PAL</p>
            <p className="text-xs font-medium text-[var(--app-muted)]">{sidebarT('teamOperations')}</p>
          </div>
        )}
      </div>

      <div className={`mb-3 flex items-center ${collapsed ? 'justify-center' : 'justify-between px-3'}`}>
        {!collapsed && (
          <p className="text-xs font-semibold uppercase text-[var(--app-muted)]">{sidebarT('teamWorkspace')}</p>
        )}
        <button
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)] text-[var(--app-muted)] transition hover:border-[var(--app-brand)] hover:text-[var(--app-brand-dark)]"
          onClick={() => setCollapsed((value) => !value)}
          type="button"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      <nav className="space-y-1">
        {navigationItems.map((item) => {
          const matches = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
          const active = item.href === '/'
            ? pathname === item.href
            : matches(item.href) || (('alsoMatches' in item ? item.alsoMatches : []) as string[]).some(matches);

          return (
          <Link
            key={item.labelKey}
            aria-label={t(item.labelKey)}
            title={collapsed ? t(item.labelKey) : undefined}
            className={`group relative flex h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold transition ${
              collapsed ? 'justify-center' : ''
            } ${
              active
                ? 'bg-gradient-to-r from-[var(--app-brand-soft)] to-transparent text-[var(--app-brand-dark)] shadow-sm'
                : 'text-[var(--app-muted)] hover:bg-[var(--app-panel)] hover:text-[var(--app-brand-dark)]'
            }`}
            href={item.href}
          >
            {active && (
              <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-[var(--app-brand)] to-[var(--app-brand-dark)]" />
            )}
            <item.icon className={`h-4 w-4 shrink-0 transition ${active ? 'text-[var(--app-brand)]' : 'group-hover:text-[var(--app-brand)]'}`} />
            {!collapsed && <span>{t(item.labelKey)}</span>}
          </Link>
        )})}
      </nav>

      <div className={`mt-auto rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)]/80 p-4 ${collapsed ? 'px-2' : ''}`}>
        {!collapsed && <p className="text-xs font-semibold uppercase text-[var(--app-muted)]">{sidebarT('signedInAs')}</p>}
        <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : 'mt-3'}`}>
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[var(--app-brand)] to-[var(--app-brand-dark)] text-sm font-bold text-white shadow-sm shadow-[var(--app-brand-glow)]">
            {user?.fullName?.slice(0, 2).toUpperCase() ?? 'RE'}
          </span>
          {!collapsed && (
            <div>
              <p className="text-sm font-semibold">{user?.fullName ?? 'Raas Pal Specialist'}</p>
              <p className="text-xs text-[var(--app-muted)]">{user?.role ?? 'RAASPAL_TEAM'}</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
