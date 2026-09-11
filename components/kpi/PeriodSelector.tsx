'use client';

/**
 * Reporting-period control for the KPI section.
 *
 * Presets cover how the team actually reports — a rolling six months, or a
 * named half-year, which is what the source deck is. Custom exposes the same
 * month pair directly for anything else.
 *
 * Native <select> and <input type="month"> are used rather than a custom popover:
 * they are keyboard- and screen-reader-correct for free, and localise their own
 * month names, which matters in a bilingual app.
 */
import { useTranslations } from 'next-intl';
import { CalendarRange } from 'lucide-react';
import {
  type Period,
  type PeriodPresetId,
  isValidPeriod,
  presetPeriod,
  selectableYears,
} from '@/lib/kpi/period';

type Props = {
  preset: PeriodPresetId;
  year: number;
  period: Period;
  onChange: (next: { preset: PeriodPresetId; year: number; period: Period }) => void;
};

const FIELD =
  'rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)] px-2 py-1.5 text-xs text-[var(--app-text)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-brand)]';

export function PeriodSelector({ preset, year, period, onChange }: Props) {
  const t = useTranslations('kpi.period');
  const years = selectableYears();
  const invalid = !isValidPeriod(period);

  const selectPreset = (next: PeriodPresetId) => {
    // Custom starts from whatever is on screen, so switching to it never jumps.
    if (next === 'custom') return onChange({ preset: next, year, period });
    onChange({ preset: next, year, period: presetPeriod(next, year) });
  };

  const selectYear = (nextYear: number) => {
    const nextPeriod = preset === 'custom' ? period : presetPeriod(preset, nextYear);
    onChange({ preset, year: nextYear, period: nextPeriod });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <CalendarRange aria-hidden className="h-4 w-4 text-[var(--app-muted)]" />

      <label className="sr-only" htmlFor="kpi-period-preset">
        {t('label')}
      </label>
      <select
        id="kpi-period-preset"
        className={FIELD}
        value={preset}
        onChange={(e) => selectPreset(e.target.value as PeriodPresetId)}
      >
        <option value="last6">{t('presets.last6')}</option>
        <option value="h1">{t('presets.h1')}</option>
        <option value="h2">{t('presets.h2')}</option>
        <option value="custom">{t('presets.custom')}</option>
      </select>

      {/* Year only applies to the half-year presets. */}
      {(preset === 'h1' || preset === 'h2') && (
        <>
          <label className="sr-only" htmlFor="kpi-period-year">
            {t('year')}
          </label>
          <select
            id="kpi-period-year"
            className={FIELD}
            value={year}
            onChange={(e) => selectYear(Number(e.target.value))}
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </>
      )}

      {preset === 'custom' && (
        <div className="flex flex-wrap items-center gap-1.5">
          <label className="sr-only" htmlFor="kpi-period-from">
            {t('from')}
          </label>
          <input
            id="kpi-period-from"
            type="month"
            className={FIELD}
            value={period.from}
            onChange={(e) =>
              onChange({ preset, year, period: { ...period, from: e.target.value } })
            }
          />
          <span className="text-xs text-[var(--app-muted)]">–</span>
          <label className="sr-only" htmlFor="kpi-period-to">
            {t('to')}
          </label>
          <input
            id="kpi-period-to"
            type="month"
            className={FIELD}
            value={period.to}
            onChange={(e) => onChange({ preset, year, period: { ...period, to: e.target.value } })}
          />
        </div>
      )}

      {invalid && (
        <p role="alert" className="text-xs font-medium text-[var(--app-brand-dark)]">
          {t('invalidRange')}
        </p>
      )}
    </div>
  );
}
