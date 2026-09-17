/**
 * Shown when the selected period has no data behind it.
 *
 * The placeholder fixtures only cover the deck's Jan–Jun 2026. Rather than
 * re-rendering those numbers under whatever heading was picked — which would
 * quietly misattribute them — the section says what it has and offers a way
 * back to it.
 */
import { CalendarX } from 'lucide-react';

type Props = {
  title: string;
  body: string;
  actionLabel: string;
  onAction: () => void;
};

export function NoPeriodData({ title, body, actionLabel, onAction }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[var(--app-border-strong)] bg-[var(--app-panel-soft)] px-6 py-14 text-center">
      <CalendarX className="h-6 w-6 text-[var(--app-muted)]" />
      <div>
        <p className="text-sm font-semibold text-[var(--app-text)]">{title}</p>
        <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-[var(--app-muted)]">{body}</p>
      </div>
      <button
        type="button"
        onClick={onAction}
        className="rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)] px-3 py-1.5 text-xs font-semibold text-[var(--app-text)] transition hover:border-[var(--app-brand)] hover:text-[var(--app-brand-dark)]"
      >
        {actionLabel}
      </button>
    </div>
  );
}
