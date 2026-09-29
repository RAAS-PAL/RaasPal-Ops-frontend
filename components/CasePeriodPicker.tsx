'use client';

import { CalendarDays } from 'lucide-react';
import {
  type Cadence,
  type PeriodChoice,
  formatWeek,
  mondayOf,
  monthOf,
  weekMonth,
  weeksOfMonth,
} from '@/lib/casePeriod';
import type { CaseScope } from '@/lib/caseCustomerViews';

/**
 * The filters above a pending-case report, as one toolbar row rather than a card of its
 * own: which board on the left, the period and its day or month on the right. What the
 * choice means ("Cases open on …") is said once, in the report's header below.
 *
 * <p>Weekly lists the month's working weeks by their dates, so "the second week of
 * September" is never a guess; a week that has not started yet cannot be picked.
 */

const SCOPES: { id: CaseScope; label: string }[] = [
  { id: 'BOTH', label: 'Both' },
  { id: 'CLEANING', label: 'Cleaning' },
  { id: 'DELIVERY', label: 'Delivery' },
];

const CADENCES: { id: Cadence; label: string }[] = [
  { id: 'DAILY', label: 'Daily' },
  { id: 'WEEKLY', label: 'Weekly' },
  { id: 'MONTHLY', label: 'Monthly' },
];

function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { id: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex gap-1 rounded-lg bg-[var(--app-panel)] p-1 shadow-sm ring-1 ring-inset ring-[var(--app-border)]"
    >
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          onClick={() => onChange(o.id)}
          className={`cursor-pointer rounded-md px-3 py-1.5 text-sm font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-brand)] ${
            value === o.id
              ? 'bg-[var(--app-brand)] text-white shadow-sm'
              : 'text-[var(--app-muted)] hover:bg-[var(--app-faint)] hover:text-[var(--app-text)]'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function DateField({
  label,
  type,
  value,
  max,
  onChange,
}: {
  label: string;
  type: 'date' | 'month';
  value: string;
  max: string;
  onChange: (next: string) => void;
}) {
  return (
    <label className="relative">
      <span className="sr-only">{label}</span>
      <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--app-muted)]" />
      <input
        type={type}
        value={value}
        max={max}
        // A cleared field sends "", which is no date; keep the last good one.
        onChange={(e) => e.target.value && onChange(e.target.value)}
        className="h-[2.625rem] cursor-pointer rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)] pl-9 pr-3 text-sm text-[var(--app-text)] shadow-sm"
      />
    </label>
  );
}

/**
 * @param scope   which board; the switch is drawn only when this and its setter are given,
 *                on the tabs whose cases span both boards
 * @param leading what sits on the left instead, on a tab with one board (AOT's sheet status)
 */
export function CasePeriodPicker({
  choice,
  today,
  onChange,
  scope,
  onScopeChange,
  leading,
}: {
  choice: PeriodChoice;
  today: string;
  onChange: (next: PeriodChoice) => void;
  scope?: CaseScope;
  onScopeChange?: (next: CaseScope) => void;
  leading?: React.ReactNode;
}) {
  // A week is listed under the month of its Friday, the day it is read on; so this
  // week can belong to next month while the monthly picker is still on this one.
  const listedMonth = weekMonth(choice.weekStart);
  const weeks = weeksOfMonth(listedMonth);
  const thisMonth = monthOf(today);
  const thisWeeksMonth = weekMonth(mondayOf(today));

  // A new month selects its latest week that has started, so the list never opens on
  // a week in the future or on one from the month before.
  const pickWeekMonth = (month: string) => {
    const all = weeksOfMonth(month);
    const started = all.filter((w) => w.start <= today);
    const weekStart = (started.length > 0 ? started[started.length - 1] : all[0]).start;
    onChange({ ...choice, weekStart });
  };

  return (
    <div className="space-y-2 print:hidden">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {scope && onScopeChange ? (
          <Segmented label="Show" options={SCOPES} value={scope} onChange={onScopeChange} />
        ) : (
          (leading ?? <span />)
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Segmented
            label="Period"
            options={CADENCES}
            value={choice.cadence}
            onChange={(cadence) => onChange({ ...choice, cadence })}
          />
          {choice.cadence === 'DAILY' && (
            <DateField
              label="Date"
              type="date"
              value={choice.day}
              max={today}
              onChange={(day) => onChange({ ...choice, day })}
            />
          )}
          {choice.cadence === 'WEEKLY' && (
            <DateField label="Month" type="month" value={listedMonth} max={thisWeeksMonth} onChange={pickWeekMonth} />
          )}
          {choice.cadence === 'MONTHLY' && (
            <DateField
              label="Month"
              type="month"
              value={choice.month}
              max={thisMonth}
              onChange={(month) => onChange({ ...choice, month })}
            />
          )}
        </div>
      </div>

      {choice.cadence === 'WEEKLY' && (
        <div role="radiogroup" aria-label="Week, Monday to Friday" className="flex flex-wrap justify-end gap-2">
          {weeks.map((w, i) => {
            const active = choice.weekStart === w.start;
            const future = w.start > today;
            return (
              <button
                key={w.start}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={future}
                onClick={() => onChange({ ...choice, weekStart: w.start })}
                title={future ? 'This week has not started yet.' : undefined}
                className={`cursor-pointer rounded-lg px-3 py-1.5 text-left text-sm shadow-sm ring-1 ring-inset transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40 ${
                  active
                    ? 'bg-[var(--app-brand-soft)] text-[var(--app-brand-dark)] ring-[var(--app-brand)]'
                    : 'bg-[var(--app-panel)] text-[var(--app-text)] ring-[var(--app-border)] hover:bg-[var(--app-faint)]'
                }`}
              >
                <span className="mr-1.5 text-xs font-semibold uppercase tracking-wide opacity-60">W{i + 1}</span>
                <span className="whitespace-nowrap font-semibold">{formatWeek(w)}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
