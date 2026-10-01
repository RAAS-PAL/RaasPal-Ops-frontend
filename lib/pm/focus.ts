/**
 * The "you came from here" highlight: plays the fading ring or fill in globals.css on
 * an element once. Restarted if it is already playing, so a second arrival shows too.
 */
export function flash(element: HTMLElement, className: 'pm-focus-ring' | 'pm-focus-row'): void {
  element.classList.remove(className);
  void element.offsetWidth; // restart the animation
  element.classList.add(className);
  window.setTimeout(() => element.classList.remove(className), 2600);
}

/**
 * Scrolls a grid cell into the part of its scroll box that is not covered by the
 * frozen site column and header rows, centred - only when it is not already in view,
 * so a box restored to where the person left it does not jump.
 */
export function bringIntoView(container: HTMLElement, cell: HTMLElement): void {
  const box = container.getBoundingClientRect();
  const rect = cell.getBoundingClientRect();
  const frozenLeft = container.querySelector('tbody th[scope=row]')?.getBoundingClientRect().width ?? 0;
  const frozenTop = container.querySelector('thead')?.getBoundingClientRect().height ?? 0;
  const left = box.left + frozenLeft;
  const top = box.top + frozenTop;
  if (rect.left < left || rect.right > box.right) {
    container.scrollLeft += rect.left + rect.width / 2 - (left + box.right) / 2;
  }
  if (rect.top < top || rect.bottom > box.bottom) {
    container.scrollTop += rect.top + rect.height / 2 - (top + box.bottom) / 2;
  }
}
