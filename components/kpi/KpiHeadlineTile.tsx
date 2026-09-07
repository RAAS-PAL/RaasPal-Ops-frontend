/**
 * The six coloured summary tiles across the top of the KPI report.
 *
 * The tile is filled with the KPI's accent colour and always carries white text,
 * so it reads the same in light and dark — these are the deck's signature and
 * shouldn't re-theme.
 */
type Props = {
  label: string;
  value: string;
  detail: string;
  color: string;
};

export function KpiHeadlineTile({ label, value, detail, color }: Props) {
  return (
    <div
      className="flex min-w-0 flex-col items-center justify-center rounded-xl px-3 py-3 text-center text-white shadow-sm"
      style={{ background: color }}
    >
      <p className="truncate text-[11px] font-medium leading-tight opacity-95">{label}</p>
      <p className="mt-1 text-2xl font-bold leading-none tracking-tight">{value}</p>
      <p className="mt-1 truncate text-[10px] leading-tight opacity-90">{detail}</p>
    </div>
  );
}
