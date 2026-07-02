/**
 * reports/types.ts — shared report primitives and the base report contract.
 *
 * Models the manager's "Executive Robot Performance Report" one-pager: a header
 * (customer / site / robot / SN + the red "customer needs to know" questions),
 * Part 1 Executive Summary, Part 2 Operational Performance (two ring gauges +
 * task details), Part 3 Consumables Status (traffic-light %), and Recommendations.
 *
 * Brand-agnostic: brand-specific entities (e.g. GausiumMonthlyReport) extend
 * `MonthlyPerformanceReport` and set their own `brand`, mirroring the backend's
 * ReportGenerator-by-brand adapter pattern.
 */

/** Robot brands that can produce a monthly report. Extend as the catalog grows. */
export type RobotBrand = 'GAUSIUM' | 'KEENON' | 'CENOBOT';

/** Traffic-light health state for consumables (Part 3). */
export type HealthState = 'good' | 'monitor' | 'action';

/** A donut/ring gauge in Part 2 (percentage 0–100). */
export interface RingMetric {
  label: string;
  percent: number;
}

/** One consumable row in Part 3, shown with a coloured dot + percentage. */
export interface ConsumableStatus {
  label: string;
  percent: number;
  state: HealthState;
}

/** Recommendation kind — the frontend builds the localized sentence from this. */
export type RecommendationType = 'action' | 'monitor' | 'completion' | 'healthy' | 'noData';

/**
 * A structured recommendation. `part` is the consumable label ("Brush" /
 * "Filter" / "Squeegee") for action/monitor, else null; `value` is the residual %
 * (action/monitor) or average completion % (completion), else null. Kept
 * structured — not a pre-built sentence — so the report renders in any locale.
 */
export interface Recommendation {
  type: RecommendationType;
  part: string | null;
  value: number | null;
}

/** Part 1 — Executive Summary figures (pre-formatted for display). */
export interface ExecutiveSummary {
  totalTasksCompleted: number;
  /** e.g. "0 h 12 min 7 sec". */
  totalOperatingTime: string;
  totalAreaCleanedSqm: number;
  averageProductivitySqmH: number;
  waterConsumptionL: number;
  /**
   * Battery consumed per area cleaned, e.g. "5.5 %/100 sqm". Backend formula:
   * sum(startBatteryPct − endBatteryPct) over the month's tasks ÷ total area
   * cleaned (sqm) × 100. Skip tasks with null battery; clamp negative per-task
   * values (mid-task charging) to 0 before summing.
   */
  batteryConsumption: string;
}

/** Part 2 — Operational Performance: ring gauges + task details. */
export interface OperationalPerformance {
  /** Typically [Task Completion Rate, Cleaning Coverage Rate]. */
  rings: RingMetric[];
  taskType: string;
  taskStatus: string;
  tasksPerDay: string;
  averageRunTime: string;
}

/**
 * Base monthly report contract shared by all brands. A brand-specific entity
 * narrows `brand` to a single literal (e.g. `brand: 'GAUSIUM'`).
 */
export interface MonthlyPerformanceReport {
  brand: RobotBrand;
  customerName: string;
  siteBranch: string;
  robotName: string;
  serialNumber: string;
  /** Reporting period shown under the title, e.g. "June 2026". */
  periodLabel: string;
  executive: ExecutiveSummary;
  operational: OperationalPerformance;
  consumables: ConsumableStatus[];
  recommendations: Recommendation[];
}
