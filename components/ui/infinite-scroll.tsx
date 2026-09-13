'use client';

import { useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Reveals more of a list as the reader reaches the bottom of it.
 *
 * <p>Put this after the rows: when it scrolls into view it calls {@code onReach}, which
 * the list answers by raising how many rows it renders. A sentinel watched by
 * `IntersectionObserver` rather than a scroll handler, so nothing runs on the frames
 * between — a scroll listener on a 69-row catalogue costs more than the rows do.
 *
 * <p>Once everything is shown the sentinel is not rendered at all, so the observer has
 * nothing to watch and the list ends where it ends. The count stays visible above the
 * list; this replaces page numbers, not the sense of how much there is.
 *
 * <p>`rootMargin` fires it a screen early, so the next rows are usually already there
 * by the time the reader would have noticed a gap.
 */
export function InfiniteScroll({
  hasMore,
  onReach,
  label,
}: {
  hasMore: boolean;
  onReach: () => void;
  /** Shown while more rows are being revealed, e.g. "Showing 27 of 69". */
  label?: string;
}) {
  const sentinel = useRef<HTMLDivElement>(null);
  // Kept in a ref so the observer is created once, not on every render that changes
  // the callback identity.
  const reach = useRef(onReach);
  reach.current = onReach;

  useEffect(() => {
    const node = sentinel.current;
    if (!node || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) reach.current();
      },
      { rootMargin: '600px 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore]);

  if (!hasMore) return null;

  return (
    <div
      ref={sentinel}
      className="flex items-center justify-center gap-2 py-6 text-sm text-[var(--app-muted)]"
      aria-live="polite"
    >
      <Loader2 className="h-4 w-4 animate-spin" />
      {label}
    </div>
  );
}
