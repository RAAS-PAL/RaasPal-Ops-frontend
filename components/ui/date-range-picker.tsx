'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * A from/to range on one calendar: the first click sets the start, the second the end.
 * Clicking again starts a new range. Dates are 'YYYY-MM-DD' strings, like <input type="date">.
 */
export function DateRangePicker({ from, to, onChange, max, min, className = '' }: {
  from: string;
  to: string;
  onChange: (range: { from: string; to: string }) => void;
  /** Latest selectable day, 'YYYY-MM-DD'. */
  max?: string;
  min?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [month, setMonth] = useState(() => monthOf(from || max || today()));
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  const pick = (day: string) => {
    if (draftFrom === null) {
      setDraftFrom(day);
      return;
    }
    const [a, b] = draftFrom <= day ? [draftFrom, day] : [day, draftFrom];
    onChange({ from: a, to: b });
    setDraftFrom(null);
    setHover(null);
    setOpen(false);
  };

  // While the second click is pending, the range follows the mouse.
  const shown = draftFrom !== null
    ? (hover && hover < draftFrom ? { from: hover, to: draftFrom } : { from: draftFrom, to: hover ?? draftFrom })
    : { from, to };

  const presets = useMemo(() => {
    const end = max ?? today();
    const e = parse(end);
    const firstOfMonth = fmt(new Date(e.getFullYear(), e.getMonth(), 1));
    const lastMonthStart = fmt(new Date(e.getFullYear(), e.getMonth() - 1, 1));
    const lastMonthEnd = fmt(new Date(e.getFullYear(), e.getMonth(), 0));
    return [
      { label: 'Last 7 days', from: addDays(end, -6), to: end },
      { label: 'Last 30 days', from: addDays(end, -29), to: end },
      { label: 'This month', from: firstOfMonth, to: end },
      { label: 'Last month', from: lastMonthStart, to: lastMonthEnd },
    ];
  }, [max]);

  const openPicker = () => {
    setMonth(monthOf(from || max || today()));
    setDraftFrom(null);
    setOpen((v) => !v);
  };

  return (
    <div ref={root} className={`relative ${className}`}>
      <button
        type="button"
        onClick={openPicker}
        className="flex h-9 items-center gap-2 rounded-lg border border-[var(--app-border)] bg-[var(--app-panel-alt)] px-3 text-sm text-[var(--app-text)] outline-none focus:border-[var(--app-brand)]"
      >
        <CalendarDays className="h-4 w-4 text-[var(--app-muted)]" />
        <span>{label(from)} – {label(to)}</span>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 flex gap-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-3 shadow-lg">
          <div className="flex flex-col gap-1 border-r border-[var(--app-border)] pr-3">
            {presets.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => {
                  onChange({ from: min && p.from < min ? min : p.from, to: p.to });
                  setDraftFrom(null);
                  setOpen(false);
                }}
                className="rounded-md px-2 py-1 text-left text-xs text-[var(--app-text)] hover:bg-[var(--app-faint)]"
              >
                {p.label}
              </button>
            ))}
            <p className="mt-2 max-w-32 text-[11px] leading-snug text-[var(--app-muted)]">
              {draftFrom === null ? 'Click a start day, then an end day.' : `Start ${label(draftFrom)} - now pick the end day.`}
            </p>
          </div>

          <div className="flex gap-4">
            {[0, 1].map((offset) => {
              const m = new Date(month.getFullYear(), month.getMonth() + offset, 1);
              return (
                <Month
                  key={offset}
                  month={m}
                  range={shown}
                  min={min}
                  max={max}
                  onPick={pick}
                  onHover={setHover}
                  prev={offset === 0 ? () => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1)) : undefined}
                  next={offset === 1 ? () => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1)) : undefined}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function Month({ month, range, min, max, onPick, onHover, prev, next }: {
  month: Date;
  range: { from: string; to: string };
  min?: string;
  max?: string;
  onPick: (day: string) => void;
  onHover: (day: string | null) => void;
  prev?: () => void;
  next?: () => void;
}) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7; // Monday first
  const cells: (string | null)[] = [...Array(lead).fill(null)];
  for (let d = 1; d <= daysInMonth; d++) cells.push(fmt(new Date(month.getFullYear(), month.getMonth(), d)));
  while (cells.length % 7) cells.push(null);

  return (
    <div className="w-60" onMouseLeave={() => onHover(null)}>
      <div className="mb-1 flex items-center justify-between">
        <button type="button" onClick={prev} className={`rounded-md p-1 hover:bg-[var(--app-faint)] ${prev ? '' : 'invisible'}`} aria-label="Previous month">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold text-[var(--app-text)]">
          {month.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
        </span>
        <button type="button" onClick={next} className={`rounded-md p-1 hover:bg-[var(--app-faint)] ${next ? '' : 'invisible'}`} aria-label="Next month">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 text-center text-[11px] font-semibold text-[var(--app-muted)]">
        {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d) => <span key={d} className="py-1">{d}</span>)}
      </div>
      <div className="grid grid-cols-7 text-center text-sm">
        {cells.map((day, i) => {
          if (!day) return <span key={i} />;
          const disabled = (max !== undefined && day > max) || (min !== undefined && day < min);
          const inRange = day >= range.from && day <= range.to;
          const edge = day === range.from || day === range.to;
          return (
            <button
              key={day}
              type="button"
              disabled={disabled}
              onClick={() => onPick(day)}
              onMouseEnter={() => onHover(day)}
              className={[
                'h-8 w-full text-[var(--app-text)] disabled:opacity-30',
                inRange ? 'bg-[var(--app-brand-soft)]' : 'hover:bg-[var(--app-faint)]',
                day === range.from ? 'rounded-l-md' : '',
                day === range.to ? 'rounded-r-md' : '',
                edge ? '!bg-[var(--app-brand)] font-semibold !text-white' : '',
              ].join(' ')}
            >
              {Number(day.slice(8))}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── date helpers, all on local 'YYYY-MM-DD' strings ─── */

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function fmt(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parse(s: string) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function today() {
  return fmt(new Date());
}

function addDays(s: string, n: number) {
  const d = parse(s);
  d.setDate(d.getDate() + n);
  return fmt(d);
}

function monthOf(s: string) {
  const d = parse(s);
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function label(s: string) {
  return s ? parse(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
}
