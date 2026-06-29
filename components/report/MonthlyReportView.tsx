/**
 * MonthlyReportView — RAASPAL "Executive Robot Performance Report" one-pager.
 *
 * Brand-agnostic, pure presentational component matching the manager's slide
 * layout: header (customer / site / robot / SN), Part 1 Executive Summary,
 * Part 2 Operational Performance (two SVG ring gauges + task details), Part 3
 * Consumables Status (traffic-light %), and Recommendations.
 *
 * Labels are translated via next-intl ('report' namespace) so the page follows
 * the active locale (with a switcher on the public page). Data values (names,
 * counts, breakdowns) come from the backend and are shown as-is; well-known
 * ring/consumable labels are mapped to translated terms, others fall through.
 */
import { Fragment } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import type {
  MonthlyPerformanceReport,
  HealthState,
  RingMetric,
  ConsumableStatus,
  ExecutiveSummary,
  OperationalPerformance,
} from '@/lib/reports/types';

/* ─── Palette (matches the approved PowerPoint) ──────────────────────────── */

const BLUE_PANEL = '#bcccea';
const RING_ARC = '#4472c4';
const RING_TRACK = '#dbe4f3';
const DOT: Record<HealthState, string> = {
  good: '#22b04b',
  monitor: '#e0b100',
  action: '#e23b34',
};

/** Map well-known backend labels to translation keys (fallback: raw value). */
const RING_KEYS: Record<string, string> = {
  'Task Completion Rate': 'taskCompletionRate',
  'Cleaning Coverage Rate': 'cleaningCoverageRate',
};
const CONSUMABLE_KEYS: Record<string, string> = {
  Brush: 'brush',
  Filter: 'filter',
  Squeegee: 'squeegee',
};

/* ─── Building blocks ─────────────────────────────────────────────────────── */

function SectionBar({ heading }: { heading: string }) {
  return (
    <div className="rounded-sm px-4 py-2 text-lg font-bold text-[#16243a]" style={{ backgroundColor: BLUE_PANEL }}>
      {heading}
    </div>
  );
}

/**
 * A 2-row info table (Customer/Site or Robot/SN). The label column auto-sizes to
 * its widest label via `max-content`, so longer translated labels (e.g. Thai
 * "หมายเลขเครื่อง (SN)") stay on one line instead of wrapping.
 */
function InfoTable({ rows }: { rows: [string, string][] }) {
  return (
    <div className="grid grid-cols-[max-content_1fr] overflow-hidden rounded-sm border border-white">
      {rows.map(([label, value], i) => (
        <Fragment key={label}>
          <div
            className={`px-3 py-2 text-sm font-bold text-[#16243a] ${i > 0 ? 'border-t border-white' : ''}`}
            style={{ backgroundColor: BLUE_PANEL }}
          >
            {label}
          </div>
          <div className={`px-3 py-2 text-sm text-[#16243a] ${i > 0 ? 'border-t border-white' : ''}`}>
            {value || ' '}
          </div>
        </Fragment>
      ))}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-4 py-1.5">
      <span className="w-48 shrink-0 text-[#16243a]">{label}</span>
      <span className="font-semibold text-[#16243a]">{value}</span>
    </div>
  );
}

/** SVG donut gauge with the percentage centred. */
function RingGauge({ label, percent }: { label: string; percent: number }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(100, Math.max(0, percent));
  const dash = (pct / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <p className="mb-2 text-center text-sm font-medium text-[#16243a]">{label}</p>
      <div className="relative h-36 w-36">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
          <circle cx="60" cy="60" r={radius} fill="none" stroke={RING_TRACK} strokeWidth="15" />
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke={RING_ARC}
            strokeWidth="15"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference}`}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-xl font-bold text-[#16243a]">
          {pct.toFixed(2)}%
        </div>
      </div>
    </div>
  );
}

function ConsumableRow({ item }: { item: ConsumableStatus }) {
  const t = useTranslations('report');
  const label = CONSUMABLE_KEYS[item.label] ? t(CONSUMABLE_KEYS[item.label]) : item.label;
  return (
    <div className="flex items-center gap-4 py-1.5">
      <span className="w-28 shrink-0 text-[#16243a]">{label}</span>
      <span className="h-4 w-4 shrink-0 rounded-full" style={{ backgroundColor: DOT[item.state] }} aria-hidden />
      <span className="font-semibold text-[#16243a]">{item.percent}%</span>
    </div>
  );
}

/* ─── Sub-sections ────────────────────────────────────────────────────────── */

function ExecutiveSummaryBlock({ s }: { s: ExecutiveSummary }) {
  const t = useTranslations('report');
  return (
    <div className="px-2 text-[15px]">
      <SummaryRow label={t('totalTasksCompleted')} value={String(s.totalTasksCompleted)} />
      <SummaryRow label={t('totalOperatingHours')} value={s.totalOperatingTime} />
      <SummaryRow label={t('totalAreaCleaned')} value={`${s.totalAreaCleanedSqm} sqm`} />
      <SummaryRow label={t('averageProductivity')} value={`${s.averageProductivitySqmH} sqm/h`} />
      <SummaryRow label={t('waterConsumption')} value={`${s.waterConsumptionL} L`} />
      <SummaryRow label={t('batteryConsumption')} value={s.batteryConsumption} />
    </div>
  );
}

function OperationalBlock({ o }: { o: OperationalPerformance }) {
  const t = useTranslations('report');
  const ringLabel = (r: RingMetric) => (RING_KEYS[r.label] ? t(RING_KEYS[r.label]) : r.label);
  return (
    <div className="px-2">
      <div className="flex flex-wrap justify-center gap-8">
        {o.rings.map((r) => (
          <RingGauge key={r.label} label={ringLabel(r)} percent={r.percent} />
        ))}
      </div>
      <div className="mt-6 grid grid-cols-[max-content_1fr] items-baseline gap-x-4 gap-y-1.5 text-[15px] text-[#16243a]">
        <span>{t('taskType')}</span>
        <span>{o.taskType}</span>
        <span>{t('taskStatus')}</span>
        <span>{o.taskStatus}</span>
        <span>{t('tasksPerDay')}</span>
        <span>{o.tasksPerDay}</span>
        <span>{t('averageRunTime')}</span>
        <span>{o.averageRunTime}</span>
      </div>
    </div>
  );
}

/* ─── Main view ──────────────────────────────────────────────────────────── */

export function MonthlyReportView({ report }: { report: MonthlyPerformanceReport }) {
  const t = useTranslations('report');

  return (
    <main className="min-h-dvh bg-[#eef1f6] py-8 print:bg-white print:py-0">
      <div className="mx-auto max-w-5xl bg-white px-8 py-7 shadow-sm sm:px-10">
        {/* ── Header ───────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <Image
              src="/raas-pal-wordmark.png"
              alt="RAAS PAL"
              width={240}
              height={60}
              priority
              className="h-8 w-auto sm:h-9"
            />
            <div className="mt-2 flex flex-wrap items-baseline gap-3">
              <h1 className="text-2xl font-bold leading-tight text-[#16243a] sm:text-[28px]">
                {t('title')} : {report.periodLabel}
              </h1>
            </div>
          </div>
        </div>

        {/* Info boxes: customer/site + robot/SN */}
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <InfoTable
            rows={[
              [t('customer'), report.customerName],
              [t('siteBranch'), report.siteBranch],
            ]}
          />
          <InfoTable
            rows={[
              [t('robotName'), report.robotName],
              [t('snNo'), report.serialNumber],
            ]}
          />
        </div>

        {/* ── Two-column body ──────────────────────────────────────────────── */}
        <div className="mt-7 grid gap-x-10 gap-y-7 lg:grid-cols-2">
          <div className="space-y-3">
            <SectionBar heading={`${t('part')} 1 : ${t('executiveSummary')}`} />
            <ExecutiveSummaryBlock s={report.executive} />
          </div>

          <div className="space-y-3">
            <SectionBar heading={`${t('part')} 2 : ${t('operationalPerformance')}`} />
            <OperationalBlock o={report.operational} />
          </div>

          <div className="space-y-3">
            <SectionBar heading={`${t('part')} 3 : ${t('consumablesStatus')}`} />
            <div className="px-2 text-[15px]">
              {report.consumables.map((c) => (
                <ConsumableRow key={c.label} item={c} />
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="px-1 text-lg font-bold text-[#16243a]">{t('recommendations')} :</h2>
            {report.recommendations.length > 0 ? (
              <ul className="space-y-2 px-2 text-[15px] text-[#16243a]">
                {report.recommendations.map((rec, i) => (
                  <li key={i} className="flex gap-2">
                    <span aria-hidden>•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="space-y-4 px-2 pt-2">
                <div className="border-b border-dotted border-[#16243a]" />
                <div className="border-b border-dotted border-[#16243a]" />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="mt-8 border-t border-[#dbe4f3] pt-3 text-center text-xs text-[#6b7785]">RAAS PAL CO., LTD</p>
      </div>
    </main>
  );
}
