'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { PM_CELL_CLASS, PM_STATUS_LABEL_KEY, PM_STATUS_ORDER, PM_SWATCH_CLASS } from '@/lib/pm/status';
import { isoWeekMonday, weekRangeLabel } from '@/lib/pm/params';
import type { PmCellStatus, PmYearResponse, PmYearRow } from '@/lib/pm/types';

/**
 * The 52-week grid: one row per contract, one column per ISO week.
 *
 * <p>The hard part is not fitting 53 columns on screen, it is making a mark forty
 * rows down unambiguously belong to one of them. Colour alone does not do it, so
 * the column is established four ways at once: months are banded with alternating
 * tint and a heavier rule at each boundary, every cell carries a vertical rule,
 * hovering any cell lights its whole column, and the current week stays marked in
 * the brand colour. The month row above the week numbers gives the eye something
 * coarser than "week 23" to navigate by.
 *
 * <p>The column highlight is one absolutely-positioned bar moved by hand, not
 * React state. This grid renders around 18,000 cells, and holding the hovered week
 * in state re-rendered every one of them on each mouse move - about 180ms a
 * column, eleven times over a frame. Moving a single element costs nothing and
 * never touches the tree.
 *
 * <p>It scrolls inside its own box, like RobotSpecMatrix, so the page never
 * scrolls sideways and the headers can be sticky against the box rather than
 * fighting the app's own sticky top bar.
 */

type Props = {
  data: PmYearResponse;
  locale: string;
  onSelectWeek: (week: number) => void;
};

type Group = { key: string; region: string; zone: string; rows: PmYearRow[] };

/** One column: its ISO week, and the month it is counted in. */
type WeekColumn = {
  week: number;
  monthIndex: number;
  isMonthStart: boolean;
  isCurrentWeek: boolean;
};

/** Header heights, in px. Sticky offsets have to be exact, so they are not classes. */
const MONTH_ROW_H = 26;
const WEEK_ROW_H = 26;

export function PmYearGrid({ data, locale, onSelectWeek }: Props) {
  const t = useTranslations('pmPlanning');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const overlayRef = useRef<HTMLDivElement>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  const columns = useMemo(() => buildColumns(data.year, data.weekCount), [data.year, data.weekCount]);
  const currentWeek = useMemo(() => columns.find((column) => column.isCurrentWeek)?.week, [columns]);

  /**
   * Open on the current week rather than on January.
   *
   * <p>A planner's question is almost always about the weeks around now, and a
   * grid that starts eight months in the past makes them scroll before they can
   * read anything. Placed a third in from the left so the recent past stays
   * visible beside what is coming.
   */
  useEffect(() => {
    const container = scrollRef.current;
    if (!container || !currentWeek) return;
    const target = container.querySelector<HTMLElement>(`[data-week="${currentWeek}"]`);
    if (!target) return;
    container.scrollLeft = Math.max(0, target.offsetLeft - container.clientWidth / 3);
  }, [currentWeek, data.year]);
  const monthSpans = useMemo(() => buildMonthSpans(columns, data.year, locale), [columns, data.year, locale]);
  const groups = useMemo(() => groupRows(data.rows), [data.rows]);

  const totalsByWeek = useMemo(() => {
    const map = new Map<number, PmYearResponse['weekTotals'][number]>();
    data.weekTotals.forEach((total) => map.set(total.week, total));
    return map;
  }, [data.weekTotals]);

  // Bars scale to the busiest week, so the shape of the year reads at any volume.
  const peakWeek = useMemo(
    () => Math.max(1, ...data.weekTotals.map((total) => total.total)),
    [data.weekTotals],
  );

  /**
   * Slides the highlight bar onto whichever column the pointer is over.
   *
   * <p>Writes straight to the node's style. Going through state here is what made
   * the grid feel like it was dragging.
   */
  const trackColumn = (event: React.MouseEvent<HTMLDivElement>) => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    const cell = (event.target as HTMLElement).closest<HTMLElement>('[data-week]');
    if (!cell) {
      overlay.style.opacity = '0';
      return;
    }
    overlay.style.transform = `translateX(${cell.offsetLeft}px)`;
    overlay.style.width = `${cell.offsetWidth}px`;
    overlay.style.opacity = '1';
  };

  const hideColumn = () => {
    if (overlayRef.current) overlayRef.current.style.opacity = '0';
  };

  if (data.rows.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-[var(--app-border)] p-8 text-center text-sm text-[var(--app-muted)]">
        {t('empty')}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <Legend />

      <div
        ref={scrollRef}
        className="overflow-auto rounded-xl border border-[var(--app-border)]"
        style={{ maxHeight: '75vh' }}
      >
        <div className="relative w-max" onMouseOver={trackColumn} onMouseLeave={hideColumn}>
          {/* Sits above the cells but below the sticky header and site column, so it
              tints the column without covering either. */}
          <div
            ref={overlayRef}
            aria-hidden
            className="pointer-events-none absolute bottom-0 left-0 top-0 z-[5] bg-[var(--app-brand)]/15 opacity-0"
            style={{ width: 0 }}
          />
        <table className="w-max border-collapse text-xs">
          <thead>
            {/* Month band — the coarse anchor. */}
            <tr>
              <th
                scope="col"
                rowSpan={2}
                className="sticky left-0 z-40 min-w-[16rem] max-w-[16rem] border-b border-r border-[var(--app-border)] bg-[var(--app-panel-soft)] px-3 text-left font-semibold"
                style={{ top: 0 }}
              >
                {t('grid.site')}
              </th>
              {monthSpans.map((span) => (
                <th
                  key={span.monthIndex}
                  scope="col"
                  colSpan={span.weeks}
                  className="sticky z-30 border-b border-l-2 border-b-[var(--app-border)] border-l-[var(--app-border-strong)] bg-[var(--app-panel-soft)] text-center text-[10px] font-bold uppercase tracking-wide text-[var(--app-muted)]"
                  style={{ top: 0, height: MONTH_ROW_H }}
                >
                  {span.label}
                </th>
              ))}
            </tr>

            {/* Week numbers. */}
            <tr>
              {columns.map((column) => (
                <th
                  key={column.week}
                  scope="col"
                  data-week={column.week}
                  className={`sticky z-30 border-b border-[var(--app-border)] p-0 text-center font-semibold ${
                    column.isMonthStart ? 'border-l-2 border-l-[var(--app-border-strong)]' : ''
                  } ${columnTint(column)} hover:bg-[var(--app-brand)]/15`}
                  style={{ top: MONTH_ROW_H, height: WEEK_ROW_H }}
                >
                  <button
                    type="button"
                    onClick={() => onSelectWeek(column.week)}
                    title={`${t('grid.week')} ${column.week} · ${weekRangeLabel(data.year, column.week, locale)}`}
                    className={`h-full w-8 text-[10px] font-bold transition ${
                      column.isCurrentWeek
                        ? 'text-[var(--app-brand-dark)]'
                        : 'text-[var(--app-muted)] hover:text-[var(--app-brand-dark)]'
                    }`}
                  >
                    {column.week}
                  </button>
                </th>
              ))}
            </tr>

            {/* Week load (spec section 27): where the year bunches up. */}
            <tr>
              <th
                scope="row"
                className="sticky left-0 z-40 border-b border-r border-[var(--app-border)] bg-[var(--app-panel-soft)] px-3 text-left text-[10px] font-semibold uppercase text-[var(--app-muted)]"
                style={{ top: MONTH_ROW_H + WEEK_ROW_H }}
              >
                {t('grid.load')}
              </th>
              {columns.map((column) => {
                const total = totalsByWeek.get(column.week);
                const height = total ? Math.max(2, Math.round((total.total / peakWeek) * 18)) : 0;
                return (
                  <td
                    key={column.week}
                    className={`sticky z-20 border-b border-[var(--app-border)] bg-[var(--app-panel-soft)] p-0 align-bottom ${
                      column.isMonthStart ? 'border-l-2 border-l-[var(--app-border-strong)]' : ''
                    } ${columnTint(column)}`}
                    style={{ top: MONTH_ROW_H + WEEK_ROW_H }}
                    data-week={column.week}
                  >
                    <div className="flex h-6 w-8 items-end justify-center px-1 pb-0.5">
                      {total ? (
                        <div
                          className="w-full rounded-[2px] bg-[var(--app-brand)]"
                          style={{ height: `${height}px` }}
                          title={`${t('grid.week')} ${column.week}: ${total.total}`}
                        />
                      ) : null}
                    </div>
                  </td>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {groups.map((group) => (
              <GroupBlock
                key={group.key}
                group={group}
                columns={columns}
                year={data.year}
                locale={locale}
                collapsed={collapsed[group.key] ?? false}
                onToggle={() =>
                  setCollapsed((current) => ({ ...current, [group.key]: !(current[group.key] ?? false) }))
                }
                onSelectWeek={onSelectWeek}
              />
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}

function GroupBlock({
  group,
  columns,
  year,
  locale,
  collapsed,
  onToggle,
  onSelectWeek,
}: {
  group: Group;
  columns: WeekColumn[];
  year: number;
  locale: string;
  collapsed: boolean;
  onToggle: () => void;
  onSelectWeek: (week: number) => void;
}) {
  const visits = group.rows.reduce((sum, row) => sum + row.totalVisits, 0);

  return (
    <>
      <tr className="bg-[var(--app-faint)]">
        <th
          scope="rowgroup"
          className="sticky left-0 z-10 border-b border-r border-[var(--app-border)] bg-[var(--app-faint)] px-2 py-1.5 text-left"
        >
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={!collapsed}
            className="flex w-full items-center gap-1 text-left text-[11px] font-bold uppercase tracking-wide text-[var(--app-muted)] transition hover:text-[var(--app-brand-dark)]"
          >
            {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            <span className="truncate">
              {humanizeZone(group.region)}
              {group.zone && group.zone !== group.region ? ` · ${humanizeZone(group.zone)}` : ''}
            </span>
            <span className="ml-auto shrink-0 font-semibold normal-case text-[var(--app-muted)]">
              {group.rows.length} · {visits}
            </span>
          </button>
        </th>
        {columns.map((column) => (
          <td
            key={column.week}
            data-week={column.week}
            className={`border-b border-[var(--app-border)] bg-[var(--app-faint)] ${
              column.isMonthStart ? 'border-l-2 border-l-[var(--app-border-strong)]' : ''
            } ${columnTint(column)}`}
          />
        ))}
      </tr>

      {!collapsed &&
        group.rows.map((row) => (
          <tr key={row.contractId} className="group/row">
            <th
              scope="row"
              className="sticky left-0 z-10 min-w-[16rem] max-w-[16rem] border-b border-r border-[var(--app-border)] bg-[var(--app-panel)] px-3 py-1.5 text-left font-normal group-hover/row:bg-[var(--app-panel-alt)]"
            >
              <span className="block truncate font-semibold" title={row.name ?? undefined}>
                {row.name ?? row.customerName ?? '—'}
              </span>
              <span className="block truncate text-[10px] text-[var(--app-muted)]">
                {[row.province, row.robotModel, row.robotCount ? `×${row.robotCount}` : null]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </th>

            {columns.map((column) => {
              const cell = row.cells[String(column.week)];
              return (
                <td
                  key={column.week}
                  data-week={column.week}
                  className={`border-b border-r border-[var(--app-border)] p-0 text-center group-hover/row:bg-[var(--app-panel-alt)] ${
                    column.isMonthStart ? 'border-l-2 border-l-[var(--app-border-strong)]' : ''
                  } ${columnTint(column)}`}
                >
                  {cell ? (
                    <button
                      type="button"
                      onClick={() => onSelectWeek(column.week)}
                      title={`${weekRangeLabel(year, column.week, locale)} · ${describeCell(cell.byStatus)}`}
                      // Fills the column rather than floating inside it, so the
                      // colour maps to one week and not to the gap beside it.
                      className={`block h-5 w-8 text-[10px] font-bold leading-5 transition hover:opacity-80 ${PM_CELL_CLASS[cell.dominantStatus]}`}
                    >
                      {cell.total > 1 ? cell.total : ''}
                    </button>
                  ) : (
                    <div className="h-5 w-8" />
                  )}
                </td>
              );
            })}
          </tr>
        ))}
    </>
  );
}

/**
 * The static tint: alternating month bands, with the current week in the brand
 * colour. Hover is deliberately not here - it is the overlay bar, because putting
 * it in a per-cell class means re-rendering the whole grid to move it.
 *
 * <p>Translucent rather than solid so it composites over the row-hover highlight
 * instead of cancelling it.
 */
function columnTint(column: WeekColumn): string {
  if (column.isCurrentWeek) return 'bg-[var(--app-brand)]/10';
  return column.monthIndex % 2 === 1 ? 'bg-black/[0.035] dark:bg-white/[0.05]' : '';
}

function Legend() {
  const t = useTranslations('pmPlanning');
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--app-muted)]">
      {PM_STATUS_ORDER.map((status) => (
        <span key={status} className="inline-flex items-center gap-1.5">
          <span className={`h-2.5 w-2.5 rounded-sm ${PM_SWATCH_CLASS[status]}`} />
          {t(`status.${PM_STATUS_LABEL_KEY[status]}`)}
        </span>
      ))}
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-sm bg-[var(--app-brand)]/30" />
        {t('grid.thisWeek')}
      </span>
    </div>
  );
}

/**
 * Which month each week belongs to.
 *
 * <p>By the week's Thursday, the ISO rule: a week straddling a month end belongs
 * to whichever month holds most of it, and Thursday is always on that side.
 */
function buildColumns(year: number, weekCount: number): WeekColumn[] {
  const today = new Date();
  const columns: WeekColumn[] = [];
  let previousMonth = -1;

  for (let week = 1; week <= weekCount; week += 1) {
    const monday = isoWeekMonday(year, week);
    const thursday = new Date(monday);
    thursday.setDate(thursday.getDate() + 3);
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);

    const monthIndex = thursday.getMonth();
    columns.push({
      week,
      monthIndex,
      isMonthStart: monthIndex !== previousMonth,
      isCurrentWeek: today >= monday && today <= sunday,
    });
    previousMonth = monthIndex;
  }
  return columns;
}

/** Consecutive runs of one month, for the header's colspans. */
function buildMonthSpans(columns: WeekColumn[], year: number, locale: string) {
  const format = new Intl.DateTimeFormat(locale, { month: 'short' });
  const spans: { monthIndex: number; weeks: number; label: string }[] = [];

  columns.forEach((column) => {
    const last = spans[spans.length - 1];
    if (last && last.monthIndex === column.monthIndex) {
      last.weeks += 1;
      return;
    }
    spans.push({
      monthIndex: column.monthIndex,
      weeks: 1,
      label: format.format(new Date(year, column.monthIndex, 1)),
    });
  });
  return spans;
}

/** "2 planned, 1 overdue" for a cell's tooltip. */
function describeCell(byStatus: Partial<Record<PmCellStatus, number>>): string {
  return PM_STATUS_ORDER.filter((status) => byStatus[status])
    .map((status) => `${byStatus[status]} ${status.toLowerCase().replace('_', ' ')}`)
    .join(', ');
}

/**
 * UPPER_NORTH → Upper North.
 *
 * Not translated: these come from the province master as stable enum-ish keys, and
 * a missing translation key throws in next-intl rather than degrading.
 */
function humanizeZone(zone: string): string {
  return zone
    .split('_')
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(' ');
}

/** Groups rows by region then zone, preserving the backend's ordering. */
function groupRows(rows: PmYearRow[]): Group[] {
  const groups = new Map<string, Group>();
  rows.forEach((row) => {
    const region = row.region ?? 'UNASSIGNED';
    const zone = row.zone ?? 'UNASSIGNED';
    const key = `${region}|${zone}`;
    if (!groups.has(key)) groups.set(key, { key, region, zone, rows: [] });
    groups.get(key)!.rows.push(row);
  });
  return [...groups.values()];
}
