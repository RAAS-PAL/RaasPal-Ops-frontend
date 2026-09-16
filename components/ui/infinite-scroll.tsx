'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Reveals more of a list as the reader reaches the bottom of it.
 *
 * <p>Put this after the rows: when it scrolls into view it calls {@code onReach}, which
 * the list answers by raising how many rows it renders. A sentinel watched by
 * `IntersectionObserver` rather than a scroll handler, so nothing runs on the frames
 * between — a scroll listener on a 70-row catalogue costs more than the rows do.
 *
 * <p><strong>One batch per intersection.</strong> The first version fired again as soon
 * as the observer re-reported the sentinel, which on a tall screen is immediately: each
 * batch is revealed, the sentinel is still in view, and the whole list unrolls in one
 * go — the exact thing this is meant to avoid. Now each call arms a latch that only the
 * sentinel *leaving* view resets, so a batch is revealed, and the next one waits for the
 * reader to scroll again.
 *
 * <p>The margin is deliberately small for the same reason: enough to load just before
 * the reader arrives, not enough to run ahead of them.
 *
 * <p>Once everything is shown the sentinel is not rendered at all, so the observer has
 * nothing to watch and the list ends where it ends. The count stays visible above the
 * list; this replaces page numbers, not the sense of how much there is.
 */
export function InfiniteScroll({
  hasMore,
  onReach,
  label,
}: {
  hasMore: boolean;
  onReach: () => void;
  /** Shown at the end of the list, e.g. "Showing 12 of 70". */
  label?: string;
}) {
  const sentinel = useRef<HTMLDivElement>(null);
  // Held in a ref, written in an effect rather than during render, so the observer
  // below is created once and not on every render that hands us a fresh callback.
  const reach = useRef(onReach);
  useEffect(() => {
    reach.current = onReach;
  }, [onReach]);

  // Whether a reveal has been asked for and not yet been scrolled past. See the note
  // about one batch per intersection above.
  const armed = useRef(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = sentinel.current;
    if (!node || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const showing = entries.some((e) => e.isIntersecting);
        setVisible(showing);
        if (!showing) {
          armed.current = false;
          return;
        }
        if (armed.current) return;
        armed.current = true;
        reach.current();
      },
      { rootMargin: '120px 0px' },
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
      {visible && <Loader2 className="h-4 w-4 animate-spin" />}
      {label}
    </div>
  );
}
