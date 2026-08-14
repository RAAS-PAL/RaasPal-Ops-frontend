'use client';

import { Fragment, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, ChevronDown, ChevronRight, Minus, Table2 } from 'lucide-react';
import { robotApi } from '@/lib/api';
import { SPEC_GROUPS, type SpecField } from '@/lib/robot-spec-fields';
import { ListSkeleton } from '@/components/ui/skeleton';
import type { RobotSpecMatrixRow } from '@/types/api';

/**
 * Side-by-side specification comparison, transposed from the source datasheet.
 *
 * The spreadsheet is models-as-rows across 103 columns, which in a browser means
 * scrolling sideways through a hundred columns to read one machine. Here specs are
 * rows and models are columns: 12 columns fit, ~101 rows scroll vertically the way
 * a page normally does, and comparing one figure across the range — the actual
 * reason to open this — is a single horizontal glance.
 *
 * Both the header row and the label column are sticky, so neither the spec you are
 * reading nor the model you are reading it for can scroll out of view.
 */

/** A spec counts as "recorded" only if it is neither null nor blank. */
const hasValue = (v: unknown) => v !== null && v !== undefined && v !== '';

/* ─── Cell rendering ──────────────────────────────────────────────────────── */

function SpecCell({ field, value }: { field: SpecField; value: unknown }) {
  // NULL means "not recorded", which is different from zero or false. Showing a
  // dash keeps that distinction visible instead of implying the robot lacks the
  // feature — the datasheet's N/A entries land here.
  if (value === null || value === undefined || value === '') {
    return <span className="text-[var(--app-muted)] opacity-40">—</span>;
  }

  if (field.kind === 'bool') {
    return value === true || value === 'true' ? (
      <Check className="mx-auto h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-label="yes" />
    ) : (
      <Minus className="mx-auto h-3.5 w-3.5 text-[var(--app-muted)] opacity-40" aria-label="no" />
    );
  }

  if (field.kind === 'number') {
    const num = typeof value === 'number' ? value : Number(value);
    if (!Number.isNaN(num)) {
      // Excel float noise (4.5999999999999996) would otherwise render in full.
      const shown = Number.isInteger(num) ? num.toLocaleString() : String(Math.round(num * 100) / 100);
      return (
        <span className="tabular-nums">
          {shown}
          {field.unit && <span className="ml-1 text-[10px] text-[var(--app-muted)]">{field.unit}</span>}
        </span>
      );
    }
  }

  return <span>{String(value)}</span>;
}

/* ─── Matrix ──────────────────────────────────────────────────────────────── */

export function RobotSpecMatrix() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['robot-spec-matrix'],
    queryFn: () => robotApi.specMatrix().then((r) => r.data.data),
  });

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [hideEmpty, setHideEmpty] = useState(true);

  // An empty selection means "no filter", not "show nothing" — nobody opens this
  // page wanting a blank table, so the empty state is far more likely to be
  // someone who has not chosen yet.
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const rows: RobotSpecMatrixRow[] = useMemo(() => data ?? [], [data]);

  function toggleGroup(name: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  // Counts shown on the filter chips. Computed against hideEmpty but NOT against
  // the selection, so a chip always reports how many rows picking it would add —
  // otherwise unticked groups would all read zero.
  const groupCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const g of SPEC_GROUPS) {
      counts[g.name] = hideEmpty
        ? g.fields.filter((f) => rows.some((r) => hasValue(r.specs[f.key]))).length
        : g.fields.length;
    }
    return counts;
  }, [rows, hideEmpty]);

  // A spec nobody has filled in is noise in a comparison view, and roughly a third
  // of the datasheet is N/A for every model. Hiding those by default keeps the
  // table about differences; the toggle restores the full sheet when you need to
  // see exactly which fields are missing.
  const groups = useMemo(() => {
    const chosen =
      selected.size === 0 ? SPEC_GROUPS : SPEC_GROUPS.filter((g) => selected.has(g.name));
    if (!hideEmpty) return chosen;
    return chosen
      .map((g) => ({ ...g, fields: g.fields.filter((f) => rows.some((r) => hasValue(r.specs[f.key]))) }))
      .filter((g) => g.fields.length > 0);
  }, [rows, hideEmpty, selected]);

  if (isLoading) return <ListSkeleton />;

  if (isError) {
    return (
      <div className="rounded-xl border border-[var(--app-border)] p-8 text-center text-sm text-[var(--app-muted)]">
        Could not load the specification matrix.
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--app-border)] p-10 text-center">
        <Table2 className="mx-auto mb-3 h-8 w-8 text-[var(--app-muted)] opacity-40" />
        <p className="text-sm font-semibold">No specifications yet</p>
        <p className="mt-1 text-sm text-[var(--app-muted)]">
          Models appear here once they have a row in the cleaning specification table.
        </p>
      </div>
    );
  }

  const visibleFieldCount = groups.reduce((sum, g) => sum + g.fields.length, 0);

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--app-muted)]">
          <span className="font-semibold text-[var(--app-text)]">{rows.length}</span> models ·{' '}
          <span className="font-semibold text-[var(--app-text)]">{visibleFieldCount}</span> specifications
          {selected.size > 0 && (
            <span className="ml-1.5 text-[var(--app-brand-dark)]">
              ({selected.size} {selected.size === 1 ? 'category' : 'categories'})
            </span>
          )}
        </p>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--app-muted)]">
          <input
            type="checkbox"
            checked={hideEmpty}
            onChange={(e) => setHideEmpty(e.target.checked)}
            className="h-4 w-4 rounded border-[var(--app-border)] accent-[var(--app-brand)]"
          />
          Hide specs no model has
        </label>
      </div>

      {/* Category filter — nothing ticked shows everything */}
      <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-3">
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="text-xs font-bold uppercase tracking-wide text-[var(--app-muted)]">
            Filter by category
          </span>
          {selected.size > 0 ? (
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="text-xs font-semibold text-[var(--app-brand-dark)] hover:underline"
            >
              Clear
            </button>
          ) : (
            <span className="text-xs text-[var(--app-muted)] opacity-70">
              Nothing ticked — showing all
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {SPEC_GROUPS.map((g) => {
            const isOn = selected.has(g.name);
            const count = groupCounts[g.name] ?? 0;
            // A category whose specs are all blank cannot contribute rows while
            // "hide empty" is on, so ticking it would appear to do nothing.
            const isEmpty = count === 0;
            return (
              <label
                key={g.name}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
                  isOn
                    ? 'border-[var(--app-brand)] bg-[var(--app-brand)] text-white'
                    : 'border-[var(--app-border)] text-[var(--app-muted)] hover:border-[var(--app-brand)] hover:text-[var(--app-brand-dark)]'
                } ${isEmpty && !isOn ? 'opacity-40' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={isOn}
                  onChange={() => toggleGroup(g.name)}
                  className="h-3.5 w-3.5 rounded border-[var(--app-border)] accent-[var(--app-brand)]"
                />
                {g.name}
                <span className={isOn ? 'opacity-80' : 'opacity-60'}>{count}</span>
              </label>
            );
          })}
        </div>
      </div>

      {groups.length === 0 && (
        <div className="rounded-xl border border-dashed border-[var(--app-border)] py-12 text-center">
          <p className="text-sm font-semibold">Nothing to show</p>
          <p className="mt-1 text-sm text-[var(--app-muted)]">
            The selected categories have no recorded values. Clear the filter, or untick
            &ldquo;hide specs no model has&rdquo; to see the blank rows.
          </p>
        </div>
      )}

      {/* The table scrolls inside its own box so the page itself never scrolls sideways. */}
      <div
        className={`overflow-auto rounded-xl border border-[var(--app-border)] ${groups.length === 0 ? 'hidden' : ''}`}
        style={{ maxHeight: '75vh' }}
      >
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th
                className="sticky left-0 top-0 z-30 min-w-[220px] border-b border-r border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-[var(--app-muted)]"
              >
                Specification
              </th>
              {rows.map((r) => (
                <th
                  key={r.robotId}
                  className="sticky top-0 z-20 min-w-[130px] border-b border-l border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-2.5 text-center align-bottom"
                >
                  <span className="block text-[10px] font-semibold uppercase tracking-wide text-[var(--app-muted)]">
                    {r.brand}
                  </span>
                  <span className="block text-xs font-bold leading-tight text-[var(--app-text)]">{r.model}</span>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {groups.map((group) => {
              const isCollapsed = collapsed[group.name];
              return (
                <Fragment key={group.name}>
                  <tr>
                    <th
                      colSpan={rows.length + 1}
                      className="sticky left-0 z-10 border-y border-[var(--app-border)] bg-[var(--app-faint)] px-3 py-1.5 text-left"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setCollapsed((c) => ({ ...c, [group.name]: !c[group.name] }))
                        }
                        className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[var(--app-muted)] hover:text-[var(--app-brand-dark)]"
                      >
                        {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        {group.name}
                        <span className="opacity-60">({group.fields.length})</span>
                      </button>
                    </th>
                  </tr>

                  {!isCollapsed &&
                    group.fields.map((field) => (
                      <tr key={field.key} className="hover:bg-[var(--app-faint)]">
                        <th
                          scope="row"
                          className="sticky left-0 z-10 border-b border-r border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-1.5 text-left font-medium"
                        >
                          {field.label}
                          {field.unit && (
                            <span className="ml-1.5 text-[10px] font-normal text-[var(--app-muted)]">
                              {field.unit}
                            </span>
                          )}
                        </th>
                        {rows.map((r) => (
                          <td
                            key={r.robotId}
                            className="border-b border-l border-[var(--app-border)] px-3 py-1.5 text-center"
                          >
                            <SpecCell field={field} value={r.specs[field.key]} />
                          </td>
                        ))}
                      </tr>
                    ))}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
