/**
 * Horizontal two-part proportion bar — the Local/BKK vs Province split.
 *
 * A ratio between two parts of one whole reads better as a single divided bar
 * than as the deck's pie, and it survives narrow layouts where a pie would not.
 */
type Props = {
  left: { label: string; value: number; color: string };
  right: { label: string; value: number; color: string };
  /** Unit shown after each count, e.g. "tickets". */
  unit?: string;
};

export function SplitBar({ left, right, unit }: Props) {
  const total = left.value + right.value;
  const pct = (v: number) => (total === 0 ? 0 : (v / total) * 100);

  return (
    <div>
      <div className="flex h-6 w-full overflow-hidden rounded-md" role="img"
           aria-label={`${left.label} ${left.value}, ${right.label} ${right.value}`}>
        {[left, right].map((part) => (
          <div
            key={part.label}
            className="flex items-center justify-center text-[10px] font-semibold text-white"
            style={{ width: `${pct(part.value)}%`, background: part.color }}
          >
            {pct(part.value) >= 14 && `${pct(part.value).toFixed(1)}%`}
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex flex-wrap justify-between gap-x-3 text-[11px] text-[var(--app-muted)]">
        {[left, right].map((part) => (
          <span key={part.label} className="inline-flex items-center gap-1.5">
            <span aria-hidden className="h-2.5 w-2.5 rounded-[2px]" style={{ background: part.color }} />
            {part.label}
            <span className="font-semibold text-[var(--app-text)]">
              {part.value}
              {unit ? ` ${unit}` : ''}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
