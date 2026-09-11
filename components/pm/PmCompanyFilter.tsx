'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Building2, Check, ChevronDown, Search } from 'lucide-react';
import type { PmCompanyOption } from '@/lib/pm/types';

/**
 * The company filter.
 *
 * <p>Every chain starts ticked and you untick the ones to hide, because the
 * question a planner actually has is "show me everything except Makro" — with 177
 * chains, expressing that as a selection means ticking 176 boxes. Only the
 * unticked names are held in state, so the default costs nothing and the URL stays
 * short.
 *
 * <p>Select-all and none act on what the search box is currently showing, which is
 * what makes a whole chain removable in two moves: type it, press None.
 */
export function PmCompanyFilter({
  companies,
  excluded,
  onChange,
}: {
  companies: PmCompanyOption[];
  excluded: string[];
  onChange: (excluded: string[]) => void;
}) {
  const t = useTranslations('pmPlanning.company');
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on an outside click, so the panel behaves like the native selects beside it.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const excludedSet = useMemo(() => new Set(excluded), [excluded]);

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return companies;
    return companies.filter((company) => company.name.toLowerCase().includes(needle));
  }, [companies, search]);

  const setExcluded = (next: Set<string>) => onChange([...next]);

  const toggle = (name: string) => {
    const next = new Set(excludedSet);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    setExcluded(next);
  };

  /** Tick everything currently listed. */
  const selectVisible = () => {
    const next = new Set(excludedSet);
    visible.forEach((company) => next.delete(company.name));
    setExcluded(next);
  };

  /** Untick everything currently listed — the "hide this whole chain" move. */
  const clearVisible = () => {
    const next = new Set(excludedSet);
    visible.forEach((company) => next.add(company.name));
    setExcluded(next);
  };

  const label = excluded.length === 0 ? t('all') : t('excludedCount', { count: excluded.length });

  return (
    <div className="flex flex-col gap-1" ref={containerRef}>
      <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--app-muted)]">
        {t('label')}
      </span>

      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-haspopup="listbox"
          className={`inline-flex h-9 min-w-[11rem] items-center gap-2 rounded-lg border px-2 text-sm transition ${
            excluded.length > 0
              ? 'border-[var(--app-brand)] bg-[var(--app-brand-soft)] text-[var(--app-brand-dark)]'
              : 'border-[var(--app-border)] bg-[var(--app-panel-alt)] text-[var(--app-text)]'
          }`}
        >
          <Building2 className="h-3.5 w-3.5 shrink-0 opacity-70" />
          <span className="truncate">{label}</span>
          <ChevronDown className="ml-auto h-3.5 w-3.5 shrink-0 opacity-70" />
        </button>

        {open && (
          // right-0, not left-0: this is the last filter in the row, so a panel
          // growing rightwards runs off the viewport and puts the whole page into
          // horizontal scroll. max-w keeps it on screen on a narrow window too.
          <div className="absolute right-0 z-40 mt-1 w-[22rem] max-w-[calc(100vw-2rem)] rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-2 shadow-xl">
            <div className="relative mb-2">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--app-muted)]" />
              <input
                type="text"
                autoFocus
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t('searchPlaceholder')}
                className="h-8 w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-panel-alt)] pl-8 pr-2 text-sm outline-none focus:border-[var(--app-brand)]"
              />
            </div>

            <div className="mb-2 flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={selectVisible}
                className="rounded-md border border-[var(--app-border)] px-2 py-1 font-semibold text-[var(--app-muted)] transition hover:border-[var(--app-brand)] hover:text-[var(--app-brand-dark)]"
              >
                {search ? t('selectMatching') : t('selectAll')}
              </button>
              <button
                type="button"
                onClick={clearVisible}
                className="rounded-md border border-[var(--app-border)] px-2 py-1 font-semibold text-[var(--app-muted)] transition hover:border-[var(--app-brand)] hover:text-[var(--app-brand-dark)]"
              >
                {search ? t('clearMatching') : t('clearAll')}
              </button>
              <span className="ml-auto text-[var(--app-muted)]">
                {t('showing', { count: visible.length, total: companies.length })}
              </span>
            </div>

            <ul className="max-h-72 overflow-y-auto" role="listbox" aria-multiselectable>
              {visible.length === 0 && (
                <li className="px-2 py-4 text-center text-xs text-[var(--app-muted)]">{t('noMatches')}</li>
              )}
              {visible.map((company) => {
                const included = !excludedSet.has(company.name);
                return (
                  <li key={company.name}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={included}
                      onClick={() => toggle(company.name)}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition hover:bg-[var(--app-panel-alt)]"
                    >
                      <span
                        aria-hidden
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                          included
                            ? 'border-[var(--app-brand)] bg-[var(--app-brand)] text-white'
                            : 'border-[var(--app-border)]'
                        }`}
                      >
                        {included && <Check className="h-3 w-3" strokeWidth={3} />}
                      </span>
                      <span className={`truncate ${included ? '' : 'text-[var(--app-muted)] line-through'}`}>
                        {company.name}
                      </span>
                      <span className="ml-auto shrink-0 text-xs tabular-nums text-[var(--app-muted)]">
                        {company.siteCount}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
