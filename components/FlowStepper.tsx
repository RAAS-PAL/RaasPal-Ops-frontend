'use client';

import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';

const STEPS = ['upload', 'recommendation', 'proposal'] as const;

export type FlowStep = (typeof STEPS)[number];

/**
 * FlowStepper — always-visible pipeline position for the Generate Solution
 * flow (Upload survey → Review recommendations → Generate proposal), so
 * operators know which stage they are in and what comes next.
 */
export function FlowStepper({ current }: { current: FlowStep }) {
  const t = useTranslations('generateSolution.stepper');
  const currentIndex = STEPS.indexOf(current);

  return (
    <ol aria-label={t('ariaLabel')} className="flex items-center gap-2">
      {STEPS.map((step, index) => {
        const done = index < currentIndex;
        const active = index === currentIndex;

        return (
          <li key={step} className="flex min-w-0 flex-1 items-center gap-2 last:flex-none">
            <span
              aria-current={active ? 'step' : undefined}
              className="flex min-w-0 items-center gap-2"
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition ${
                  done
                    ? 'bg-[var(--app-brand)] text-white'
                    : active
                      ? 'bg-[var(--app-brand-soft)] text-[var(--app-brand-dark)] ring-2 ring-[var(--app-brand)]'
                      : 'bg-[var(--app-faint)] text-[var(--app-muted)]'
                }`}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : index + 1}
              </span>
              <span
                className={`hidden truncate text-xs font-semibold sm:block ${
                  active
                    ? 'text-[var(--app-brand-dark)]'
                    : done
                      ? 'text-[var(--app-text)]'
                      : 'text-[var(--app-muted)]'
                }`}
              >
                {t(step)}
              </span>
            </span>
            {index < STEPS.length - 1 && (
              <span
                aria-hidden
                className={`h-px min-w-4 flex-1 rounded ${
                  done ? 'bg-[var(--app-brand)]' : 'bg-[var(--app-border-strong)]'
                }`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
