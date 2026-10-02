/**
 * Keeps the reader's place across a language switch.
 *
 * Switching language changes the [locale] segment of the URL; the router used to
 * jump to the top for it, and the text of the other language lays out to a different
 * height, so the reader lost their place either way. Just before the switch the
 * scroll position of the window, and of every scroll box marked
 * `data-keep-scroll="<name>"`, is put in sessionStorage; the rebuilt page puts it back.
 *
 * The window is put back by a row rather than by pixels where it can be: the other
 * language's text wraps differently above the list, so the same scrollY lands a line
 * or two away. Rows that can anchor carry `data-keep-anchor="<stable key>"`; the first
 * one on screen, and how far down the screen it was, are saved, and the rebuilt page
 * scrolls that row back to the same height.
 */

const KEY = 'raaspal:keep-place';

type Place = {
  /** The page it belongs to, without the locale: the path and its query string. */
  page: string;
  y: number;
  /** The first anchored row on screen and its distance from the top of the window. */
  anchor?: { key: string; top: number };
  boxes: Record<string, { top: number; left: number }>;
};

/** Below the sticky top bar: a row hidden under it is not what the reader was reading. */
const READING_LINE = 96;

function firstAnchorOnScreen(): Place['anchor'] {
  for (const row of document.querySelectorAll<HTMLElement>('[data-keep-anchor]')) {
    const rect = row.getBoundingClientRect();
    if (rect.bottom > READING_LINE) {
      return rect.top < window.innerHeight ? { key: row.dataset.keepAnchor!, top: rect.top } : undefined;
    }
  }
  return undefined;
}

export function rememberPlace(page: string): void {
  const boxes: Place['boxes'] = {};
  document.querySelectorAll<HTMLElement>('[data-keep-scroll]').forEach((box) => {
    boxes[box.dataset.keepScroll!] = { top: box.scrollTop, left: box.scrollLeft };
  });
  try {
    sessionStorage.setItem(
      KEY,
      JSON.stringify({ page, y: window.scrollY, anchor: firstAnchorOnScreen(), boxes } satisfies Place),
    );
  } catch {
    // Storage blocked: the page opens at the top, as it always did.
  }
}

/**
 * Puts the place back if it was saved for this page. The rebuilt page may still be
 * laying out, so it retries for about a second until the window is tall enough and
 * the boxes exist.
 */
export function restorePlace(page: string): void {
  let place: Place | null = null;
  try {
    const raw = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    place = raw ? (JSON.parse(raw) as Place) : null;
  } catch {
    return;
  }
  if (!place || place.page !== page) return;
  const saved = place;

  let frames = 0;
  let aligned = 0;
  const apply = () => {
    const last = ++frames >= 60;
    let waiting = false;

    const anchor = saved.anchor
      ? document.querySelector<HTMLElement>(`[data-keep-anchor="${CSS.escape(saved.anchor.key)}"]`)
      : null;
    const room = document.documentElement.scrollHeight - window.innerHeight;
    if (anchor) {
      window.scrollBy({ top: anchor.getBoundingClientRect().top - saved.anchor!.top, behavior: 'instant' });
      // Held for a few frames: the other language's text can land a frame later and
      // push the row again.
      if (++aligned < 12) waiting = true;
    } else if (!saved.anchor && (room >= saved.y || last)) {
      window.scrollTo({ top: saved.y, behavior: 'instant' });
    } else if (saved.anchor && last) {
      window.scrollTo({ top: saved.y, behavior: 'instant' }); // the row is gone: pixels it is
    } else {
      waiting = true;
    }

    for (const [name, at] of Object.entries(saved.boxes)) {
      const box = document.querySelector<HTMLElement>(`[data-keep-scroll="${name}"]`);
      if (box && (box.scrollHeight - box.clientHeight >= at.top || last)) {
        box.scrollTop = at.top;
        box.scrollLeft = at.left;
      } else {
        waiting = true;
      }
    }
    if (waiting && !last) requestAnimationFrame(apply);
  };
  requestAnimationFrame(apply);
}
