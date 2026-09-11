'use client';

import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import { PmCompanyFilter } from '@/components/pm/PmCompanyFilter';
import { hasAnyFilter } from '@/lib/pm/params';
import { EMPTY_PM_FILTERS, type PmFilterOptions, type PmFilters } from '@/lib/pm/types';

/**
 * The shared filter bar (spec sections 6 and 23).
 *
 * The same object drives both views, so switching between the grid and the month
 * keeps what the planner had narrowed down.
 */
export function PmFilterBar({
  filters,
  options,
  onChange,
}: {
  filters: PmFilters;
  options: PmFilterOptions | undefined;
  onChange: (next: PmFilters) => void;
}) {
  const t = useTranslations('pmPlanning.filters');
  const set = (key: keyof PmFilters, value: string) => onChange({ ...filters, [key]: value });

  return (
    <div className="flex flex-wrap items-end gap-2">
      <Select
        label={t('serviceLine')}
        value={filters.serviceLine}
        options={options?.serviceLines ?? []}
        onChange={(value) => set('serviceLine', value)}
        allLabel={t('all')}
      />
      <Select
        label={t('region')}
        value={filters.region}
        options={options?.regions ?? []}
        onChange={(value) => set('region', value)}
        allLabel={t('all')}
      />
      <Select
        label={t('zone')}
        value={filters.zone}
        options={options?.zones ?? []}
        onChange={(value) => set('zone', value)}
        allLabel={t('all')}
      />
      <Select
        label={t('province')}
        value={filters.province}
        options={options?.provinces ?? []}
        onChange={(value) => set('province', value)}
        allLabel={t('all')}
      />
      <Select
        label={t('status')}
        value={filters.status}
        options={options?.statuses ?? []}
        onChange={(value) => set('status', value)}
        allLabel={t('all')}
      />
      <Select
        label={t('engineer')}
        value={filters.owner}
        options={options?.owners ?? []}
        onChange={(value) => set('owner', value)}
        allLabel={t('all')}
      />

      <PmCompanyFilter
        companies={options?.companies ?? []}
        excluded={filters.excludedCompanies}
        onChange={(excludedCompanies) => onChange({ ...filters, excludedCompanies })}
      />

      {hasAnyFilter(filters) && (
        <button
          type="button"
          onClick={() => onChange({ ...EMPTY_PM_FILTERS })}
          className="mb-0.5 inline-flex h-9 items-center gap-1 rounded-lg border border-[var(--app-border)] px-3 text-xs font-semibold text-[var(--app-muted)] transition hover:border-[var(--app-brand)] hover:text-[var(--app-brand-dark)]"
        >
          <X className="h-3.5 w-3.5" />
          {t('clear')}
        </button>
      )}
    </div>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
  allLabel,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  allLabel: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--app-muted)]">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 min-w-[9rem] rounded-lg border border-[var(--app-border)] bg-[var(--app-panel-alt)] px-2 text-sm text-[var(--app-text)] outline-none transition focus:border-[var(--app-brand)]"
      >
        <option value="">{allLabel}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
