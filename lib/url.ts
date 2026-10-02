/**
 * Writes some of a page's state into the query string without navigating, keeping
 * every other parameter. A null or empty value removes its parameter.
 *
 * Why the state is in the URL at all: a reload, a shared link and a language switch
 * all rebuild the page from its address, so whatever is only in memory - a tab, a
 * period, a filter - comes back at its default. replaceState rather than push,
 * because refining one view is not navigation and should not fill the back button.
 */
export function setQueryParams(values: Record<string, string | null | undefined>): void {
  const params = new URLSearchParams(window.location.search);
  for (const [key, value] of Object.entries(values)) {
    if (value == null || value === '') params.delete(key);
    else params.set(key, value);
  }
  const query = params.toString();
  window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`);
}
