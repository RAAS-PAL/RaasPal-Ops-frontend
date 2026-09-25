'use client';

/**
 * The dashboard's delivery tracking, for the current report month (last month)
 * and the last finished ISO week. Every delivery number on the Team Dashboard comes
 * from here, so they agree with each other.
 *
 * The query keys are the ones the Reports and Tools panels already use, so a send
 * or a cadence change made there refreshes the dashboard, and vice versa.
 */
import { useQuery } from '@tanstack/react-query';
import { customerApi, reportApi, robotUnitApi } from '@/lib/api';
import { previousMonth } from '@/lib/report-month';
import { isoWeekRange, previousIsoWeek } from '@/lib/report-week';
import { monthRange, trackPeriod, type PeriodTracking } from '@/lib/report-tracking';

const REFRESH_MS = 60_000;

export interface ReportTracking {
  /** "2026-08" — last month, the one being reported on now. */
  month: string;
  /** "2026-W38" — the last finished week. */
  week: string;
  monthly: PeriodTracking | null;
  weekly: PeriodTracking | null;
  isLoading: boolean;
  isError: boolean;
}

export function useReportTracking(): ReportTracking {
  const month = previousMonth();
  const week = previousIsoWeek();

  const monthHistory = useQuery({
    queryKey: ['report-delivery-history', month],
    queryFn: () => reportApi.deliveryHistory({ month }).then((r) => r.data.data ?? []),
    refetchInterval: REFRESH_MS,
  });
  const weekHistory = useQuery({
    queryKey: ['report-delivery-history', week],
    queryFn: () => reportApi.deliveryHistory({ week }).then((r) => r.data.data ?? []),
    refetchInterval: REFRESH_MS,
  });
  const robots = useQuery({
    queryKey: ['robot-units'],
    queryFn: () => robotUnitApi.list().then((r) => r.data.data ?? []),
    refetchInterval: REFRESH_MS,
  });
  const customers = useQuery({
    queryKey: ['customers'],
    queryFn: () => customerApi.list().then((r) => r.data.data ?? []),
    refetchInterval: REFRESH_MS,
  });

  const ready = robots.data && customers.data;
  const weekDates = isoWeekRange(week);

  return {
    month,
    week,
    monthly:
      ready && monthHistory.data
        ? trackPeriod('month', monthRange(month), monthHistory.data, robots.data!, customers.data!)
        : null,
    weekly:
      ready && weekHistory.data && weekDates
        ? trackPeriod('week', weekDates, weekHistory.data, robots.data!, customers.data!)
        : null,
    isLoading: monthHistory.isLoading || weekHistory.isLoading || robots.isLoading || customers.isLoading,
    isError: monthHistory.isError || weekHistory.isError || robots.isError || customers.isError,
  };
}
