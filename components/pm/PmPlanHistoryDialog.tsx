'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { AlertTriangle, ArrowRight, Loader2, Undo2, X } from 'lucide-react';
import { pmApi } from '@/lib/api';
import type { PmPlanChange } from '@/lib/pm/types';

/**
 * "Recent moves": every plan date changed from the planner, newest first, with who
 * changed it and an Undo on the ones that can still be undone.
 *
 * The record lives here because monday cannot keep it: the planner writes with one
 * API token, so monday's own history names that account for every move.
 */

/**
 * What an undo came to, to show where it was asked for. `done` when monday took it,
 * with the date the visit is back on (null: no date again).
 */
export type UndoNotice = { tone: 'info' | 'warn' | 'error'; text: string; done?: boolean; planDate?: string | null };

export function PmPlanHistoryDialog({
  locale,
  onClose,
  onUndo,
}: {
  locale: string;
  onClose: () => void;
  /** Runs the undo, confirmation included. Null when the person backed out. */
  onUndo: (change: PmPlanChange) => Promise<UndoNotice | null>;
}) {
  const t = useTranslations('pmPlanning');
  const [notice, setNotice] = useState<UndoNotice | null>(null);
  const [undoing, setUndoing] = useState<string | null>(null);

  const changes = useQuery({
    queryKey: ['pm-plan-changes'],
    queryFn: () => pmApi.planChanges().then((response) => response.data.data ?? []),
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // A confirmation open on top closes first; it handles its own Escape.
      if (e.key === 'Escape' && !document.querySelector('[role=alertdialog]')) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const day = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' });
  const moment = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' });
  const formatDay = (value: string | null) =>
    value ? day.format(new Date(`${value}T00:00:00`)) : t('table.noPlanDate');

  const undo = async (change: PmPlanChange) => {
    setUndoing(change.id);
    setNotice(null);
    try {
      const result = await onUndo(change);
      if (result) setNotice(result);
    } finally {
      setUndoing(null);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pm-history-title"
          className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl border border-[var(--app-border)] bg-[var(--app-panel)] shadow-2xl"
        >
          <div className="flex items-start gap-3 border-b border-[var(--app-border)] px-5 py-4">
            <div className="min-w-0 flex-1">
              <p id="pm-history-title" className="text-base font-bold text-[var(--app-text)]">
                {t('history.title')}
              </p>
              <p className="text-xs text-[var(--app-muted)]">{t('history.subtitle')}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={t('move.close')}
              className="rounded-lg p-1.5 text-[var(--app-muted)] transition hover:bg-[var(--app-faint)] hover:text-[var(--app-text)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            {notice && (
              <p
                className={`mb-3 flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${
                  notice.tone === 'error'
                    ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400'
                    : notice.tone === 'warn'
                      ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300'
                      : 'border-[var(--app-border)] bg-[var(--app-panel-alt)] text-[var(--app-muted)]'
                }`}
              >
                {notice.tone !== 'info' && <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
                {notice.text}
              </p>
            )}

            {changes.isPending && (
              <p className="flex items-center gap-2 text-sm text-[var(--app-muted)]">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('history.loading')}
              </p>
            )}
            {changes.isError && <p className="text-sm text-red-600 dark:text-red-400">{t('history.loadFailed')}</p>}
            {changes.data?.length === 0 && <p className="text-sm text-[var(--app-muted)]">{t('history.empty')}</p>}

            {changes.data && changes.data.length > 0 && (
              <ul className="divide-y divide-[var(--app-border)]">
                {changes.data.map((change) => (
                  <li key={change.id} className="flex items-start gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[var(--app-text)]">
                        {[change.visitName, change.siteName].filter(Boolean).join(' · ') || '—'}
                      </p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-sm text-[var(--app-text)]">
                        {change.action === 'UNDO' && (
                          <span className="text-xs font-semibold text-[var(--app-muted)]">{t('history.undoRow')}:</span>
                        )}
                        <span className={change.undone ? 'line-through opacity-60' : ''}>
                          {formatDay(change.oldPlanDate)}
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 text-[var(--app-muted)]" />
                        <span className={`font-semibold ${change.undone ? 'line-through opacity-60' : ''}`}>
                          {formatDay(change.newPlanDate)}
                        </span>
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--app-muted)]">
                        {t('history.by', { who: change.changedBy, when: moment.format(new Date(change.changedAt)) })}
                      </p>
                      {change.confirmedCompleted && (
                        <span className="mt-1 inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                          {t('history.confirmedTag')}
                        </span>
                      )}
                    </div>

                    <div className="shrink-0 pt-0.5 text-right text-xs">
                      {change.undoable ? (
                        <button
                          type="button"
                          onClick={() => void undo(change)}
                          disabled={undoing != null}
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--app-border)] px-2.5 font-semibold text-[var(--app-text)] transition hover:border-[var(--app-brand)] disabled:opacity-50"
                        >
                          {undoing === change.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Undo2 className="h-3.5 w-3.5" />
                          )}
                          {undoing === change.id ? t('move.undoing') : t('move.undo')}
                        </button>
                      ) : change.undone ? (
                        <span className="font-semibold text-[var(--app-muted)]">{t('history.undoneTag')}</span>
                      ) : change.action === 'MOVE' && change.visitName ? (
                        <span className="text-[var(--app-muted)]">{t('history.movedAgain')}</span>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
