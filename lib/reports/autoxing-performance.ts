/**
 * The delivery-robot Executive Performance Report (AutoXing), mirroring the
 * backend's `AutoxingPerformanceReport`. Labels arrive as keys (`multi_point`,
 * `robot_screen`, `HIGH_CANCEL`) and are translated in `deliveryReport.*`.
 */

export interface DeliveryShare {
  key: string;
  count: number;
  pct: number;
}

export interface DeliveryPerformanceReport {
  robotId: string;
  robotName: string;
  model: string | null;
  customerName: string;
  siteBranch: string;
  /** True when the header comes from Tools -> Robots; false = AutoXing's own names. */
  registered: boolean;
  periodLabel: string;
  from: string;
  to: string;
  summary: {
    tasksCompleted: number;
    operatingSeconds: number;
    distanceKm: number;
    completionRatePct: number | null;
    activeDays: number;
    totalDays: number;
    avgTasksPerActiveDay: number | null;
    previousTasksCompleted: number | null;
    tasksChangePct: number | null;
  };
  operational: {
    completionRatePct: number | null;
    utilisationPct: number | null;
    daily: { date: string; completed: number; notCompleted: number }[];
    hourly: number[];
    peakHourStart: number | null;
    peakSharePct: number | null;
    taskMix: DeliveryShare[];
    sources: DeliveryShare[];
    avgTaskSeconds: number | null;
  };
  reliability: {
    totalTasks: number;
    completed: number;
    cancelled: number;
    failed: number;
    cancelledPct: number;
    failedPct: number;
    topFailureReasons: { reason: string; count: number }[];
    chargingSessions: number;
    chargingPerActiveDay: number | null;
  };
  serviceCases: {
    opened: number;
    resolved: number;
    stillOpen: number;
    medianDaysToAction: number | null;
  } | null;
  /** Recorded fault history (the fleet poller); null when it could not be read. */
  faults: {
    recordingSince: string | null;
    partialPeriod: boolean;
    errorOccurrences: number;
    errors: {
      code: number;
      message: string | null;
      level: number | null;
      occurrences: number;
      activeSeconds: number;
      activeNow: boolean;
    }[];
    emergencyStops: number;
    emergencyStopSeconds: number;
    offlineSeconds: number;
  } | null;
  recommendations: { code: string; params: Record<string, string | number> }[];
  notes: string[];
}
