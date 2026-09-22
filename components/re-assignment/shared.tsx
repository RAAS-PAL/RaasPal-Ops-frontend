'use client';

import type { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { levelClass, levelText } from '@/lib/re-assignment/types';

/** The card every block on the RE pages sits in. */
export function Card({ title, hint, action, children }: {
  title?: string;
  hint?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-panel)] p-4 sm:p-5">
      {(title || action) && (
        <header className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {title && <h3 className="text-sm font-semibold text-[var(--app-text)]">{title}</h3>}
            {hint && <p className="mt-0.5 text-xs text-[var(--app-muted)]">{hint}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function LevelBadge({ level, prefix }: { level: number | null | undefined; prefix?: string }) {
  return (
    <span className={`inline-flex min-w-9 justify-center rounded-md px-1.5 py-0.5 text-xs font-semibold ${levelClass(level)}`}>
      {prefix ? `${prefix} ` : ''}
      {levelText(level)}
    </span>
  );
}

export function ErrorLine({ error, fallback }: { error: unknown; fallback: string }) {
  if (!error) return null;
  return (
    <p className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      {errorMessage(error, fallback)}
    </p>
  );
}

export function errorMessage(e: unknown, fallback: string): string {
  const ax = e as { response?: { data?: { message?: string } }; message?: string };
  return ax?.response?.data?.message ?? fallback;
}

export const inputClass =
  'h-9 rounded-lg border border-[var(--app-border)] bg-[var(--app-panel-alt)] px-3 text-sm text-[var(--app-text)] outline-none focus:border-[var(--app-brand)]';

export const primaryButton =
  'inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--app-brand)] px-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-50';

export const secondaryButton =
  'inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)] px-3 text-sm font-medium text-[var(--app-text)] transition hover:border-[var(--app-brand)] disabled:opacity-50';

export function fmtDate(iso: string | null | undefined, locale: string): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso));
}

export function fmtDateTime(iso: string | null | undefined, locale: string): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}
