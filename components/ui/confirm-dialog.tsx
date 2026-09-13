'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle, Mail, Trash2 } from 'lucide-react';

/**
 * A confirmation step for the buttons that reach outside the team or cannot be undone:
 * anything that emails a customer, deletes a record, or revokes access.
 *
 * <p>Two things this does that the browser's own confirm() does not. It says what will
 * happen in the app's words, with the number of recipients or the name of the thing,
 * so the reader is confirming a specific act and not a generic "are you sure". And it
 * puts focus on Cancel: a stray Enter on a page where the send button already had focus
 * is the exact accident this exists to prevent.
 *
 * <p>Usage:
 * <pre>
 *   const { confirm, confirmDialog } = useConfirm();
 *   onClick={() => void confirm({ ... }).then((ok) => ok && mutate())}
 *   ...
 *   {confirmDialog}
 * </pre>
 */

export interface ConfirmOptions {
  title: string;
  /** What will happen, in one or two sentences. Say who receives it or what is lost. */
  message: ReactNode;
  /** The button's own label — "Send to 12 customers", "Revoke key" — never a bare "OK". */
  confirmLabel: string;
  /** danger = destructive or outward-facing (red). primary = consequential but ordinary. */
  tone?: 'danger' | 'primary';
  /** Which icon sits beside the title. */
  kind?: 'send' | 'delete' | 'warn';
}

interface Pending extends ConfirmOptions {
  resolve: (ok: boolean) => void;
}

export function useConfirm() {
  const [pending, setPending] = useState<Pending | null>(null);

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        setPending({ ...options, resolve });
      }),
    [],
  );

  const settle = useCallback(
    (ok: boolean) => {
      setPending((p) => {
        p?.resolve(ok);
        return null;
      });
    },
    [],
  );

  const confirmDialog = pending ? (
    <ConfirmDialog
      title={pending.title}
      message={pending.message}
      confirmLabel={pending.confirmLabel}
      tone={pending.tone ?? 'danger'}
      kind={pending.kind ?? 'warn'}
      onConfirm={() => settle(true)}
      onCancel={() => settle(false)}
    />
  ) : null;

  return { confirm, confirmDialog };
}

const ICON = {
  send: Mail,
  delete: Trash2,
  warn: AlertTriangle,
};

function ConfirmDialog({
  title,
  message,
  confirmLabel,
  tone,
  kind,
  onConfirm,
  onCancel,
}: Required<Omit<ConfirmOptions, 'tone' | 'kind'>> & {
  tone: NonNullable<ConfirmOptions['tone']>;
  kind: NonNullable<ConfirmOptions['kind']>;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const t = useTranslations('common');
  const cancelRef = useRef<HTMLButtonElement>(null);
  const Icon = ICON[kind];

  // Focus lands on Cancel, and Escape cancels. See the component comment for why.
  useEffect(() => {
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const confirmClass =
    tone === 'danger'
      ? 'bg-red-600 text-white hover:bg-red-700'
      : 'bg-[var(--app-brand)] text-white hover:opacity-90';
  const iconClass =
    tone === 'danger'
      ? 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300'
      : 'bg-[var(--app-brand-soft)] text-[var(--app-brand-dark)]';

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
          aria-describedby="confirm-dialog-message"
          className="w-full max-w-md rounded-2xl border border-[var(--app-border)] bg-[var(--app-panel)] p-6 shadow-2xl"
        >
          <div className="flex items-start gap-4">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconClass}`}>
              <Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p id="confirm-dialog-title" className="text-base font-bold text-[var(--app-text)]">
                {title}
              </p>
              <div id="confirm-dialog-message" className="mt-1.5 text-sm text-[var(--app-muted)]">
                {message}
              </div>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <button
              ref={cancelRef}
              type="button"
              onClick={onCancel}
              className="rounded-lg border border-[var(--app-border)] px-4 py-2 text-sm font-semibold text-[var(--app-text)] transition hover:bg-[var(--app-faint)] focus:outline-none focus:ring-2 focus:ring-[var(--app-brand)]"
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className={`rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition focus:outline-none focus:ring-2 focus:ring-offset-2 ${confirmClass}`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
