/**
 * A KPI area that is named but not built yet.
 *
 * Utilization and Repeat Cost were drawn from the Jan–Jun 2026 deck's own
 * numbers: fixtures, with no backend source and no agreed formula. Charts drawn
 * from those sit beside the report's real, computed figures and read as the same
 * kind of number, which is the one thing they must not do — a board cannot tell
 * them apart by looking.
 *
 * So the whole screen says so instead of showing them. The entry stays in the
 * nav because the work is planned and people ask where it went; what changes is
 * that nothing here can be mistaken for a measurement.
 */
import { Hourglass } from 'lucide-react';

type Props = {
  title: string;
  body: string;
  /** What has to exist before this can be built — the honest blocker, not a date. */
  needs: string;
};

export function KpiComingSoon({ title, body, needs }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[var(--app-border-strong)] bg-[var(--app-panel-soft)] px-6 py-20 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--app-brand-soft)]">
        <Hourglass className="h-5 w-5 text-[var(--app-brand-dark)]" />
      </span>
      <div>
        <p className="text-base font-semibold text-[var(--app-text)]">{title}</p>
        <p className="mx-auto mt-1.5 max-w-md text-xs leading-relaxed text-[var(--app-muted)]">{body}</p>
      </div>
      <p className="mx-auto max-w-md rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)] px-3 py-2 text-[11px] leading-relaxed text-[var(--app-muted)]">
        {needs}
      </p>
    </div>
  );
}
