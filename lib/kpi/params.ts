/**
 * Query-string parsing for the KPI section.
 *
 * Each KPI area is its own route, so all four pages need the same period
 * parsing; it lives here rather than in four drifting copies.
 *
 * Query values are user input. Every one is validated before use and falls back
 * to the deck's own period rather than rendering a range nothing stands behind.
 */
import { DECK_PERIOD, isValidPeriod, type Period, type PeriodPresetId } from './period';
import type { KpiId } from './types';

export type KpiSearchParams = { from?: string; to?: string; preset?: string; kpi?: string };

const VALID_PRESETS: readonly string[] = ['last6', 'h1', 'h2', 'custom'];
const VALID_KPIS: readonly string[] = [
  'firstTimeInstall',
  'pmComplete',
  'totalCmCases',
  'firstTimeFix',
  'sla',
];
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

export function resolvePeriod(sp: KpiSearchParams): { period: Period; preset: PeriodPresetId } {
  const requested: Period = { from: sp.from ?? '', to: sp.to ?? '' };
  const valid = MONTH.test(requested.from) && MONTH.test(requested.to) && isValidPeriod(requested);

  return {
    period: valid ? requested : DECK_PERIOD,
    preset: VALID_PRESETS.includes(sp.preset ?? '') ? (sp.preset as PeriodPresetId) : 'h1',
  };
}

/** A single KPI to open in detail, from `?kpi=`; null shows the panel grid. */
export function resolveKpi(sp: KpiSearchParams): KpiId | null {
  return VALID_KPIS.includes(sp.kpi ?? '') ? (sp.kpi as KpiId) : null;
}
