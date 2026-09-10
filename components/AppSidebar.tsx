'use client';

import {
  Banknote,
  BarChart3,
  Bot,
  CalendarClock,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileText,
  LayoutDashboard,
  Smile,
  Sparkles,
  TrendingUp,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Link, usePathname } from '@/i18n/navigation';
import { useAuthStore } from '@/store/auth';

export type NavChild = { labelKey: string; href: string; icon: LucideIcon };

export type NavItem = {
  title: string;
  labelKey: string;
  href: string;
  icon: LucideIcon;
  /** Highlights the group for any path beneath it, not just `href`. */
  sectionRoot?: string;
  children?: NavChild[];
};

export const navigationItems: NavItem[] = [
  { title: 'Team Dashboard', labelKey: 'teamDashboard', href: '/', icon: LayoutDashboard },
  { title: 'Reports', labelKey: 'reports', href: '/reports', icon: CalendarClock },
  {
    // Each area of the KPI deck is its own route. The group points at the report,
    // the deck's front page, so clicking the parent still lands somewhere real.
    title: 'KPI',
    labelKey: 'kpi',
    href: '/kpi/report',
    sectionRoot: '/kpi',
    icon: TrendingUp,
    children: [
      { labelKey: 'kpiReport', href: '/kpi/report', icon: BarChart3 },
      { labelKey: 'kpiUtilization', href: '/kpi/utilization', icon: Users },
      { labelKey: 'kpiRepeatCost', href: '/kpi/repeat-cost', icon: Banknote },
      { labelKey: 'kpiCsat', href: '/kpi/csat', icon: Smile },
    ],
  },
  { title: 'Generate Solution', labelKey: 'generateSolution', href: '/generate-solution', icon: ClipboardList },
  { title: 'Solutions', labelKey: 'solutions', href: '/solutions', icon: Sparkles },
  { title: 'Proposals', labelKey: 'proposals', href: '/proposals', icon: FileText },
  { title: 'Robots', labelKey: 'robots', href: '/robots', icon: Bot },
  { title: 'Tools', labelKey: 'tools', href: '/tools', icon: Wrench },
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const t = useTranslations('nav');
  const sidebarT = useTranslations('sidebar');
  const user = useAuthStore((s) => s.user);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  // next-intl's usePathname has the locale stripped already, so these compare
  // against the plain hrefs above.
  const isActive = (href: string) =>
    href === '/' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    // print:hidden — see AppTopBar. Navigation never belongs in a printed document,
    // and leaving it in also narrows the printable width of the report beside it.
    <aside
      className={`hidden shrink-0 border-r border-[var(--app-border)] bg-[var(--app-panel-soft)] px-4 py-5 transition-[width] duration-200 print:hidden lg:flex lg:flex-col ${
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
          const children = item.children ?? [];
          const active = isActive(item.sectionRoot ?? item.href) || children.some((c) => isActive(c.href));
          // A group opens itself while you are inside it; the chevron then lets
          // you override that either way. Collapsed to icons there is no room for
          // a submenu, so the parent is simply a link to the group's first page.
          const expanded = !collapsed && children.length > 0 && (openGroups[item.labelKey] ?? active);

          return (
            <div key={item.labelKey}>
              <div className="flex items-center gap-1">
                <Link
                  aria-label={t(item.labelKey)}
                  title={collapsed ? t(item.labelKey) : undefined}
                  className={`group relative flex h-11 min-w-0 flex-1 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition ${
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
                  {!collapsed && <span className="truncate">{t(item.labelKey)}</span>}
                </Link>

                {!collapsed && children.length > 0 && (
                  <button
                    aria-expanded={expanded}
                    aria-label={t(item.labelKey)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--app-muted)] transition hover:bg-[var(--app-panel)] hover:text-[var(--app-brand-dark)]"
                    onClick={() => setOpenGroups((groups) => ({ ...groups, [item.labelKey]: !expanded }))}
                    type="button"
                  >
                    <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? '' : '-rotate-90'}`} />
                  </button>
                )}
              </div>

              {expanded && (
                <div className="ml-5 mt-1 space-y-0.5 border-l border-[var(--app-border)] pl-3">
                  {children.map((child) => {
                    const childActive = isActive(child.href);
                    return (
                      <Link
                        key={child.labelKey}
                        className={`flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[13px] font-medium transition ${
                          childActive
                            ? 'bg-[var(--app-brand-soft)] text-[var(--app-brand-dark)]'
                            : 'text-[var(--app-muted)] hover:bg-[var(--app-panel)] hover:text-[var(--app-brand-dark)]'
                        }`}
                        href={child.href}
                      >
                        <child.icon className={`h-3.5 w-3.5 shrink-0 ${childActive ? 'text-[var(--app-brand)]' : ''}`} />
                        <span className="truncate">{t(child.labelKey)}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
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
