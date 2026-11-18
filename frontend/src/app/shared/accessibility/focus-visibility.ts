export function revealKeyboardFocus(target: EventTarget | null, document: Document): void {
  const view = document.defaultView;
  if (!view || !(target instanceof view.HTMLElement) || !target.matches(':focus-visible')) return;
  view.requestAnimationFrame(() => {
    if (document.activeElement !== target || target.closest('dialog, .cdk-overlay-container, .sidebar')) return;
    const rect = target.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const bottom = [...document.querySelectorAll('app-top-navbar, .admin-header')].reduce((edge, header) => {
      const box = header.getBoundingClientRect();
      const position = view.getComputedStyle(header).position;
      return ['sticky', 'fixed'].includes(position) && box.top <= 1 && box.bottom > 0 ? Math.max(edge, box.bottom) : edge;
    }, 0);
    if (bottom && rect.top < bottom + 12) view.scrollBy({top: rect.top - bottom - 12, behavior: 'instant'});
  });
}
