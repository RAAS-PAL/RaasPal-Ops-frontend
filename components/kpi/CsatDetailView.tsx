'use client';

/**
 * One survey's Top Box on its own: the chart at full width, then where the
 * number came from, the counts behind it, and a month-by-month table.
 *
 * The point of the view is the provenance, because CSAT has two kinds of
 * figure and they are not the same claim. One survey in one month has a Top Box
 * cell on its own sheet, and that cell is what the page shows — read, not
 * recomputed. Anything wider (a period, or the four surveys pooled) exists on
 * no sheet, so it is combined here the way the deck combines it: every rating
 * of 5 over every rating given. This view says which of the two a reader is
 * looking at, and shows the arithmetic when there is any.
 *
 * It also states what the alternative would have given. Averaging the monthly
 * cells is the obvious thing to try and it is wrong here — it lets a month with
 * one respondent count as much as one with ninety — so the number it produces
 * is named rather than left for someone to recompute and wonder about.
 */
import { useLocale, useTranslations } from 'next-intl';
import { ArrowLeft, Calculator, FileSpreadsheet, ListChecks } from 'lucide-react';
import type { CsatBucket, KpiCsat } from '@/lib/kpi/api-types';
import { csatSurvey, CSAT_SURVEYS, type CsatSelection } from '@/lib/kpi/csat';
import { dateLocale } from '@/lib/kpi/period';
import { KpiBarChart } from './KpiBarChart';

type Props = {
  selection: CsatSelection;
  data: KpiCsat;
  onBack: () => void;
};

/** The formula the RE team's sheets carry, shown verbatim — not translated. */
const SHEET_FORMULA = '=AVERAGE(Q10:Q14)';

const card = 'rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-4 shadow-sm';
const cardTitle = 'mb-3 flex items-center gap-2 text-sm font-bold text-[var(--app-text)]';

const pct = (value: number | null): string => (value === null ? '—' : `${value.toFixed(1)}%`);

function monthLabel(month: string, locale: string, long = false): string {
  const [year, m] = month.split('-').map(Number);
  return new Intl.DateTimeFormat(
    dateLocale(locale),
    long ? { month: 'long', year: 'numeric' } : { month: 'short' },
  ).format(new Date(Date.UTC(year, m - 1, 1)));
}

function Operand({ value, label, color }: { value: string; label: string; color?: string }) {
  return (
    <div className="min-w-[88px] flex-1 text-center">
      <p
        className="text-2xl font-bold leading-none tabular-nums text-[var(--app-text)]"
        style={color ? { color } : undefined}
      >
        {value}
      </p>
      <p className="mt-1 text-[10px] leading-tight text-[var(--app-muted)]">{label}</p>
    </div>
  );
}

/** One tree of counts whose rows add up to the total beside its title. */
function Tree({
  title,
  total,
  unit,
  rows,
}: {
  title: string;
  total: number;
  unit: string;
  rows: { label: string; value: number; tone?: string }[];
}) {
  return (
    <div>
      <div className="mb-0.5 flex items-baseline justify-between gap-3 border-b border-[var(--app-border)] pb-1">
        <p className="text-xs font-semibold text-[var(--app-text)]">{title}</p>
        <p className="shrink-0 text-xs tabular-nums text-[var(--app-muted)]">
          <span className="font-semibold text-[var(--app-text)]">{total.toLocaleString()}</span> {unit}
        </p>
      </div>
      <dl className="text-xs">
        {rows.map((r) => (
          <div key={r.label} className="flex items-baseline justify-between gap-3 py-1">
            <dt className="flex items-center gap-1.5 font-medium text-[var(--app-text)]">
              {r.tone && <span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ background: r.tone }} />}
              {r.label}
            </dt>
            <dd className="shrink-0 text-sm font-semibold tabular-nums text-[var(--app-text)]">
              {r.value.toLocaleString()}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function CsatDetailView({ selection, data, onBack }: Props) {
  const t = useTranslations('kpi');
  const locale = useLocale();

  const survey = csatSurvey(selection);
  /** Short labels ("Install") head the columns; a title gets the survey's full name. */
  const label = t(survey.labelKey);
  const title = selection === 'overall' ? label : t(`csat.stream.${selection}`);
  const total: CsatBucket = data.totals[selection];
  const months = data.months;
  /**
   * The pool's monthly bars are themselves pooled — four surveys each — so they
   * are not sheet cells and must not be described as any.
   */
  const pooledBars = selection === 'overall';
  /** Months with a figure at all; the rest have nothing to average. */
  const answered = months.filter((m) => m[selection].surveyed && m[selection].topBoxRate !== null);
  const monthAverage =
    answered.length === 0
      ? null
      : answered.reduce((sum, m) => sum + (m[selection].topBoxRate as number), 0) / answered.length;

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)] px-3 py-1.5 text-xs font-semibold text-[var(--app-text)] transition hover:border-[var(--app-brand)] hover:text-[var(--app-brand-dark)]"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {t('csat.detail.back')}
      </button>

      {/* Title + the figure this whole view explains */}
      <section className="flex overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] shadow-sm">
        <div aria-hidden className="w-2 shrink-0" style={{ background: survey.accent }} />
        <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-4 p-4">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-[var(--app-text)]">
              {t('csat.detail.title', { survey: title })}
            </h2>
            <p className="mt-0.5 text-xs text-[var(--app-muted)]">
              {total.surveyed
                ? t('csat.footnote', {
                    responses: total.responses.toLocaleString(),
                    customers: total.customers.toLocaleString(),
                    rate: pct(total.responseRate),
                  })
                : t('csat.detail.notSurveyedBody')}
            </p>
          </div>
          <div
            className="rounded-xl px-5 py-2.5 text-center text-white shadow-sm"
            style={{ background: survey.accent }}
          >
            <p className="text-3xl font-bold leading-none tracking-tight">{pct(total.topBoxRate)}</p>
          </div>
        </div>
      </section>

      {/* The months, at full width */}
      <section className={card}>
        <div className="flex min-w-0 flex-col gap-4 lg:flex-row">
          <div className="flex min-w-0 flex-1">
            <KpiBarChart
              average={
                total.topBoxRate === null
                  ? undefined
                  : { value: total.topBoxRate, display: t('chart.avgValue', { value: pct(total.topBoxRate) }) }
              }
              heightClass="min-h-[300px]"
              mode="single"
              series={[
                {
                  key: selection,
                  label,
                  color: survey.color,
                  points: months.map((m) => ({
                    month: monthLabel(m.month, locale),
                    value: m[selection].topBoxRate,
                  })),
                },
              ]}
              showLegend={false}
              showValueLabels
              unit="percent"
            />
          </div>
          <div className="grid shrink-0 grid-cols-2 gap-1.5 sm:grid-cols-3 lg:flex lg:w-[128px] lg:flex-col">
            {selection === 'overall'
              ? CSAT_SURVEYS.map((s) => (
                  <Stat
                    key={s.key}
                    detail={
                      data.totals[s.key].surveyed
                        ? t('csat.nResponses', { n: data.totals[s.key].responses.toLocaleString() })
                        : t('csat.notSurveyed')
                    }
                    label={t(s.labelKey)}
                    value={pct(data.totals[s.key].topBoxRate)}
                  />
                ))
              : [
                  <Stat
                    key="responses"
                    label={t('csat.detail.stat.responses')}
                    value={total.responses.toLocaleString()}
                  />,
                  <Stat
                    key="contacted"
                    label={t('csat.detail.stat.contacted')}
                    value={total.customers.toLocaleString()}
                  />,
                  <Stat
                    key="rate"
                    label={t('csat.detail.stat.responseRate')}
                    value={pct(total.responseRate)}
                  />,
                ]}
          </div>
        </div>
      </section>

      {total.surveyed && (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {/* Where the figure came from */}
          <section className={card}>
            <h3 className={cardTitle}>
              <Calculator className="h-4 w-4 text-[var(--app-muted)]" />
              {t('detail.howCalculated')}
            </h3>

            {total.topBoxFromSheet ? (
              <div className="flex items-start gap-2 rounded-lg border border-[var(--app-border)] bg-[var(--app-panel-soft)] px-3 py-3">
                <FileSpreadsheet className="mt-0.5 h-4 w-4 shrink-0 text-[var(--app-muted)]" />
                <div className="min-w-0 text-xs leading-relaxed">
                  <p className="font-semibold text-[var(--app-text)]">{t('csat.detail.fromSheetTitle')}</p>
                  <p className="mt-0.5 text-[var(--app-muted)]">{t('csat.detail.fromSheetBody')}</p>
                  <code className="mt-1.5 inline-block rounded bg-[var(--app-panel)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--app-text)]">
                    {SHEET_FORMULA}
                  </code>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--app-border)] bg-[var(--app-panel-soft)] px-3 py-3">
                <Operand label={t('csat.detail.num.fives')} value={total.fives.toLocaleString()} />
                <span className="text-xl font-semibold text-[var(--app-muted)]">÷</span>
                <Operand label={t('csat.detail.den.ratings')} value={total.ratings.toLocaleString()} />
                <span className="text-xl font-semibold text-[var(--app-muted)]">=</span>
                <Operand color={survey.accent} label={t('csat.detail.topBox')} value={pct(total.topBoxRate)} />
              </div>
            )}

            <div className="mt-3 space-y-3 text-xs leading-relaxed">
              <div>
                <p className="mb-1 font-semibold text-[var(--app-text)]">{t('detail.formula')}</p>
                <p className="text-[var(--app-muted)]">
                  {total.topBoxFromSheet ? t('csat.detail.formulaSheet') : t('csat.detail.formulaPooled')}
                </p>
              </div>

              {/* What the bars themselves are, which differs for the pool: a
                  survey's bars are sheet cells, the pool's are pooled months. */}
              <p className="text-[var(--app-muted)]">
                {t(pooledBars ? 'csat.detail.barsNoteOverall' : 'csat.detail.barsNote')}
              </p>

              {!total.topBoxFromSheet && monthAverage !== null && answered.length > 1 && (
                <p className="rounded-lg border border-dashed border-[var(--app-border-strong)] px-3 py-2 text-[var(--app-muted)]">
                  {t(pooledBars ? 'csat.detail.avgNoteOverall' : 'csat.detail.avgNote', {
                    months: answered.length,
                    value: pct(Math.round(monthAverage * 10) / 10),
                  })}
                </p>
              )}
            </div>
          </section>

          {/* The counts behind it */}
          <section className={card}>
            <h3 className={cardTitle}>
              <ListChecks className="h-4 w-4 text-[var(--app-muted)]" />
              {t('detail.breakdown')}
            </h3>
            <div className="space-y-4">
              <Tree
                rows={[
                  { label: t('csat.detail.row.responded'), value: total.responses, tone: '#2FA36B' },
                  { label: t('csat.detail.row.noAnswer'), value: total.notEvaluated, tone: '#9CA3AF' },
                ]}
                title={t('csat.detail.bd.contacted')}
                total={total.customers}
                unit={t('csat.detail.unit.customers')}
              />
              <Tree
                rows={[
                  { label: t('csat.detail.row.fives'), value: total.fives, tone: '#2FA36B' },
                  { label: t('csat.detail.row.lower'), value: total.ratings - total.fives, tone: '#9CA3AF' },
                ]}
                title={t('csat.detail.bd.ratings')}
                total={total.ratings}
                unit={t('csat.detail.unit.ratings')}
              />
              <p className="border-t border-[var(--app-border)] pt-2 text-[11px] text-[var(--app-muted)]">
                {t('csat.detail.ratingsNote')}
              </p>
            </div>
          </section>
        </div>
      )}

      {/* Month by month, with each figure's provenance */}
      <section className={card}>
        <h3 className={cardTitle}>{t('detail.monthly')}</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--app-border)] text-[var(--app-muted)]">
                <th className="px-2 py-2 text-left font-medium">{t('detail.colMonth')}</th>
                <th className="px-2 py-2 text-right font-medium">{t('csat.detail.topBox')}</th>
                <th className="px-2 py-2 text-left font-medium">{t('csat.detail.table.readFrom')}</th>
                <th className="px-2 py-2 text-right font-medium">{t('csat.detail.table.fives')}</th>
                <th className="px-2 py-2 text-right font-medium">{t('csat.detail.stat.responses')}</th>
                <th className="px-2 py-2 text-right font-medium">{t('csat.detail.stat.contacted')}</th>
                <th className="px-2 py-2 text-right font-medium">{t('csat.detail.stat.responseRate')}</th>
              </tr>
            </thead>
            <tbody>
              {months.map((m) => {
                const b = m[selection];
                return (
                  <tr key={m.month} className="border-b border-[var(--app-border)] last:border-0">
                    <td className="whitespace-nowrap px-2 py-2 text-[var(--app-text)]">
                      {monthLabel(m.month, locale, true)}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 text-right font-semibold tabular-nums text-[var(--app-text)]">
                      {pct(b.topBoxRate)}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 text-[var(--app-muted)]">
                      {b.surveyed
                        ? t(b.topBoxFromSheet ? 'csat.detail.table.sheet' : 'csat.detail.table.pooled')
                        : '—'}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums text-[var(--app-muted)]">
                      {b.surveyed ? `${b.fives.toLocaleString()} / ${b.ratings.toLocaleString()}` : '—'}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums text-[var(--app-text)]">
                      {b.surveyed ? b.responses.toLocaleString() : '—'}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums text-[var(--app-muted)]">
                      {b.surveyed ? b.customers.toLocaleString() : '—'}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums text-[var(--app-muted)]">
                      {pct(b.responseRate)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[var(--app-border-strong)] font-semibold text-[var(--app-text)]">
                <td className="whitespace-nowrap px-2 py-2">{t('csat.table.total')}</td>
                <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums">{pct(total.topBoxRate)}</td>
                <td className="whitespace-nowrap px-2 py-2 font-normal text-[var(--app-muted)]">
                  {total.surveyed
                    ? t(total.topBoxFromSheet ? 'csat.detail.table.sheet' : 'csat.detail.table.pooled')
                    : '—'}
                </td>
                <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums">
                  {total.surveyed ? `${total.fives.toLocaleString()} / ${total.ratings.toLocaleString()}` : '—'}
                </td>
                <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums">
                  {total.responses.toLocaleString()}
                </td>
                <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums">
                  {total.customers.toLocaleString()}
                </td>
                <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums">{pct(total.responseRate)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </div>
  );
}

/** One grey figure beside the chart, in the report's own style. */
function Stat({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-lg border border-[var(--app-border)] bg-[var(--app-panel-soft)] px-2 py-1.5 text-center">
      <p className="truncate text-[10px] text-[var(--app-muted)]">{label}</p>
      <p className="text-base font-bold text-[var(--app-text)]">{value}</p>
      {detail && <p className="text-[10px] text-[var(--app-muted)]">{detail}</p>}
    </div>
  );
}
