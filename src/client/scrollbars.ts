/** Show overlay scrollbars only while a pane is actively scrolling. */

const SCROLL_TARGETS =
  '.content, .sidebar-scroll, .sidebar-right, .search-results, .graph-links ul, .content pre, .content table, .katex-display';

export function initScrollbars(): void {
  const timers = new WeakMap<Element, number>();

  const onScroll = (event: Event): void => {
    const el = event.currentTarget as HTMLElement | null;
    if (!el) return;
    el.classList.add('is-scrolling');
    const prev = timers.get(el);
    if (prev) window.clearTimeout(prev);
    const next = window.setTimeout(() => {
      el.classList.remove('is-scrolling');
      timers.delete(el);
    }, 900);
    timers.set(el, next);
  };

  const bind = (root: ParentNode = document): void => {
    root.querySelectorAll<HTMLElement>(SCROLL_TARGETS).forEach((el) => {
      if (el.dataset.scrollBound === '1') return;
      el.dataset.scrollBound = '1';
      el.addEventListener('scroll', onScroll, { passive: true });
    });
  };

  bind();

  // Soft navigation / search modal may inject new scroll regions.
  const observer = new MutationObserver(() => bind());
  observer.observe(document.body, { childList: true, subtree: true });
}
