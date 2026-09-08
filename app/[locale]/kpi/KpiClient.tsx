'use client';

/**
 * KPI section — one tab per area of the RE Team KPI deck, over a selectable
 * reporting period.
 *
 * Period lives here rather than in each tab so switching tabs keeps the range,
 * and it is mirrored into the URL alongside the tab so a specific view is
 * shareable — the same pattern /reports uses for its tab.
 *
 * All three tabs are scaffolded. Only the deck's own period (Jan–Jun 2026) has
 * placeholder data behind it; any other selection renders an explicit no-data
 * state rather than showing the same figures under a different heading.
 */
import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { BarChart3, Banknote, Users } from 'lucide-react';
import { AppSidebar } from '@/components/AppSidebar';
import { AppTopBar } from '@/components/AppTopBar';
import { ReKpiReportTab } from '@/components/kpi/ReKpiReportTab';
import { UtilizationTab } from '@/components/kpi/UtilizationTab';
import { RepeatCostTab } from '@/components/kpi/RepeatCostTab';
import { PeriodSelector } from '@/components/kpi/PeriodSelector';
import { NoPeriodData } from '@/components/kpi/NoPeriodData';
import {
  DECK_PERIOD,
  formatPeriod,
  hasPlaceholderData,
  isValidPeriod,
  type Period,
  type PeriodPresetId,
} from '@/lib/kpi/period';

export type KpiTab = 'report' | 'utilization' | 'repeat-cost';

type Props = {
  initialTab?: KpiTab;
  initialPeriod?: Period;
  initialPreset?: PeriodPresetId;
};

export function KpiClient({
  initialTab = 'report',
  initialPeriod = DECK_PERIOD,
  initialPreset = 'h1',
}: Props) {
  const t = useTranslations('kpi');
  const locale = useLocale();

  const [tab, setTab] = useState<KpiTab>(initialTab);
  const [preset, setPreset] = useState<PeriodPresetId>(initialPreset);
  const [year, setYear] = useState<number>(Number(initialPeriod.from.slice(0, 4)));
  const [period, setPeriod] = useState<Period>(initialPeriod);

  const syncUrl = (nextTab: KpiTab, nextPeriod: Period, nextPreset: PeriodPresetId) => {
    const params = new URLSearchParams({
      tab: nextTab,
      from: nextPeriod.from,
      to: nextPeriod.to,
      preset: nextPreset,
    });
    window.history.replaceState(null, '', `?${params}`);
  };

  const selectTab = (next: KpiTab) => {
    setTab(next);
    syncUrl(next, period, preset);
  };

  const changePeriod = (next: { preset: PeriodPresetId; year: number; period: Period }) => {
    setPreset(next.preset);
    setYear(next.year);
    setPeriod(next.period);
    syncUrl(tab, next.period, next.preset);
  };

  const resetToDeckPeriod = () =>
    changePeriod({ preset: 'h1', year: 2026, period: DECK_PERIOD });

  const tabs: { id: KpiTab; label: string; icon: React.ReactNode }[] = [
    { id: 'report', label: t('tabs.report'), icon: <BarChart3 className="h-4 w-4" /> },
    { id: 'utilization', label: t('tabs.utilization'), icon: <Users className="h-4 w-4" /> },
    { id: 'repeat-cost', label: t('tabs.repeatCost'), icon: <Banknote className="h-4 w-4" /> },
  ];

  const rangeUsable = isValidPeriod(period);
  // The report tab is computed from synced tickets, so it answers for any valid
  // range — an empty one included, which it says plainly. Utilization and Repeat
  // Cost are still deck constants and can only honestly show the deck's own
  // period, so they keep the placeholder gate.
  const fixtureTabAvailable = rangeUsable && hasPlaceholderData(period);
  const gated = tab === 'report' ? !rangeUsable : !fixtureTabAvailable;

  return (
    <main className="min-h-dvh bg-[var(--app-bg)] text-[var(--app-text)] transition-colors">
      <div className="flex min-h-dvh">
        <AppSidebar />
        <section className="flex min-w-0 flex-1 flex-col">
          <AppTopBar eyebrow={t('eyebrow')} title={t('title')} searchPlaceholder={t('searchPlaceholder')} />

          <div className="mx-auto w-full max-w-[1600px] space-y-4 p-4 sm:p-6">
            {/* Tabs and period control share a row; period wraps below on narrow screens. */}
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--app-border)] print:hidden">
              <div className="flex flex-wrap gap-2">
                {tabs.map((item) => {
                  const active = tab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => selectTab(item.id)}
                      aria-current={active ? 'page' : undefined}
                      className={`-mb-px inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-3 pb-2.5 pt-1 text-sm font-semibold transition ${
                        active
                          ? 'border-[var(--app-brand)] text-[var(--app-brand-dark)]'
                          : 'border-transparent text-[var(--app-muted)] hover:text-[var(--app-text)]'
                      }`}
                    >
                      {item.icon}
                      {item.label}
                    </button>
                  );
                })}
              </div>

              <div className="pb-2">
                <PeriodSelector preset={preset} year={year} period={period} onChange={changePeriod} />
              </div>
            </div>

            {/* Resolved period, so the figures below are never unattributed. */}
            {rangeUsable && (
              <p className="text-xs text-[var(--app-muted)]">
                {t('period.showing')}{' '}
                <span className="font-semibold text-[var(--app-text)]">
                  {formatPeriod(period, locale)}
                </span>
              </p>
            )}

            {gated ? (
              <NoPeriodData
                title={rangeUsable ? t('period.noDataTitle') : t('period.invalidTitle')}
                body={rangeUsable ? t('period.noDataBody') : t('period.invalidBody')}
                actionLabel={t('period.backToDeck')}
                onAction={resetToDeckPeriod}
              />
            ) : (
              <>
                {tab === 'report' && <ReKpiReportTab period={period} />}
                {tab === 'utilization' && <UtilizationTab />}
                {tab === 'repeat-cost' && <RepeatCostTab />}
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
