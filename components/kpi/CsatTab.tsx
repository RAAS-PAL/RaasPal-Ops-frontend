'use client';

/**
 * Customer satisfaction — the deck's KPI 6, on a page of its own.
 *
 * CSAT is the one KPI with no monday source. It comes from the post-job phone
 * survey, which the RE team tallies by hand into four workbooks — installation,
 * PM, CM cleaning, CM delivery — and replaces once a month. The backend reads
 * those workbooks as they are (`GET /api/v1/kpi/csat`), so this page is not
 * live: it moves when the files do, and says so up front with the month the
 * figures run to.
 *
 * That is also why CSAT is not on the RE report page. That page is for figures
 * computed from synced tickets, and a monthly hand tally beside them would read
 * as the same kind of number. It is not, and the separation is the point.
 *
 * Top Box — the deck's CSAT — is read from each month sheet exactly as the RE
 * team wrote it. This page reads and shows; it does not correct. The overall
 * figure and the period totals weight each month by its responses, which is
 * how the deck reaches its headline. Top Box is the only satisfaction figure
 * here: the workbooks also carry a mean score, but a board reading two similar
 * percentages side by side reads neither, and Top Box is the one the deck
 * headlines. Warnings cover only what could not be read — a sheet with no Top
 * Box cell, a file whose survey could not be told.
 *
 * Clicking the overall panel or any of the four survey charts opens that survey
 * alone (CsatDetailView), where the figure's provenance is the subject: a sheet
 * cell read as it is, or a pooled total with its arithmetic. The selection lives
 * in the URL (`?survey=`) so one survey can be linked to, the same way the
 * report page links to a single KPI.
 */
import { useLocale, useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ChevronRight, FileSpreadsheet, Info, Loader2, RefreshCw } from 'lucide-react';
import { kpiApi } from '@/lib/api';
import type { CsatBucket, KpiCsat } from '@/lib/kpi/api-types';
import { CSAT_OVERALL, CSAT_SURVEYS, type CsatSelection } from '@/lib/kpi/csat';
import { KPI_COLORS } from '@/lib/kpi/fixtures';
import { dateLocale, type Period } from '@/lib/kpi/period';
import { CsatDetailView } from './CsatDetailView';
import { KpiHeadlineTile } from './KpiHeadlineTile';
import { KpiBarChart, type ChartPoint } from './KpiBarChart';
import { KpiPanel } from './KpiPanel';

const pct = (value: number | null): string => (value === null ? '—' : `${value.toFixed(1)}%`);

/** '2026-01' → 'Jan', or 'January 2026', in the viewer's locale. */
function monthLabel(month: string, locale: string, long = false): string {
  const [year, m] = month.split('-').map(Number);
  return new Intl.DateTimeFormat(
    dateLocale(locale),
    long ? { month: 'long', year: 'numeric' } : { month: 'short' },
  ).format(new Date(Date.UTC(year, m - 1, 1)));
}

/** The backend's own message ("set KPI_CSAT_FOLDER …") says more than axios's status line does. */
function errorMessage(error: unknown, fallback: string): string {
  const message = (error as { response?: { data?: { message?: string } } } | null)?.response?.data?.message;
  if (message) return message;
  return error instanceof Error ? error.message : fallback;
}

/** The months the workbooks run over, from the earliest first sheet to the latest last. */
function coverage(data: KpiCsat): { first: string; last: string } | null {
  const firsts = data.sourceFiles.map((f) => f.firstMonth).filter((m): m is string => Boolean(m));
  const lasts = data.sourceFiles.map((f) => f.lastMonth).filter((m): m is string => Boolean(m));
  if (firsts.length === 0 || lasts.length === 0) return null;
  return { first: firsts.sort()[0], last: lasts.sort().at(-1) as string };
}

type Props = {
  period: Period;
  /** Which survey to open on its own; null shows the charts. Lives in `?survey=`. */
  selectedSurvey: CsatSelection | null;
  onSelectSurvey: (next: CsatSelection | null) => void;
};

export function CsatTab({ period, selectedSurvey, onSelectSurvey }: Props) {
  const t = useTranslations('kpi');
  const locale = useLocale();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['kpi', 'csat', period.from, period.to],
    queryFn: async () => (await kpiApi.csat(period.from, period.to)).data.data,
  });
  const reload = useMutation({
    mutationFn: async () => (await kpiApi.reloadCsat()).data.data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['kpi', 'csat'] }),
  });

  if (query.isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)] py-16 text-sm text-[var(--app-muted)]">
        <Loader2 className="h-4 w-4 animate-spin" />
        {t('csat.loading')}
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)] px-4 py-5 text-sm">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#DC2F2F]" />
        <div>
          <p className="font-medium text-[var(--app-text)]">{t('live.errorTitle')}</p>
          <p className="mt-1 text-xs text-[var(--app-muted)]">{errorMessage(query.error, t('live.errorBody'))}</p>
        </div>
      </div>
    );
  }

  const data = query.data;
  const { months, totals } = data;

  // One survey on its own: where its Top Box came from and the counts behind it.
  if (selectedSurvey) {
    return <CsatDetailView data={data} onBack={() => onSelectSurvey(null)} selection={selectedSurvey} />;
  }

  const surveyed = months.some((m) => m.overall.surveyed);
  const covered = coverage(data);
  const dateFmt = new Intl.DateTimeFormat(dateLocale(locale), { dateStyle: 'medium' });

  const sideStat = (labelKey: string, bucket: CsatBucket, emphasis = false) => ({
    labelKey,
    label: t(labelKey),
    value: pct(bucket.topBoxRate),
    detail: bucket.surveyed ? t('csat.nResponses', { n: bucket.responses.toLocaleString() }) : t('csat.notSurveyed'),
    emphasis,
  });

  return (
    <div className="space-y-4">
      {/* What this is and how fresh it is — before any number. */}
      <div className="flex items-start gap-2 rounded-lg border border-dashed border-[var(--app-border-strong)] bg-[var(--app-panel-soft)] px-3 py-2">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--app-muted)]" />
        <div className="text-xs leading-relaxed text-[var(--app-muted)]">
          <p>{t('csat.notice')}</p>
          <p className="mt-1">
            {data.asOf && (
              <span className="font-semibold text-[var(--app-text)]">
                {t('csat.asOf', { month: monthLabel(data.asOf, locale, true) })}{' '}
              </span>
            )}
            {data.provisional && t('live.provisionalNotice')}
          </p>
          <p className="mt-1">{t('csat.detail.hint')}</p>
        </div>
      </div>

      {data.warnings.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-[#E8A33D]/50 bg-[#E8A33D]/10 px-3 py-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#B4701A]" />
          <div className="min-w-0 text-xs leading-relaxed">
            <p className="font-semibold text-[var(--app-text)]">{t('csat.warningsTitle')}</p>
            <p className="text-[var(--app-muted)]">{t('csat.warningsBody')}</p>
            <ul className="mt-1.5 space-y-1 text-[var(--app-muted)]">
              {data.warnings.map((w) => (
                <li key={w} className="break-words">
                  {w}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {!surveyed && (
        <div className="rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)] px-4 py-6 text-center">
          <p className="text-sm font-medium text-[var(--app-text)]">{t('csat.noDataTitle')}</p>
          <p className="mt-1 text-xs text-[var(--app-muted)]">
            {covered
              ? t('csat.noDataBody', {
                  first: monthLabel(covered.first, locale, true),
                  last: monthLabel(covered.last, locale, true),
                })
              : t('csat.noDataBodyNoFiles')}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
        {/* self-start, or the cards stretch to the chart panel beside them. */}
        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-1 lg:self-start">
          {surveyed && (
            <KpiHeadlineTile
              color={KPI_COLORS.csat}
              detail={t('csat.headlineDetail', { response: pct(totals.overall.responseRate) })}
              label={t('kpis.csat')}
              value={pct(totals.overall.topBoxRate)}
            />
          )}

          {/* The workbooks behind the figures, and a way to re-read them after a drop. */}
          <div className="col-span-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-3 shadow-sm lg:col-span-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-medium text-[var(--app-muted)]">{t('csat.sourceLabel')}</p>
              <button
                className="flex items-center gap-1 rounded-md border border-[var(--app-border)] px-2 py-1 text-[10px] font-medium text-[var(--app-muted)] transition hover:bg-[var(--app-panel-soft)] hover:text-[var(--app-text)] disabled:opacity-50"
                disabled={reload.isPending}
                onClick={() => reload.mutate()}
                type="button"
              >
                <RefreshCw className={`h-3 w-3 ${reload.isPending ? 'animate-spin' : ''}`} />
                {reload.isPending ? t('csat.reloading') : t('csat.reload')}
              </button>
            </div>
            {reload.isSuccess && <p className="mt-1 text-[10px] text-[#2FA36B]">{t('csat.reloaded')}</p>}
            {reload.isError && (
              <p className="mt-1 text-[10px] text-[#DC2F2F]">{errorMessage(reload.error, t('csat.reloadFailed'))}</p>
            )}
            <ul className="mt-2 space-y-2">
              {data.sourceFiles.map((f) => (
                <li key={f.name} className="flex gap-2">
                  <FileSpreadsheet className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--app-muted)]" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold leading-tight text-[var(--app-text)]">
                      {f.stream ? t(`csat.stream.${f.stream}`) : t('csat.unknownSurvey')}
                      {f.firstMonth && f.lastMonth && (
                        <span className="ml-1.5 font-normal text-[var(--app-muted)]">
                          {t('csat.covers', {
                            first: monthLabel(f.firstMonth, locale),
                            last: monthLabel(f.lastMonth, locale, true),
                          })}
                        </span>
                      )}
                    </p>
                    <p className="truncate text-[10px] leading-tight text-[var(--app-muted)]" title={f.name}>
                      {f.name}
                    </p>
                    <p className="text-[10px] leading-tight text-[var(--app-muted)]">
                      {t('csat.updated', { date: dateFmt.format(new Date(f.lastModified)) })}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {surveyed && (
          <KpiPanel
            accent={KPI_COLORS.csat}
            chart={{
              mode: 'single',
              unit: 'percent',
              showValueLabels: true,
              series: [
                {
                  key: 'csat',
                  label: t('legend.csat'),
                  color: CSAT_OVERALL.color,
                  points: months.map((m) => ({ month: monthLabel(m.month, locale), value: m.overall.topBoxRate })),
                },
              ],
              average:
                totals.overall.topBoxRate === null
                  ? undefined
                  : {
                      value: totals.overall.topBoxRate,
                      display: t('chart.avgValue', { value: pct(totals.overall.topBoxRate) }),
                    },
              footnote: t('csat.footnote', {
                responses: totals.overall.responses.toLocaleString(),
                customers: totals.overall.customers.toLocaleString(),
                rate: pct(totals.overall.responseRate),
              }),
            }}
            index={6}
            onSelect={() => onSelectSurvey('overall')}
            selectLabel={t('detail.viewDetails')}
            sideStats={[
              sideStat('stats.overall', totals.overall, true),
              ...CSAT_SURVEYS.map((s) => sideStat(s.labelKey, totals[s.key])),
            ]}
            title={t('panels.csat')}
          />
        )}
      </div>

      {/* The same Top Box, one survey at a time. The overall chart above blends
          the four, and a survey that moves against the others — cleaning, all
          period — disappears into that blend. */}
      {surveyed && (
        <section>
          <h3 className="text-sm font-bold text-[var(--app-text)]">{t('csat.bySurvey.title')}</h3>
          <p className="mb-2.5 text-[10px] text-[var(--app-muted)]">{t('csat.bySurvey.hint')}</p>
          {/* Four across only from 2xl: at xl a card is ~230px, and six labelled
              bars plus the average row do not fit that without labels touching. */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-4">
            {CSAT_SURVEYS.map((s) => {
              const bucket = totals[s.key];
              return (
                <StreamCard
                  key={s.key}
                  color={s.color}
                  detail={
                    bucket.surveyed
                      ? t('csat.bySurvey.detail', {
                          responses: bucket.responses.toLocaleString(),
                          rate: pct(bucket.responseRate),
                        })
                      : t('csat.notSurveyed')
                  }
                  empty={bucket.surveyed ? undefined : t('csat.bySurvey.empty')}
                  label={t(s.labelKey)}
                  onSelect={() => onSelectSurvey(s.key)}
                  selectLabel={t('detail.viewDetails')}
                  points={months.map((m) => ({
                    month: monthLabel(m.month, locale),
                    value: m[s.key].topBoxRate,
                  }))}
                  total={
                    bucket.topBoxRate === null
                      ? undefined
                      : { value: bucket.topBoxRate, display: t('chart.avgValue', { value: pct(bucket.topBoxRate) }) }
                  }
                  value={pct(bucket.topBoxRate)}
                />
              );
            })}
          </div>
        </section>
      )}

      {surveyed && (
        <section className="rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-4 shadow-sm">
          <h3 className="text-sm font-bold text-[var(--app-text)]">{t('csat.table.title')}</h3>
          <p className="mb-3 text-[10px] text-[var(--app-muted)]">{t('csat.table.hint')}</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[var(--app-border)] text-[var(--app-muted)]">
                  <th className="px-3 py-2 text-left font-medium">{t('csat.table.month')}</th>
                  <th className="px-3 py-2 text-right font-medium">{t('stats.overall')}</th>
                  {CSAT_SURVEYS.map((s) => (
                    <th key={s.key} className="px-3 py-2 text-right font-medium">
                      {t(s.labelKey)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {months.map((m) => (
                  <tr key={m.month} className="border-b border-[var(--app-border)] last:border-0">
                    <td className="whitespace-nowrap px-3 py-2 text-[var(--app-text)]">
                      {monthLabel(m.month, locale, true)}
                    </td>
                    <Cell bucket={m.overall} strong />
                    {CSAT_SURVEYS.map((s) => (
                      <Cell key={s.key} bucket={m[s.key]} />
                    ))}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-[var(--app-border-strong)] font-semibold text-[var(--app-text)]">
                  <td className="whitespace-nowrap px-3 py-2">{t('csat.table.total')}</td>
                  <Cell bucket={totals.overall} strong />
                  {CSAT_SURVEYS.map((s) => (
                    <Cell key={s.key} bucket={totals[s.key]} strong />
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

/**
 * One survey's Top Box: its period total as the headline and as the rule across
 * its months, and a click through to that survey on its own.
 *
 * The rule is labelled "Avg" because that is the deck's word for it, on the
 * slide and on the overall panel above. It is not the mean of the bars: each bar
 * is that month sheet's own Top Box cell, and a month with five responses cannot
 * count as much as one with ninety. The total pools the ratings, the deck's way;
 * the detail view spells that out.
 */
function StreamCard({
  label,
  color,
  value,
  detail,
  points,
  total,
  empty,
  onSelect,
  selectLabel,
}: {
  label: string;
  color: string;
  value: string;
  detail: string;
  points: ChartPoint[];
  total?: { value: number; display: string };
  empty?: string;
  onSelect: () => void;
  selectLabel: string;
}) {
  return (
    <section
      aria-label={`${label} — ${selectLabel}`}
      className="group flex cursor-pointer overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] shadow-sm outline-none transition hover:border-[var(--app-brand)] hover:shadow-md focus-visible:ring-2 focus-visible:ring-[var(--app-brand)]"
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div aria-hidden className="w-1.5 shrink-0" style={{ background: color }} />
      <div className="flex min-w-0 flex-1 flex-col p-3">
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-xs font-bold text-[var(--app-text)]" title={label}>
              {label}
            </p>
            <p className="truncate text-[10px] leading-tight text-[var(--app-muted)]" title={detail}>
              {detail}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <p className="text-lg font-bold leading-none tabular-nums" style={{ color }}>
              {value}
            </p>
            <ChevronRight className="h-4 w-4 text-[var(--app-muted)] opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100" />
          </div>
        </div>

        {empty ? (
          <div className="flex min-h-[150px] flex-1 items-center justify-center rounded-lg border border-dashed border-[var(--app-border-strong)] bg-[var(--app-panel-soft)] p-3 text-center">
            <p className="text-[11px] leading-relaxed text-[var(--app-muted)]">{empty}</p>
          </div>
        ) : (
          <KpiBarChart
            average={total}
            heightClass="min-h-[150px]"
            mode="single"
            series={[{ key: 'topBox', label, color, points }]}
            showLegend={false}
            showValueLabels
            unit="percent"
          />
        )}
      </div>
    </section>
  );
}

/** One Top Box figure with the responses behind it beside it; a dash when nothing was surveyed. */
function Cell({ bucket, strong = false }: { bucket: CsatBucket; strong?: boolean }) {
  return (
    <td className={`whitespace-nowrap px-3 py-2 text-right tabular-nums ${strong ? 'font-bold' : ''}`}>
      {bucket.surveyed ? (
        <>
          {pct(bucket.topBoxRate)}
          <span className="ml-1.5 text-[10px] text-[var(--app-muted)]">{bucket.responses.toLocaleString()}</span>
        </>
      ) : (
        <span className="text-[var(--app-muted)]">—</span>
      )}
    </td>
  );
}
