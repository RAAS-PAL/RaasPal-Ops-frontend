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
import { DECK_PERIOD, monthLabels, samePeriod, type Period } from './period';
import type { KpiHeadline, KpiId, KpiPanelData, Translate } from './types';

export const PLACEHOLDER_KPIS: readonly KpiId[] = ['pmComplete', 'csat'];

export type PlaceholderKpi = {
  headline: KpiHeadline;
  panel: KpiPanelData;
  /** True when the deck figures are being shown; false when only the frame is. */
  hasDeckFigures: boolean;
};

/**
 * The deck's own supporting text for these two tiles is English in the fixture,
 * so it is replaced here with a localised string rather than shown raw.
 */
const DETAIL_KEY: Record<string, string> = {
  pmComplete: 'placeholderDetail.pm',
  csat: 'placeholderDetail.csat',
};
const FOOTNOTE_KEY: Record<string, string> = { pmComplete: 'placeholderFootnote.pm' };

export function placeholderKpis(period: Period, t: Translate, locale: string): PlaceholderKpi[] {
  const deck = RE_KPI_REPORT_JAN_JUN_2026;
  const showFigures = samePeriod(period, DECK_PERIOD);
  // The fixture hard-codes English month labels and an "Avg …" caption, because
  // it is a transcription of the deck. Both are re-rendered in the viewer's
  // language here so a placeholder panel does not sit in an otherwise Thai page
  // with an English axis.
  const labels = monthLabels(DECK_PERIOD, locale);

  return PLACEHOLDER_KPIS.map((id) => {
    const headline = deck.headlines.find((h) => h.id === id);
    const panel = deck.panels.find((p) => p.id === id);
    if (!headline || !panel) {
      throw new Error(`Deck fixture has no ${id}`);
    }
    const localisedDetail = DETAIL_KEY[id] ? t(DETAIL_KEY[id]) : headline.detail;
    const footnoteKey = FOOTNOTE_KEY[id];
    const chart: KpiPanelData['chart'] = {
      ...panel.chart,
      series: panel.chart.series.map((sr) => ({
        ...sr,
        points: sr.points.map((pt, i) => ({ ...pt, month: labels[i] ?? pt.month })),
      })),
      ...(panel.chart.average && {
        average: {
          ...panel.chart.average,
          display: t('chart.avgValue', { value: `${panel.chart.average.value}%` }),
        },
      }),
      ...(footnoteKey && { footnote: t(footnoteKey) }),
    };
    return {
      hasDeckFigures: showFigures,
      headline: showFigures
        ? { ...headline, detail: localisedDetail }
        : { ...headline, value: '—', detail: '' },
      panel: { ...panel, chart },
    };
  });
}
