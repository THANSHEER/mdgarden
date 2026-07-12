// Soft page navigation via the View Transitions API, with a normal-navigation fallback.

import { initGraph } from './graph.js';
import { initToc } from './toc.js';
import { initPopovers } from './popover.js';
import { initExplorer } from './explorer.js';

export function initTransitions(): void {
  if (
    !document.startViewTransition ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) return;

  document.addEventListener('click', async (e) => {
    const target = e.target as HTMLElement;
    const link = target.closest('a');
    if (!link) return;

    const href = link.href;
    if (!href || href.startsWith('#') || link.target === '_blank' || link.hasAttribute('download')) return;

    const url = new URL(href, window.location.href);
    if (url.origin !== window.location.origin) return; // external link
    if (url.pathname === window.location.pathname) return; // same page

    e.preventDefault();

    try {
      const res = await fetch(href);
      if (!res.ok) throw new Error('Failed to fetch');
      const html = await res.text();
      const newDoc = new DOMParser().parseFromString(html, 'text/html');

      document.startViewTransition?.(() => {
        document.title = newDoc.title;
        swapMain(newDoc);
        swapRightSidebar(newDoc);
        highlightActiveLink(url.pathname);

        initGraph();
        initToc();
        initPopovers();
        initExplorer(); // re-bind folder toggles and open the new active link's ancestors

        loadMermaidIfNeeded();
        scrollToTarget(url.hash);
        window.history.pushState({}, '', href);
      });
    } catch (err) {
      console.error('View transition failed, falling back to standard navigation', err);
      window.location.href = href;
    }
  });

  window.addEventListener('popstate', () => window.location.reload());
}

function swapMain(newDoc: Document): void {
  const currentMain = document.querySelector('main.content');
  const newMain = newDoc.querySelector('main.content');
  if (currentMain && newMain) {
    currentMain.innerHTML = newMain.innerHTML;
    (currentMain as HTMLElement).focus({ preventScroll: true });
  }
}

function swapRightSidebar(newDoc: Document): void {
  const currentRight = document.querySelector('.sidebar-right');
  const newRight = newDoc.querySelector('.sidebar-right');
  const layout = document.querySelector('.layout');

  if (currentRight && newRight) {
    currentRight.innerHTML = newRight.innerHTML;
    layout?.classList.remove('no-right');
  } else if (currentRight && !newRight) {
    currentRight.remove();
    layout?.classList.add('no-right');
  } else if (!currentRight && newRight) {
    layout?.classList.remove('no-right');
    layout?.appendChild(newRight.cloneNode(true));
  }
}

function highlightActiveLink(newPath: string): void {
  document.querySelectorAll('.sidebar-left .is-active').forEach((el) => el.classList.remove('is-active'));
  document
    .querySelectorAll(`.sidebar-left a[href="${CSS.escape(newPath)}"]`)
    .forEach((el) => el.classList.add('is-active'));
}

/** Mermaid runs as a separate IIFE chunk and never exposes a window global, so the
 *  only way to (re)render diagrams on a soft-navigated page is to load it fresh. */
function loadMermaidIfNeeded(): void {
  if (!document.querySelector('pre.mermaid')) return;
  const base = document.documentElement.dataset.base ?? '';
  const script = document.createElement('script');
  script.src = `${base}/mdgarden.mermaid.js`;
  script.defer = true;
  document.body.appendChild(script);
}

function scrollToTarget(hash: string): void {
  const main = document.querySelector<HTMLElement>('main.content');
  if (!hash) {
    if (main && getComputedStyle(main).overflowY === 'auto') main.scrollTo(0, 0);
    else window.scrollTo(0, 0);
    return;
  }
  document.querySelector(hash)?.scrollIntoView();
}
