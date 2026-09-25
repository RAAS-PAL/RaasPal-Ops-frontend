/**
 * report-tracking.ts — who is due a report for a period, and where each one stands.
 *
 * One calculation behind every delivery number on the Team Dashboard, so the KPI
 * tiles, the coverage bar and the tracking list can never disagree.
 *
 * A customer is DUE a report for a period when they have at least one active
 * cleaning robot whose contract covers some of that period, on the cadence that
 * period serves: a month counts every robot except those set to Weekly (weekly
 * replaces monthly for a robot); a week counts only robots set to Weekly.
 * Delivery robots never make a customer due — the report email leaves them out.
 *
 * Each due customer is in exactly one state, so the three always add up to due:
 *   - sent       their company link went out, or a single-robot email went out for
 *                every robot they are due for (a one-robot customer is fully served
 *                by the preview page's Send);
 *   - failed     not sent, and at least one attempt failed — needs a resend;
 *   - notSent    nothing has gone out yet.
 */
import type { CustomerResponse, ReportSend, RobotUnitResponse } from '@/types/api';

export type TrackingState = 'sent' | 'failed' | 'notSent';

export interface CustomerTracking {
  customerProfileId: string;
  customerName: string;
  state: TrackingState;
  /** How it was sent: the company link, or single-robot emails. Null unless sent. */
  via: 'company' | 'robot' | null;
  /** Latest successful send, ISO timestamp. Null unless sent. */
  sentAt: string | null;
  /** The latest failure message, when the state is failed. */
  error: string | null;
  /** Robots this customer is due a report for this period. */
  robotCount: number;
  /** No contact email on file — a send is bound to fail until one is added. */
  noContactEmail: boolean;
}

export interface PeriodTracking {
  due: number;
  sent: CustomerTracking[];
  failed: CustomerTracking[];
  notSent: CustomerTracking[];
  /** Sent via the company link / via single-robot emails only. */
  sentByCompanyLink: number;
  sentByRobotEmail: number;
  /** Customers emailed this period who are not on the due list (e.g. since moved to Weekly). */
  sentOutsideDue: number;
  /** Due customers still waiting (not sent or failed) who have no contact email. */
  waitingWithoutEmail: number;
}

/** The period's first and last day, ISO "YYYY-MM-DD", inclusive. */
export interface PeriodRange {
  from: string;
  to: string;
}

/** Whether a contract (either end may be open) overlaps the period at all. */
function contractCovers(start: string | null, end: string | null, period: PeriodRange): boolean {
  return (!start || start <= period.to) && (!end || end >= period.from);
}

export function trackPeriod(
  kind: 'month' | 'week',
  period: PeriodRange,
  history: ReportSend[],
  robots: RobotUnitResponse[],
  customers: CustomerResponse[],
): PeriodTracking {
  // Who is due, and for which robots.
  const dueRobots = new Map<string, Set<string>>();
  const dueNames = new Map<string, string>();
  for (const robot of robots) {
    const d = robot.deployment;
    if (!d || robot.robotType === 'DELIVERY') continue;
    const onThisCadence = kind === 'week' ? d.reportCadence === 'WEEKLY' : d.reportCadence !== 'WEEKLY';
    if (!onThisCadence || !contractCovers(d.contractStartDate, d.contractEndDate, period)) continue;
    if (!dueRobots.has(d.customerProfileId)) dueRobots.set(d.customerProfileId, new Set());
    dueRobots.get(d.customerProfileId)!.add(robot.serialNumber);
    dueNames.set(d.customerProfileId, d.customerName);
  }

  const customerById = new Map(customers.map((c) => [c.id, c]));
  const rowsByCustomer = new Map<string, ReportSend[]>();
  for (const row of history) {
    if (!rowsByCustomer.has(row.customerProfileId)) rowsByCustomer.set(row.customerProfileId, []);
    rowsByCustomer.get(row.customerProfileId)!.push(row);
  }

  const sent: CustomerTracking[] = [];
  const failed: CustomerTracking[] = [];
  const notSent: CustomerTracking[] = [];

  for (const [customerId, serials] of dueRobots) {
    const rows = rowsByCustomer.get(customerId) ?? [];
    const sentRows = rows.filter((r) => r.status === 'SENT');
    const bundleSent = sentRows.some((r) => r.kind === 'BUNDLE');
    const robotEmailed = new Set(
      sentRows.filter((r) => r.kind === 'ROBOT_REPORT' && r.robotSerial).map((r) => r.robotSerial!),
    );
    const everyRobotEmailed = [...serials].every((sn) => robotEmailed.has(sn));
    const failures = rows.filter((r) => r.status === 'FAILED');
    const contactEmail = customerById.get(customerId)?.contactEmail ?? '';

    const base = {
      customerProfileId: customerId,
      customerName: customerById.get(customerId)?.companyName ?? dueNames.get(customerId) ?? '—',
      robotCount: serials.size,
      noContactEmail: !contactEmail.trim(),
    };

    if (bundleSent || everyRobotEmailed) {
      sent.push({
        ...base,
        state: 'sent',
        via: bundleSent ? 'company' : 'robot',
        sentAt: latest(sentRows),
        error: null,
      });
    } else if (failures.length > 0) {
      const last = [...failures].sort((a, b) => b.sentAt.localeCompare(a.sentAt))[0];
      failed.push({ ...base, state: 'failed', via: null, sentAt: null, error: last.errorMessage });
    } else {
      notSent.push({ ...base, state: 'notSent', via: null, sentAt: null, error: null });
    }
  }

  const byName = (a: CustomerTracking, b: CustomerTracking) => a.customerName.localeCompare(b.customerName);
  sent.sort((a, b) => (b.sentAt ?? '').localeCompare(a.sentAt ?? '')); // newest first
  failed.sort(byName);
  notSent.sort(byName);

  const emailedIds = new Set(history.filter((r) => r.status === 'SENT').map((r) => r.customerProfileId));
  return {
    due: dueRobots.size,
    sent,
    failed,
    notSent,
    sentByCompanyLink: sent.filter((c) => c.via === 'company').length,
    sentByRobotEmail: sent.filter((c) => c.via === 'robot').length,
    sentOutsideDue: [...emailedIds].filter((id) => !dueRobots.has(id)).length,
    waitingWithoutEmail: [...failed, ...notSent].filter((c) => c.noContactEmail).length,
  };
}

function latest(rows: ReportSend[]): string | null {
  return rows.reduce<string | null>((max, r) => (max == null || r.sentAt > max ? r.sentAt : max), null);
}

/** "2026-08" → { from: "2026-08-01", to: "2026-08-31" }. */
export function monthRange(month: string): PeriodRange {
  const [y, m] = month.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, '0')}` };
}
