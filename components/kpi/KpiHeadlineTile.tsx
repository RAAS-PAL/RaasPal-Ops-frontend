/**
 * The six coloured summary tiles across the top of the KPI report.
 *
 * The tile is filled with the KPI's accent colour and always carries white text,
 * so it reads the same in light and dark — these are the deck's signature and
 * shouldn't re-theme.
 *
 * A placeholder tile (a KPI with no backend source) keeps the colour so the
 * deck's layout holds, but is dashed and badged: the distinction between a
 * computed number and a copied one has to survive a glance at a board slide.
 */
type Props = {
  label: string;
  value: string;
  detail: string;
  color: string;
  /** Badge text; its presence marks the tile as a placeholder. */
  badge?: string;
};

export function KpiHeadlineTile({ label, value, detail, color, badge }: Props) {
  const placeholder = Boolean(badge);
  return (
    <div
      className={`relative flex min-w-0 flex-col items-center justify-center rounded-xl px-3 py-3 text-center text-white shadow-sm ${
        placeholder ? 'border-2 border-dashed border-white/70 opacity-80' : ''
      }`}
      style={{ background: color }}
    >
      {placeholder && (
        <span className="absolute right-1.5 top-1.5 rounded bg-white/90 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-black/70">
          {badge}
        </span>
      )}
      <p className="truncate text-[11px] font-medium leading-tight opacity-95">{label}</p>
      <p className="mt-1 text-2xl font-bold leading-none tracking-tight">{value}</p>
      <p className="mt-1 min-h-[1em] truncate text-[10px] leading-tight opacity-90">{detail}</p>
    </div>
  );
}
