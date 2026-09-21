/**
 * DeliveryPerformanceReportView — the Executive Robot Performance Report for a
 * delivery robot (AutoXing), on the Gausium report's frame: same header, same
 * "Part 1 / 2 / 3 + Recommendations" order, same palette and print behaviour.
 *
 * What changes is the content. Part 1 counts tasks, hours and distance instead of
 * area and water; Part 2 shows completion and utilisation rings, the month day by
 * day and the hours of the day the robot is called; Part 3 is Reliability & Service
 * in place of Consumables, which a delivery robot does not have.
 *
 * Pure presentation: every figure comes from the backend, labels from the
 * `report` (shared) and `deliveryReport` (delivery-only) namespaces.
 */
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import type { DeliveryPerformanceReport, DeliveryShare } from '@/lib/reports/autoxing-performance';
import {
  BLUE_PANEL,
  InfoTable,
  RING_ARC,
  RingGauge,
  SectionBar,
  SummaryRow,
  formatNumber,
} from './MonthlyReportView';

const INK = '#16243a';
const MUTED = '#6b7785';
/** Not-completed tasks: the report's pale blue, so the stack reads as one bar with a lighter cap. */
const NOT_COMPLETED = BLUE_PANEL;

type T = ReturnType<typeof useTranslations>;

function hoursMinutes(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.round((totalSeconds % 3600) / 60);
  return `${formatNumber(h)} h ${m} m`;
}

function minutesSeconds(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return m > 0 ? `${m} m ${s} s` : `${s} s`;
}

const hh = (h: number) => `${String(h).padStart(2, '0')}:00`;

/** A translated label for a backend key, falling back to the key itself. */
function label(t: T, group: string, key: string): string {
  return t.has(`${group}.${key}`) ? t(`${group}.${key}`) : key;
}

/* ─── Part 2 charts ──────────────────────────────────────────────────────── */

/** Tasks per day, completed at the base and not-completed stacked above. */
function DailyTasksChart({ daily, t }: { daily: DeliveryPerformanceReport['operational']['daily']; t: T }) {
  const W = 620;
  const H = 120;
  const max = Math.max(1, ...daily.map((d) => d.completed + d.notCompleted));
  const slot = W / daily.length;
  const bar = Math.max(2, slot * 0.66);
  const y = (v: number) => (v / max) * (H - 14);

  return (
    <figure>
      <figcaption className="mb-1 text-sm font-medium" style={{ color: INK }}>
        {t('dailyTasks')}
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H + 16}`} className="h-auto w-full" role="img" aria-label={t('dailyTasks')}>
        <line x1={0} x2={W} y1={H} y2={H} stroke="#dbe4f3" />
        {daily.map((d, i) => {
          const x = i * slot + (slot - bar) / 2;
          const hDone = y(d.completed);
          const hNot = y(d.notCompleted);
          const day = Number(d.date.slice(8, 10));
          return (
            <g key={d.date}>
              <title>{`${d.date}: ${d.completed} ${t('legendCompleted')}, ${d.notCompleted} ${t('legendNotCompleted')}`}</title>
              {hDone > 0 && <rect x={x} y={H - hDone} width={bar} height={hDone} fill={RING_ARC} rx={1.5} />}
              {hNot > 0 && (
                <rect x={x} y={H - hDone - hNot - (hDone > 0 ? 1 : 0)} width={bar} height={hNot} fill={NOT_COMPLETED} rx={1.5} />
              )}
              {(day === 1 || day % 5 === 0) && (
                <text x={x + bar / 2} y={H + 12} textAnchor="middle" fontSize="10" fill={MUTED}>
                  {day}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <div className="mt-1 flex gap-4 text-xs" style={{ color: MUTED }}>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: RING_ARC }} />
          {t('legendCompleted')}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: NOT_COMPLETED }} />
          {t('legendNotCompleted')}
        </span>
      </div>
    </figure>
  );
}

/** Tasks by hour of day, only the hours the robot works, with the peak window named. */
function BusiestHoursStrip({ o, t }: { o: DeliveryPerformanceReport['operational']; t: T }) {
  const used = o.hourly.map((v, h) => ({ h, v })).filter((x) => x.v > 0);
  if (used.length === 0) return null;
  const first = used[0].h;
  const last = used[used.length - 1].h;
  const hours = o.hourly.slice(first, last + 1).map((v, i) => ({ h: first + i, v }));
  const max = Math.max(1, ...hours.map((x) => x.v));
  const W = 620;
  const H = 56;
  const slot = W / hours.length;
  const inPeak = (h: number) => o.peakHourStart != null && h >= o.peakHourStart && h < o.peakHourStart + 2;

  return (
    <figure>
      <figcaption className="mb-1 flex flex-wrap items-baseline justify-between gap-2 text-sm font-medium" style={{ color: INK }}>
        <span>{t('busiestHours')}</span>
        {o.peakHourStart != null && o.peakSharePct != null && (
          <span className="text-xs font-normal" style={{ color: MUTED }}>
            {t('peakWindow', { start: hh(o.peakHourStart), end: hh(o.peakHourStart + 2), value: o.peakSharePct })}
          </span>
        )}
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H + 16}`} className="h-auto w-full" role="img" aria-label={t('busiestHours')}>
        {hours.map(({ h, v }, i) => {
          const bh = (v / max) * H;
          return (
            <g key={h}>
              <title>{`${hh(h)}–${hh(h + 1)}: ${v}`}</title>
              <rect
                x={i * slot + 2}
                y={H - bh}
                width={slot - 4}
                height={Math.max(bh, v > 0 ? 2 : 0)}
                rx={2}
                fill={RING_ARC}
                opacity={inPeak(h) ? 1 : 0.55}
              />
              <text x={i * slot + slot / 2} y={H + 12} textAnchor="middle" fontSize="10" fill={MUTED}>
                {String(h).padStart(2, '0')}
              </text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}

/** "Multi-point delivery 95% · Return 1%" — the top three, the rest folded away. */
function ShareLine({ items, group, t }: { items: DeliveryShare[]; group: string; t: T }) {
  if (items.length === 0) return <span>—</span>;
  return (
    <span>
      {items.slice(0, 3).map((s, i) => (
        <span key={s.key}>
          {i > 0 && <span style={{ color: MUTED }}> · </span>}
          {label(t, group, s.key)} {s.pct}%
        </span>
      ))}
    </span>
  );
}

/* ─── Recommendations ────────────────────────────────────────────────────── */

function recommendationText(rec: DeliveryPerformanceReport['recommendations'][number], t: T): string {
  const p = rec.params ?? {};
  switch (rec.code) {
    case 'PEAK_HOURS':
      return t('rec.PEAK_HOURS', { value: p.value, start: hh(Number(p.start)), end: hh(Number(p.end)) });
    case 'FAILURES':
      return t('rec.FAILURES', {
        count: p.count,
        reason: p.reason ? t('rec.failureReasonSuffix', { reason: String(p.reason) }) : '',
      });
    case 'USAGE_DROP':
      return t('rec.USAGE_DROP', { value: Math.abs(Number(p.value)) });
    default:
      return t.has(`rec.${rec.code}`) ? t(`rec.${rec.code}`, p) : rec.code;
  }
}

/* ─── Main view ──────────────────────────────────────────────────────────── */

export function DeliveryPerformanceReportView({ report }: { report: DeliveryPerformanceReport }) {
  const tr = useTranslations('report');
  const t = useTranslations('deliveryReport');
  const s = report.summary;
  const o = report.operational;
  const r = report.reliability;
  const c = report.serviceCases;

  const change =
    s.tasksChangePct == null ? null : t('vsPrevious', { sign: s.tasksChangePct > 0 ? '+' : '', value: s.tasksChangePct });

  return (
    <main className="min-h-dvh bg-[#eef1f6] py-8 print:bg-white print:py-0">
      <div className="mx-auto max-w-5xl bg-white px-8 py-7 shadow-sm sm:px-10">
        {/* ── Header ───────────────────────────────────────────────────────── */}
        <Image
          src="/raas-pal-wordmark-print.png"
          alt="RAAS PAL"
          width={240}
          height={60}
          priority
          className="h-8 w-auto sm:h-9"
        />
        <h1 className="mt-2 text-2xl font-bold leading-tight sm:text-[28px]" style={{ color: INK }}>
          {tr('title')} : {report.periodLabel}
        </h1>

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <InfoTable
            rows={[
              [tr('customer'), report.customerName],
              [tr('siteBranch'), report.siteBranch],
            ]}
          />
          <InfoTable
            rows={[
              [tr('robotName'), report.robotName],
              [t('model'), report.model ?? '—'],
              [tr('snNo'), report.robotId],
            ]}
          />
        </div>

        {/* ── Part 1 | Part 2 ──────────────────────────────────────────────── */}
        <div className="mt-7 grid gap-x-10 gap-y-7 lg:grid-cols-2">
          <div className="space-y-3">
            <SectionBar heading={`${tr('part')} 1 : ${tr('executiveSummary')}`} />
            <div className="px-2 text-[15px]">
              <SummaryRow
                label={t('tasksCompleted')}
                value={`${formatNumber(s.tasksCompleted)}${change ? `   ${change}` : ''}`}
              />
              <SummaryRow label={t('operatingHours')} value={hoursMinutes(s.operatingSeconds)} />
              <SummaryRow label={t('distance')} value={`${formatNumber(s.distanceKm)} km`} />
              <SummaryRow
                label={t('completionRate')}
                value={s.completionRatePct == null ? '—' : `${s.completionRatePct}%`}
              />
              <SummaryRow label={t('activeDays')} value={t('activeDaysValue', { active: s.activeDays, total: s.totalDays })} />
              <SummaryRow
                label={t('avgTasksPerDay')}
                value={s.avgTasksPerActiveDay == null ? '—' : formatNumber(s.avgTasksPerActiveDay)}
              />
            </div>
          </div>

          <div className="space-y-3">
            <SectionBar heading={`${tr('part')} 2 : ${tr('operationalPerformance')}`} />
            <div className="px-2">
              <div className="flex flex-wrap justify-center gap-8">
                <RingGauge label={tr('taskCompletionRate')} percent={o.completionRatePct ?? 0} />
                <RingGauge label={t('utilisation')} percent={o.utilisationPct ?? 0} />
              </div>
              <div
                className="mt-5 grid grid-cols-[max-content_1fr] items-baseline gap-x-4 gap-y-1.5 text-[15px]"
                style={{ color: INK }}
              >
                <span>{t('taskMix')}</span>
                <ShareLine items={o.taskMix} group="mix" t={t} />
                <span>{t('startedFrom')}</span>
                <ShareLine items={o.sources} group="source" t={t} />
                <span>{t('avgTaskTime')}</span>
                <span>{o.avgTaskSeconds == null ? '—' : minutesSeconds(o.avgTaskSeconds)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Part 2, continued: the month and the day */}
        <div className="mt-6 grid gap-x-10 gap-y-5 px-2 lg:grid-cols-2">
          <DailyTasksChart daily={o.daily} t={t} />
          <BusiestHoursStrip o={o} t={t} />
        </div>

        {/* ── Part 3 | Recommendations ─────────────────────────────────────── */}
        <div className="mt-7 grid gap-x-10 gap-y-7 lg:grid-cols-2">
          <div className="space-y-3">
            <SectionBar heading={`${tr('part')} 3 : ${t('reliabilityService')}`} />
            <div
              className="grid grid-cols-[max-content_1fr] items-baseline gap-x-4 gap-y-1.5 px-2 text-[15px]"
              style={{ color: INK }}
            >
              <span>{t('failedTasks')}</span>
              <span className="font-semibold">{t('countPct', { count: r.failed, value: r.failedPct })}</span>

              {r.topFailureReasons.length > 0 && (
                <>
                  <span>{t('topReasons')}</span>
                  <span>
                    {r.topFailureReasons
                      .map((x) => `${x.reason || t('reasonNotGiven')} (${x.count})`)
                      .join(' · ')}
                  </span>
                </>
              )}

              <span>{t('cancelledTasks')}</span>
              <span className="font-semibold">{t('countPct', { count: r.cancelled, value: r.cancelledPct })}</span>

              <span>{t('charging')}</span>
              <span>
                {t('chargingValue', {
                  count: r.chargingSessions,
                  perDay: r.chargingPerActiveDay == null ? '—' : r.chargingPerActiveDay,
                })}
              </span>

              {c && (
                <>
                  <span>{t('serviceCases')}</span>
                  <span>
                    {c.opened === 0
                      ? t('noServiceCases')
                      : t('serviceCasesValue', { opened: c.opened, resolved: c.resolved })}
                    {c.medianDaysToAction != null && (
                      <span style={{ color: MUTED }}> · {t('medianAction', { days: c.medianDaysToAction })}</span>
                    )}
                  </span>
                </>
              )}
            </div>
            <p className="px-2 pt-1 text-xs italic" style={{ color: MUTED }}>
              * {t('dataNote')}
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="px-1 text-lg font-bold" style={{ color: INK }}>
              {tr('recommendations')} :
            </h2>
            <ul className="space-y-2 px-2 text-[15px]" style={{ color: INK }}>
              {report.recommendations.map((rec, i) => (
                <li key={i} className="flex gap-2">
                  <span aria-hidden>•</span>
                  <span>{recommendationText(rec, t)}</span>
                </li>
              ))}
            </ul>
            <p className="px-2 pt-1 text-xs italic" style={{ color: MUTED }}>
              * {t('confirmNote')}
            </p>
          </div>
        </div>

        <div className="mt-8 border-t border-[#dbe4f3] pt-3">
          <p className="text-center text-xs" style={{ color: MUTED }}>
            RAAS PAL CO., LTD
          </p>
        </div>
      </div>
    </main>
  );
}
