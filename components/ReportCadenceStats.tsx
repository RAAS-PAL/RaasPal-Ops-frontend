'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { CalendarDays, CalendarOff, CalendarRange, ChevronRight } from 'lucide-react';
import { StatTile } from '@/components/ReportDeliveryStats';
import { Link } from '@/i18n/navigation';
import { robotUnitApi } from '@/lib/api';
import type { RobotUnitResponse } from '@/types/api';

const REFRESH_MS = 60_000;

type Cadence = 'MONTHLY' | 'WEEKLY' | 'OFF';

interface CadenceCount {
  /** Every deployed robot with this setting — the number Tools → Robots shows. */
  robots: number;
  /** Delivery robots among them. The report emails skip these whatever the setting. */
  delivery: number;
  /** Customers who actually receive this email: those with a cleaning robot on it. */
  customers: number;
}

/**
 * Counts deployed robots by report cadence. Robots and customers are counted
 * separately on purpose: the tile's number matches what staff see in Tools →
 * Robots, while the hint says who is actually emailed. The two differ a lot,
 * because delivery robots (AutoXing, Pudu) are left out of the cleaning report
 * email however they are set — in September 2026, 17 of 19 Monthly robots.
 */
function countByCadence(robots: RobotUnitResponse[]): Record<Cadence, CadenceCount> {
  const counts: Record<Cadence, CadenceCount> = {
    MONTHLY: { robots: 0, delivery: 0, customers: 0 },
    WEEKLY: { robots: 0, delivery: 0, customers: 0 },
    OFF: { robots: 0, delivery: 0, customers: 0 },
  };
  const customers: Record<Cadence, Set<string>> = { MONTHLY: new Set(), WEEKLY: new Set(), OFF: new Set() };

  for (const robot of robots) {
    const deployment = robot.deployment;
    if (!deployment) continue; // not with a customer — no report either way
    const cadence = deployment.reportCadence as Cadence;
    if (!counts[cadence]) continue;
    counts[cadence].robots += 1;
    if (robot.robotType === 'DELIVERY') {
      counts[cadence].delivery += 1;
    } else {
      customers[cadence].add(deployment.customerProfileId);
    }
  }
  for (const cadence of Object.keys(counts) as Cadence[]) {
    counts[cadence].customers = customers[cadence].size;
  }
  return counts;
}

/**
 * Team Dashboard row: how many robots are set to Monthly, Weekly and Off, and how
 * many customers each emailed cadence actually reaches. Shares the robot list
 * query with Tools → Robots, so changing a robot there updates this row.
 */
export function ReportCadenceStats() {
  const t = useTranslations('teamDashboard.cadence');

  const robots = useQuery({
    queryKey: ['robot-units'],
    queryFn: () => robotUnitApi.list().then((r) => r.data.data ?? []),
    refetchInterval: REFRESH_MS,
  });

  const counts = robots.data ? countByCadence(robots.data) : null;
  const value = (cadence: Cadence) => (robots.isError || !counts ? null : counts[cadence].robots);

  /** "2 customers emailed · 17 delivery not emailed" — the second half only when it applies. */
  const emailedHint = (cadence: Cadence) => {
    if (!counts) return undefined;
    const { customers, delivery } = counts[cadence];
    const parts = [t('customersEmailed', { count: customers })];
    if (delivery > 0) parts.push(t('deliveryNotEmailed', { count: delivery }));
    return parts.join(' · ');
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--app-muted)]">{t('heading')}</h3>
        <Link
          href="/tools?tab=robots"
          className="group inline-flex items-center gap-1 text-xs font-semibold text-[var(--app-brand-dark)] hover:underline"
        >
          {t('manage')}
          <ChevronRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile
          icon={CalendarDays}
          tone="brand"
          label={t('monthly')}
          value={value('MONTHLY')}
          hint={emailedHint('MONTHLY')}
          loading={robots.isLoading}
        />
        <StatTile
          icon={CalendarRange}
          tone="success"
          label={t('weekly')}
          value={value('WEEKLY')}
          hint={emailedHint('WEEKLY')}
          loading={robots.isLoading}
        />
        <StatTile
          icon={CalendarOff}
          tone="muted"
          label={t('off')}
          value={value('OFF')}
          hint={t('offHint')}
          loading={robots.isLoading}
        />
      </div>
    </div>
  );
}
