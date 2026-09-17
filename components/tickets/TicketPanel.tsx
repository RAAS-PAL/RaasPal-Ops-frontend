import type { ReactNode } from 'react';

/**
 * The card every block on the tickets page sits in. One place for the border,
 * radius and heading style so the charts, lists and table line up as one system.
 */
export function TicketPanel({
  title,
  hint,
  action,
  children,
  className = '',
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`flex min-w-0 flex-col rounded-2xl border border-[var(--app-border)] bg-[var(--app-panel)] p-4 sm:p-5 ${className}`}
    >
      <header className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-[var(--app-text)]">{title}</h3>
          {hint && <p className="mt-0.5 text-xs text-[var(--app-muted)]">{hint}</p>}
        </div>
        {action}
      </header>
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  );
}

/** A quiet, centred line for a block with nothing to draw. */
export function PanelEmpty({ children }: { children: ReactNode }) {
  return (
    <p className="flex h-full min-h-[120px] items-center justify-center text-sm text-[var(--app-muted)]">
      {children}
    </p>
  );
}
