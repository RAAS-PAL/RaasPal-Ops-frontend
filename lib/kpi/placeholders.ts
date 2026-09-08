/**
 * The two KPIs the backend cannot source — PM Complete and CSAT Top Box —
 * scaffolded into the live report in the deck's positions (tile 2 and 6,
 * panel 2 and 6).
 *
 * They are never computed. For the deck's own period the deck figures are
 * shown, badged as placeholders so a board reader cannot mistake them for the
 * four live tiles beside them. For any other period there is nothing honest to
 * show, so the tile reads "—" and the panel says what it is waiting for.
 *
 * When a source lands (PM from the PM boards once the visits-due rule is known;
 * CSAT from the survey export) the entry here is deleted and the live mapper
 * takes over — nothing in the tab needs to change.
 */
import { RE_KPI_REPORT_JAN_JUN_2026 } from './fixtures';
import { DECK_PERIOD, samePeriod, type Period } from './period';
import type { KpiHeadline, KpiId, KpiPanelData } from './types';

export const PLACEHOLDER_KPIS: readonly KpiId[] = ['pmComplete', 'csat'];

export type PlaceholderKpi = {
  headline: KpiHeadline;
  panel: KpiPanelData;
  /** True when the deck figures are being shown; false when only the frame is. */
  hasDeckFigures: boolean;
};

export function placeholderKpis(period: Period): PlaceholderKpi[] {
  const deck = RE_KPI_REPORT_JAN_JUN_2026;
  const showFigures = samePeriod(period, DECK_PERIOD);

  return PLACEHOLDER_KPIS.map((id) => {
    const headline = deck.headlines.find((h) => h.id === id);
    const panel = deck.panels.find((p) => p.id === id);
    if (!headline || !panel) {
      throw new Error(`Deck fixture has no ${id}`);
    }
    return {
      hasDeckFigures: showFigures,
      headline: showFigures ? headline : { ...headline, value: '—', detail: '' },
      panel,
    };
  });
}
