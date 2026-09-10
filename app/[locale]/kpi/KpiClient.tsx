'use client';

/**
 * Shared shell for the KPI section — one route per area of the RE Team KPI deck,
 * over a selectable reporting period.
 *
 * The areas used to be tabs inside a single page. They are separate routes now,
 * navigated from the KPI group in the sidebar, so each one is linkable on its
 * own and the browser's back button steps between them.
 *
 * The period stays in the URL so a specific view is shareable — the same pattern
 * /reports uses. Sidebar links carry no period, so moving between areas resets
 * to the deck's own range; that costs little today because Utilization and
 * Repeat Cost are deck constants that have no other range to show, and CSAT
 * answers for any range its workbooks cover.
 */
import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { AppSidebar } from '@/components/AppSidebar';
import { AppTopBar } from '@/components/AppTopBar';
import { ReKpiReportTab } from '@/components/kpi/ReKpiReportTab';
import { UtilizationTab } from '@/components/kpi/UtilizationTab';
import { RepeatCostTab } from '@/components/kpi/RepeatCostTab';
import { CsatTab } from '@/components/kpi/CsatTab';
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
import type { KpiId } from '@/lib/kpi/types';

export type KpiSection = 'report' | 'utilization' | 'repeat-cost' | 'csat';

/**
 * Which areas can only answer for the deck's own period.
 *
 * The report is computed from synced tickets and CSAT from the survey
 * workbooks, so both answer for any valid range — an empty one included, which
 * each says plainly. Utilization and Repeat Cost are still deck constants and
 * would be lying if they showed those figures under a heading that named a
 * different range.
 */
const FIXTURE_ONLY: Record<KpiSection, boolean> = {
  report: false,
  utilization: true,
  'repeat-cost': true,
  csat: false,
};

type Props = {
  section: KpiSection;
  initialPeriod?: Period;
  initialPreset?: PeriodPresetId;
  /** A single KPI to open in detail, from `?kpi=`; report section only. */
  initialKpi?: KpiId | null;
};

export function KpiClient({
  section,
  initialPeriod = DECK_PERIOD,
  initialPreset = 'h1',
  initialKpi = null,
}: Props) {
  const t = useTranslations('kpi');
  const locale = useLocale();

  const [preset, setPreset] = useState<PeriodPresetId>(initialPreset);
  const [year, setYear] = useState<number>(Number(initialPeriod.from.slice(0, 4)));
  const [period, setPeriod] = useState<Period>(initialPeriod);
  const [selectedKpi, setSelectedKpi] = useState<KpiId | null>(initialKpi);

  const syncUrl = (nextPeriod: Period, nextPreset: PeriodPresetId, nextKpi: KpiId | null) => {
    const params = new URLSearchParams({
      from: nextPeriod.from,
      to: nextPeriod.to,
      preset: nextPreset,
    });
    if (nextKpi) params.set('kpi', nextKpi);
    window.history.replaceState(null, '', `?${params}`);
  };

  const changePeriod = (next: { preset: PeriodPresetId; year: number; period: Period }) => {
    setPreset(next.preset);
    setYear(next.year);
    setPeriod(next.period);
    syncUrl(next.period, next.preset, selectedKpi);
  };

  const selectKpi = (next: KpiId | null) => {
    setSelectedKpi(next);
    syncUrl(period, preset, next);
  };

  const resetToDeckPeriod = () => changePeriod({ preset: 'h1', year: 2026, period: DECK_PERIOD });

  const rangeUsable = isValidPeriod(period);
  const gated = FIXTURE_ONLY[section]
    ? !(rangeUsable && hasPlaceholderData(period))
    : !rangeUsable;

  return (
    <main className="min-h-dvh bg-[var(--app-bg)] text-[var(--app-text)] transition-colors">
      <div className="flex min-h-dvh">
        <AppSidebar />
        <section className="flex min-w-0 flex-1 flex-col">
          <AppTopBar
            eyebrow={t('eyebrow')}
            title={t(`sectionTitles.${section === 'repeat-cost' ? 'repeatCost' : section}`)}
            searchPlaceholder={t('searchPlaceholder')}
          />

          <div className="mx-auto w-full max-w-[1600px] space-y-4 p-4 sm:p-6">
            <div className="flex flex-wrap items-end justify-end gap-3 border-b border-[var(--app-border)] pb-2 print:hidden">
              <PeriodSelector preset={preset} year={year} period={period} onChange={changePeriod} />
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
                {section === 'report' && (
                  <ReKpiReportTab period={period} selectedKpi={selectedKpi} onSelectKpi={selectKpi} />
                )}
                {section === 'utilization' && <UtilizationTab />}
                {section === 'repeat-cost' && <RepeatCostTab />}
                {section === 'csat' && <CsatTab period={period} />}
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
