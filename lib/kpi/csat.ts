/**
 * The four CSAT surveys and the pool, in one place.
 *
 * The CSAT page, its detail view and the query parser all need the same list in
 * the same order and the same colours, so it lives here rather than in three
 * copies that drift.
 *
 * Colours are each survey's colour elsewhere in the report — a survey looks the
 * same here as on the CM and PM panels. The pool keeps the deck's orange bar
 * with the KPI's own red as its spine, which is how the panel already reads.
 */
import type { CsatStreamKey } from './api-types';
import { KPI_COLORS } from './fixtures';

/** The pool, or one of the four surveys. What `?survey=` names. */
export type CsatSelection = 'overall' | CsatStreamKey;

export type CsatSurvey = {
  key: CsatSelection;
  labelKey: string;
  /** Bar colour. */
  color: string;
  /** Spine colour on a panel or detail card. */
  accent: string;
};

/** The deck's side-stat order, which the table and the chart row also follow. */
export const CSAT_SURVEYS: readonly CsatSurvey[] = [
  { key: 'installation', labelKey: 'stats.install', color: KPI_COLORS.install, accent: KPI_COLORS.install },
  { key: 'pm', labelKey: 'stats.pm', color: KPI_COLORS.pm, accent: KPI_COLORS.pm },
  { key: 'delivery', labelKey: 'stats.cmDelivery', color: '#6BA6F7', accent: '#6BA6F7' },
  { key: 'cleaning', labelKey: 'stats.cmCleaning', color: '#2563EB', accent: '#2563EB' },
];

export const CSAT_OVERALL: CsatSurvey = {
  key: 'overall',
  labelKey: 'stats.overall',
  color: '#E8A33D',
  accent: KPI_COLORS.csat,
};

export function csatSurvey(key: CsatSelection): CsatSurvey {
  return key === 'overall' ? CSAT_OVERALL : (CSAT_SURVEYS.find((s) => s.key === key) as CsatSurvey);
}
