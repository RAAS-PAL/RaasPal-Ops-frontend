'use client';

import {
  Bot,
  CalendarClock,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Sparkles,
  Ticket,
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
  { title: 'Service Tickets', labelKey: 'tickets', href: '/tickets', icon: Ticket },
  // "Robot Catalog": the approved-model catalog that solutions are matched against,
  // not the deployed fleet -- the fleet lives under Tools -> Robots.
  { title: 'Robot Catalog', labelKey: 'robots', href: '/robots', icon: Bot },
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
      className={`sticky top-0 hidden h-dvh shrink-0 overflow-y-auto border-r border-[var(--app-nav-border)] bg-[var(--app-nav-bg)] px-4 py-5 text-[var(--app-nav-text)] transition-[width] duration-200 print:hidden lg:flex lg:flex-col ${
        collapsed ? 'w-20' : 'w-60 xl:w-64'
      }`}
    >
      <div className={`mb-8 flex items-center gap-3 px-2 ${collapsed ? 'justify-center' : ''}`}>
        <div className={`flex ${collapsed ? 'h-12 w-12' : 'h-14 w-14'} shrink-0 items-center justify-center rounded-2xl bg-[var(--app-nav-panel)] transition-[height,width]`}>
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
            <p className="text-xs font-medium text-[var(--app-nav-muted)]">{sidebarT('teamOperations')}</p>
          </div>
        )}
      </div>

      <div className={`mb-3 flex items-center ${collapsed ? 'justify-center' : 'justify-between px-3'}`}>
        {!collapsed && (
          <p className="text-xs font-semibold uppercase text-[var(--app-nav-muted)]">{sidebarT('teamWorkspace')}</p>
        )}
        <button
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--app-nav-border)] bg-[var(--app-nav-panel)] text-[var(--app-nav-muted)] transition hover:text-[var(--app-nav-text)]"
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
            aria-current={active ? 'page' : undefined}
            title={collapsed ? t(item.labelKey) : undefined}
            className={`group relative flex h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold transition ${
              collapsed ? 'justify-center' : ''
            } ${
              active
                ? 'bg-[var(--app-nav-active)] text-white'
                : 'text-[var(--app-nav-muted)] hover:bg-[var(--app-nav-panel)] hover:text-[var(--app-nav-text)]'
            }`}
            href={item.href}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span>{t(item.labelKey)}</span>}
          </Link>
        )})}
      </nav>

      <div className={`mt-auto rounded-xl border border-[var(--app-nav-border)] bg-[var(--app-nav-panel)] p-4 ${collapsed ? 'px-2' : ''}`}>
        {!collapsed && <p className="text-xs font-semibold uppercase text-[var(--app-nav-muted)]">{sidebarT('signedInAs')}</p>}
        <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : 'mt-3'}`}>
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--app-nav-bg)] text-sm font-bold text-[var(--app-nav-text)]">
            {user?.fullName?.slice(0, 2).toUpperCase() ?? 'RE'}
          </span>
          {!collapsed && (
            <div>
              <p className="text-sm font-semibold">{user?.fullName ?? 'Raas Pal Specialist'}</p>
              <p className="text-xs text-[var(--app-nav-muted)]">{user?.role ?? 'RAASPAL_TEAM'}</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
