/**
 * reports/gausium.ts — the Gausium-brand Monthly Performance Report entity.
 *
 * Gausium robots are floor scrubbers, so Part 3 consumables are Brush / Filter /
 * Squeegee. Other brands define their own entity with their own metrics.
 *
 * `sampleGausiumReport` mirrors the manager's mockup values so the page can be
 * previewed before live telemetry is wired. It invents no real specs or prices.
 */
import { type MonthlyPerformanceReport } from './types';

/** Gausium-specific monthly report. Brand is pinned to 'GAUSIUM'. */
export interface GausiumMonthlyReport extends MonthlyPerformanceReport {
  brand: 'GAUSIUM';
}

/** Preview data for /[locale]/report/[token] until real data is wired in. */
export const sampleGausiumReport: GausiumMonthlyReport = {
  brand: 'GAUSIUM',
  customerName: 'Benz Rama3',
  siteBranch: 'Rama3 Road',
  robotName: 'Gausium Scrubber 50',
  serialNumber: 'GS50-2210-0457',
  periodLabel: 'June 2026',

  executive: {
    totalTasksCompleted: 3,
    totalOperatingTime: '0 h 12 min 7 sec',
    totalAreaCleanedSqm: 12.67,
    averageProductivitySqmH: 62.74,
    waterConsumptionL: 2.29,
    // sum(start−end) ÷ total area × 100. Representative value for the preview.
    batteryConsumption: '5.5 %/100 sqm',
  },

  operational: {
    rings: [
      { label: 'Task Completion Rate', percent: 86.6 },
      { label: 'Cleaning Coverage Rate', percent: 86.58 },
    ],
    taskType: 'Floor Washing',
    taskStatus: 'Completed',
    tasksPerDay: '1.0',
    averageRunTime: '4 min 02 sec',
  },

  consumables: [
    { label: 'Brush', percent: 99.92, state: 'good' },
    { label: 'Filter', percent: 100, state: 'good' },
    { label: 'Squeegee', percent: 100, state: 'good' },
  ],

  recommendations: [
    { type: 'monitor', part: 'Brush', value: 78 },
    { type: 'healthy', part: null, value: null },
  ],
};
