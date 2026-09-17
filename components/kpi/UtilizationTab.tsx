'use client';

/**
 * Utilization & productivity (deck slide 3).
 *
 * The headline metrics are real deck values. The three analysis sections are
 * charts whose numbers are not in the deck's text layer, so they render an
 * explicit empty state naming what is needed rather than showing invented data.
 */
import { useTranslations } from 'next-intl';
import { Info, BarChart3 } from 'lucide-react';
import { RE_UTILIZATION_JAN_JUN_2026 } from '@/lib/kpi/utilization-fixtures';

export function UtilizationTab() {
  const t = useTranslations('kpi');
  const report = RE_UTILIZATION_JAN_JUN_2026;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-lg border border-dashed border-[var(--app-border-strong)] bg-[var(--app-panel-soft)] px-3 py-2">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--app-muted)]" />
        <p className="text-xs text-[var(--app-muted)]">{t('placeholderNotice')}</p>
      </div>

      {/* Headline metrics */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-6">
        {report.metrics.map((m) => (
          <div
            key={m.key}
            className="rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-3 shadow-sm"
          >
            <div className="flex items-center gap-1.5">
              <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: m.color }} />
              <p className="truncate text-[11px] font-medium text-[var(--app-muted)]">{t(m.labelKey)}</p>
            </div>
            <p className="mt-1.5 text-2xl font-bold leading-none text-[var(--app-text)]">{m.value}</p>
            <p className="mt-1 text-[10px] leading-tight text-[var(--app-muted)]">{t(m.detailKey)}</p>
          </div>
        ))}
      </div>

      {/* Analysis sections — awaiting source data */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {report.sections.map((section, i) => (
          <section
            key={section.key}
            className="rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-4 shadow-sm"
          >
            <h3 className="mb-3 text-sm font-bold text-[var(--app-text)]">
              <span className="mr-1.5 text-[var(--app-muted)]">{i + 1}</span>
              {t(section.titleKey)}
            </h3>
            <div className="flex min-h-[170px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--app-border-strong)] bg-[var(--app-panel-soft)] p-4 text-center">
              <BarChart3 className="h-5 w-5 text-[var(--app-muted)]" />
              <p className="text-xs text-[var(--app-muted)]">{t('utilization.awaitingSource')}</p>
            </div>
          </section>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {/* MD conversion factors */}
        <section className="rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-4 shadow-sm">
          <h3 className="mb-2 text-sm font-bold text-[var(--app-text)]">{t('utilization.factorsTitle')}</h3>
          <ul className="space-y-1">
            {report.factorKeys.map((key) => (
              <li key={key} className="text-xs leading-relaxed text-[var(--app-muted)]">
                {t(key)}
              </li>
            ))}
          </ul>
        </section>

        {/* Executive actions */}
        <section className="rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-4 shadow-sm">
          <h3 className="mb-2 text-sm font-bold text-[var(--app-text)]">{t('utilization.actionsTitle')}</h3>
          <ul className="space-y-1.5">
            {report.actionKeys.map((key) => (
              <li key={key} className="flex gap-2 text-xs leading-relaxed text-[var(--app-muted)]">
                <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--app-brand)]" />
                {t(key)}
              </li>
            ))}
          </ul>
          <p className="mt-3 rounded-lg bg-[var(--app-panel-soft)] p-2.5 text-[11px] leading-relaxed text-[var(--app-muted)]">
            {t('utilization.boardView')}
          </p>
        </section>
      </div>
    </div>
  );
}
