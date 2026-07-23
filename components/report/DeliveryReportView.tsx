/**
 * DeliveryReportView — RAASPAL "Executive Robot Performance Report" for delivery
 * robots (AutoXing), the delivery counterpart to {@link MonthlyReportView}.
 *
 * Delivery robots have no cleaning area, water or consumables, so Part 1 reports
 * tasks/distance/time, Part 2 shows delivery-share and active-day gauges plus a
 * daily volume chart, and Part 3 is a day-by-day activity table.
 *
 * Everything shown describes the reporting period only — the robot's live status
 * is deliberately excluded (it belongs in the operator UI, not a period report).
 * Rendered as white "paper" in both themes so it prints and shares consistently.
 */
import Image from 'next/image';
import type { AutoxingDeliveryReport } from '@/types/api';

/* ─── Palette (matches MonthlyReportView / the approved PowerPoint) ────────── */

const BLUE_PANEL = '#bcccea';
const RING_ARC = '#4472c4';
const RING_TRACK = '#dbe4f3';
const INK = '#12263a';
const INK_SOFT = '#47617a';
const INK_FAINT = '#7c93a8';
const LINE = '#dbe4f0';
const GOOD = '#22b04b';
const WARN = '#e0b100';

const CATEGORY_LABELS: Record<string, string> = {
  call: 'Call',
  delivery: 'Delivery',
  other: 'Other',
  charging: 'Charging',
  chassis: 'Chassis',
  disinfect: 'Disinfect',
};

/* ─── Formatting ──────────────────────────────────────────────────────────── */

function km(meters: number): string {
  return `${(meters / 1000).toFixed(1)} km`;
}

function hm(seconds: number): string {
  if (!seconds) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h} h ${m} min` : `${m} min`;
}

function minSec(seconds: number): string {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m} min ${String(s).padStart(2, '0')} sec`;
}

/** "2026-07-13" → "13 Jul" */
function dayLabel(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return date;
  return `${String(d.getUTCDate()).padStart(2, '0')} ${d.toLocaleString('en-GB', { month: 'short', timeZone: 'UTC' })}`;
}

/* ─── Building blocks ─────────────────────────────────────────────────────── */

function SectionBar({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="mb-4 rounded-lg px-4 py-3 text-lg font-extrabold"
      style={{ background: BLUE_PANEL, color: '#1c3a63' }}
    >
      {children}
    </div>
  );
}

function InfoTable({ rows }: { rows: [string, string][] }) {
  return (
    <table className="w-full border-separate" style={{ borderSpacing: 0 }}>
      <tbody>
        {rows.map(([k, v]) => (
          <tr key={k}>
            <th
              className="w-[38%] whitespace-nowrap px-3.5 py-2.5 text-left text-sm font-bold"
              style={{ background: BLUE_PANEL, color: '#1c3a63', border: `1px solid ${LINE}` }}
            >
              {k}
            </th>
            <td
              className="px-3.5 py-2.5 text-sm font-semibold"
              style={{ border: `1px solid ${LINE}`, color: INK }}
            >
              {v}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function MetricRows({ rows }: { rows: [string, string][] }) {
  return (
    <div className="grid grid-cols-[1fr_auto] gap-x-5 gap-y-3 px-1">
      {rows.map(([label, value]) => (
        <div key={label} className="contents">
          <div className="text-sm" style={{ color: INK_SOFT }}>{label}</div>
          <div className="text-right text-[15px] font-extrabold tabular-nums" style={{ color: INK }}>
            {value}
          </div>
        </div>
      ))}
    </div>
  );
}

function Ring({ label, percent, sub }: { label: string; percent: number; sub: string }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const filled = Math.max(0, Math.min(100, percent)) / 100;
  return (
    <div className="text-center">
      <div className="mb-2 text-sm font-bold" style={{ color: INK }}>{label}</div>
      <div className="relative mx-auto h-[150px] w-[150px]">
        <svg width="150" height="150" viewBox="0 0 150 150" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="75" cy="75" r={r} fill="none" stroke={RING_TRACK} strokeWidth="17" />
          <circle
            cx="75" cy="75" r={r} fill="none" stroke={RING_ARC} strokeWidth="17"
            strokeLinecap="round" strokeDasharray={`${(c * filled).toFixed(1)} ${c.toFixed(1)}`}
          />
        </svg>
        <div
          className="absolute inset-0 flex items-center justify-center text-[27px] font-extrabold tabular-nums"
          style={{ color: INK }}
        >
          {percent.toFixed(1)}%
        </div>
      </div>
      <div className="mt-1 text-xs" style={{ color: INK_FAINT }}>{sub}</div>
    </div>
  );
}

/** Daily task-volume bars; the busiest day is emphasised and labelled. */
function DailyChart({ daily }: { daily: AutoxingDeliveryReport['daily'] }) {
  if (daily.length === 0) return null;
  const max = Math.max(...daily.map((d) => d.count), 1);
  const W = 640, padL = 8, padR = 8, baseY = 140, plotH = 110;
  const slot = (W - padL - padR) / daily.length;
  const bw = Math.min(20, slot - 8);

  return (
    <svg viewBox={`0 0 ${W} 172`} className="h-auto w-full" role="img" aria-label="Daily task volume">
      <line x1={padL} x2={W - padR} y1={baseY + 0.5} y2={baseY + 0.5} stroke={LINE} strokeWidth="1" />
      {daily.map((d, i) => {
        const x = padL + i * slot + (slot - bw) / 2;
        const isPeak = d.count === max && d.count > 0;
        const h = d.count > 0 ? Math.max(3, (d.count / max) * plotH) : 0;
        const tick = i % 2 === 0 || i === daily.length - 1;
        const day = d.date?.slice(-2).replace(/^0/, '') ?? '';
        return (
          <g key={d.date ?? i}>
            {d.count > 0 ? (
              <rect
                x={x.toFixed(1)} y={(baseY - h).toFixed(1)} width={bw.toFixed(1)} height={h.toFixed(1)}
                rx="3" fill={RING_ARC} opacity={isPeak ? 1 : 0.72}
              />
            ) : (
              <circle cx={(x + bw / 2).toFixed(1)} cy={baseY - 3} r="1.6" fill={INK_FAINT} />
            )}
            {isPeak && (
              <text
                x={(x + bw / 2).toFixed(1)} y={(baseY - h - 6).toFixed(1)} textAnchor="middle"
                fontSize="11" fontWeight="800" fill={RING_ARC}
              >
                {d.count}
              </text>
            )}
            {tick && (
              <text
                x={(x + bw / 2).toFixed(1)} y={baseY + 18} textAnchor="middle"
                fontSize="10" fill={INK_FAINT}
              >
                {day}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/* ─── Report ──────────────────────────────────────────────────────────────── */

export function DeliveryReportView({ report }: { report: AutoxingDeliveryReport }) {
  const s = report.summary;
  const breakdown = report.categories.length
    ? report.categories.map((c) => `${CATEGORY_LABELS[c.category] ?? c.category} ×${c.count}`).join(' · ')
    : '—';

  const idleDays = report.daily.filter((d) => d.count === 0);
  const idleLabel = idleDays.map((d) => d.date.slice(-2).replace(/^0/, '')).join(', ');

  return (
    <div className="bg-white px-10 py-9 text-[#12263a]" style={{ fontVariantNumeric: 'tabular-nums' }}>
      {/* Brand */}
      <div className="flex items-center gap-2">
        <Image alt="RAAS PAL" src="/raas-pal-logo.png" width={34} height={34} className="h-9 w-9 object-contain" />
        <div>
          <p className="text-xl font-extrabold leading-none" style={{ color: '#0b7cc0' }}>RAAS PAL</p>
          <p className="text-[8px] font-bold uppercase tracking-[3px]" style={{ color: INK_FAINT }}>
            Robot as a Service
          </p>
        </div>
      </div>

      {/* Title */}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <h1 className="text-[30px] font-extrabold leading-tight tracking-tight" style={{ color: INK }}>
          Executive Robot Performance Report : {report.periodLabel}
        </h1>
        <span className="rounded-full px-3 py-1.5 text-xs font-extrabold uppercase tracking-wider text-white"
              style={{ background: 'linear-gradient(90deg,#16b9d1,#0b7cc0)' }}>
          Delivery
        </span>
      </div>

      {/* Identity */}
      <div className="mt-6 grid gap-3.5 sm:grid-cols-2">
        <InfoTable rows={[['Customer', report.customerName], ['Site / Branch', report.siteBranch]]} />
        <InfoTable
          rows={[
            ['Robot Name', report.robotName],
            ...(report.model ? ([['Model', report.model]] as [string, string][]) : []),
            ['Robot ID', report.robotId],
          ]}
        />
      </div>

      {/* Body */}
      <div className="mt-7 grid gap-x-10 gap-y-7 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <section>
            <SectionBar>Part 1 : Delivery Summary</SectionBar>
            <MetricRows
              rows={[
                ['Total Tasks Completed', String(s.totalTasks)],
                ['Deliveries Completed', String(s.deliveryTasks)],
                ['Total Distance Travelled', km(s.totalMileageMeters)],
                ['Total Operating Time', hm(s.totalDurationSeconds)],
                ['Tasks per Active Day', s.tasksPerActiveDay.toFixed(1)],
                ['Average Task Time', minSec(s.avgTaskSeconds)],
              ]}
            />
          </section>

          <section>
            <SectionBar>Part 3 : Daily Activity</SectionBar>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr>
                    {['Date', 'Tasks', 'Distance', 'Run Time'].map((h, i) => (
                      <th
                        key={h}
                        className={`px-2 py-1.5 text-[11px] font-bold uppercase tracking-wide ${i === 0 ? 'text-left' : 'text-right'}`}
                        style={{ color: INK_FAINT, borderBottom: `1.5px solid ${LINE}` }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {report.daily.map((d) => {
                    const idle = d.count === 0;
                    return (
                      <tr key={d.date} style={{ color: idle ? INK_FAINT : INK }}>
                        <td className="px-2 py-1 font-semibold" style={{ borderBottom: `1px solid ${LINE}` }}>
                          {dayLabel(d.date)}
                        </td>
                        <td className="px-2 py-1 text-right" style={{ borderBottom: `1px solid ${LINE}` }}>
                          {d.count || '—'}
                        </td>
                        <td className="px-2 py-1 text-right" style={{ borderBottom: `1px solid ${LINE}` }}>
                          {d.count ? km(d.mileageMeters) : '—'}
                        </td>
                        <td className="px-2 py-1 text-right" style={{ borderBottom: `1px solid ${LINE}` }}>
                          {d.count ? hm(d.durationSeconds) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="font-extrabold">
                    <td className="px-2 pt-2" style={{ borderTop: `1.5px solid ${LINE}` }}>Total</td>
                    <td className="px-2 pt-2 text-right" style={{ borderTop: `1.5px solid ${LINE}` }}>{s.totalTasks}</td>
                    <td className="px-2 pt-2 text-right" style={{ borderTop: `1.5px solid ${LINE}` }}>{km(s.totalMileageMeters)}</td>
                    <td className="px-2 pt-2 text-right" style={{ borderTop: `1.5px solid ${LINE}` }}>{hm(s.totalDurationSeconds)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-6">
          <section>
            <SectionBar>Part 2 : Operational Performance</SectionBar>
            <div className="mb-5 grid grid-cols-2 gap-2">
              <Ring
                label="Delivery Share"
                percent={s.deliverySharePct}
                sub={`${s.deliveryTasks} of ${s.totalTasks} tasks`}
              />
              <Ring
                label="Active Days"
                percent={s.totalDays > 0 ? (s.activeDays / s.totalDays) * 100 : 0}
                sub={`${s.activeDays} of ${s.totalDays} days`}
              />
            </div>

            <p className="mx-1 mb-1.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: INK_FAINT }}>
              Daily task volume
            </p>
            <DailyChart daily={report.daily} />

            <div className="mt-4">
              <MetricRows
                rows={[
                  ['Task Breakdown', breakdown],
                  ['Busiest Day', s.busiestDate ? `${dayLabel(s.busiestDate)} · ${s.busiestCount} tasks` : '—'],
                  ['Peak Distance', s.busiestDate ? km(s.busiestMileageMeters) : '—'],
                  ['Average Distance / Day', km(s.avgMileagePerActiveDayMeters)],
                ]}
              />
            </div>
          </section>

          <section>
            <SectionBar>Recommendations</SectionBar>
            <div className="flex flex-col gap-3 px-0.5">
              <Rec color={GOOD}>
                {`Utilisation — ${s.deliverySharePct.toFixed(1)}% of all tasks were deliveries, averaging
                  ${s.tasksPerActiveDay.toFixed(1)} tasks across ${s.activeDays} active days.`}
              </Rec>
              {s.busiestDate && (
                <Rec color={RING_ARC}>
                  {`Peak demand on ${dayLabel(s.busiestDate)} (${s.busiestCount} tasks, ${km(s.busiestMileageMeters)},
                    ${hm(s.busiestDurationSeconds)}) — review capacity headroom if volumes keep rising.`}
                </Rec>
              )}
              {idleDays.length > 0 && (
                <Rec color={WARN}>
                  {`${idleDays.length} day${idleDays.length === 1 ? '' : 's'} with no recorded activity
                    (${idleLabel}) — please confirm these were planned closures.`}
                </Rec>
              )}
              <Rec color={GOOD}>
                {`Total distance travelled ${km(s.totalMileageMeters)} over ${hm(s.totalDurationSeconds)} of operation.`}
              </Rec>
            </div>
          </section>
        </div>
      </div>

      <footer className="mt-8 border-t pt-4 text-center text-xs leading-relaxed" style={{ borderColor: LINE, color: INK_FAINT }}>
        <div className="font-bold tracking-wider" style={{ color: INK_SOFT }}>RAAS PAL CO., LTD</div>
        <div>Data from the AutoXing Cloud Platform · Robot {report.robotId} · {report.periodLabel}</div>
      </footer>
    </div>
  );
}

function Rec({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2.5 text-sm leading-snug" style={{ color: INK }}>
      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />
      <span>{children}</span>
    </div>
  );
}
