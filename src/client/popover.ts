const POPOVER_DELAY = 250; // ms to hover before showing
const CACHE = new Map<string, string>();

let hoverTimer: number | null = null;
let activeLink: HTMLAnchorElement | null = null;

interface PreviewCard {
  title: string;
  summary: string;
  href: string;
}

function getBaseUrl(href: string): URL | null {
  try {
    return new URL(href, window.location.href);
  } catch {
    return null;
  }
}

function shouldPreviewLink(link: HTMLAnchorElement): boolean {
  const href = link.getAttribute('href') || '';
  if (!href || href.startsWith('#')) return false;
  if (link.classList.contains('wikilink-broken')) return false;
  if (link.target === '_blank' || link.hasAttribute('download')) return false;
  
  // Disable popovers for links inside any sidebar
  if (link.closest('.sidebar-left') || link.closest('.sidebar-right') || link.closest('.sidebar')) return false;

  const url = getBaseUrl(href);
  if (!url || url.origin !== window.location.origin) return false;
  if (url.pathname === window.location.pathname && url.hash) return false;
  return true;
}

function trimSummary(text: string): string {
  const compact = text.replace(/\s+/g, ' ').trim();
  if (compact.length <= 200) return compact;
  return `${compact.slice(0, 197).trimEnd()}…`;
}

/** Extract a clean page title from the fetched document.
 *  Strips the " — Site Name" suffix that mdgarden appends. */
function extractTitle(doc: Document): string {
  // Prefer an explicit <h1> in the article
  const h1 = doc.querySelector('.md-content .page-title, .md-content h1, h1');
  if (h1?.textContent?.trim()) return h1.textContent.trim();
  // Fall back to <title>, removing " — Anything" suffix
  const raw = doc.title?.trim() ?? '';
  return raw.replace(/\s[—–-]\s.+$/, '').trim() || raw;
}

function buildPreviewCard(doc: Document, href: string): PreviewCard {
  const title = extractTitle(doc);

  // Extract actual page content (skipping titles, meta, breadcrumbs)
  const contentEl = doc.querySelector('.md-content');
  let actualContent = '';
  
  if (contentEl) {
    const elements = Array.from(contentEl.children).filter(el => 
      !el.matches('h1, h2, h3, h4, h5, h6, .page-title, .page-meta, .breadcrumbs, hr')
    );
    for (const el of elements) {
      if (actualContent.length > 250) break;
      const text = el.textContent?.trim();
      if (text) actualContent += text + ' ';
    }
  }

  const summary = actualContent ? trimSummary(actualContent) : 'No preview available.';
  return { title, summary, href };
}

/** Format the URL for display: strip protocol, keep path, truncate if long. */
function formatDisplayHref(href: string): string {
  try {
    const u = new URL(href, window.location.href);
    const path = u.pathname.replace(/\/+$/, '') || '/';
    if (path.length > 52) return `${path.slice(0, 49)}…`;
    return path;
  } catch {
    return href;
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderPreviewCard(card: PreviewCard): string {
  const displayHref = formatDisplayHref(card.href);
  const titleHtml = card.title
    ? `<div class="md-popover-title">${escapeHtml(card.title)}</div>`
    : '';
  const summaryHtml = card.summary
    ? `<p class="md-popover-summary">${escapeHtml(card.summary)}</p>`
    : '';
  return [
    '<div class="md-popover-inner">',
    titleHtml,
    summaryHtml,
    `<p class="md-popover-footer"><code class="md-popover-url">${escapeHtml(displayHref)}</code><span class="md-popover-cta">Open →</span></p>`,
    '</div>',
  ].join('');
}


async function fetchPreview(href: string): Promise<string> {
  const cached = CACHE.get(href);
  if (cached) return cached;

  const res = await fetch(href);
  if (!res.ok) throw new Error(`Request failed with ${res.status}`);
  const html = await res.text();
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const card = buildPreviewCard(doc, href);
  const rendered = renderPreviewCard(card);
  CACHE.set(href, rendered);
  return rendered;
}

function positionPopover(popover: HTMLElement, link: HTMLAnchorElement): void {
  const rect = link.getBoundingClientRect();
  const margin = 16;
  
  // Set constraints first so it can measure its natural size
  popover.style.width = '420px';
  popover.style.maxWidth = `calc(100vw - ${margin * 2}px)`;
  
  const width = popover.offsetWidth;
  const height = popover.offsetHeight;

  // Center horizontally relative to the link
  let left = rect.left + (rect.width / 2) - (width / 2);
  if (left + width > window.innerWidth - margin) {
    left = window.innerWidth - width - margin;
  }
  if (left < margin) {
    left = margin;
  }

  // Position vertically: prefer below, flip above if no room
  let top = rect.bottom + 12;
  if (top + height > window.innerHeight - margin && rect.top > height + 12) {
    top = rect.top - height - 12;
  }

  popover.style.left = `${left}px`;
  popover.style.top = `${top}px`;
}

export function initPopovers(): void {
  if (document.getElementById('md-popover')) return;

  const popover = document.createElement('div');
  popover.id = 'md-popover';
  popover.className = 'md-popover';
  popover.setAttribute('role', 'tooltip');
  popover.setAttribute('aria-hidden', 'true');
  document.body.appendChild(popover);

  const hidePopover = (): void => {
    if (hoverTimer) {
      window.clearTimeout(hoverTimer);
      hoverTimer = null;
    }
    popover.classList.remove('is-visible');
    popover.setAttribute('aria-hidden', 'true');
    activeLink = null;
  };

  const showPopover = async (link: HTMLAnchorElement): Promise<void> => {
    const href = link.getAttribute('href') || link.href;
    if (!shouldPreviewLink(link)) return;

    if (hoverTimer) {
      window.clearTimeout(hoverTimer);
      hoverTimer = null;
    }

    hoverTimer = window.setTimeout(async () => {
      try {
        const content = await fetchPreview(href);
        if (activeLink !== link) return;
        popover.innerHTML = content;
        positionPopover(popover, link);
        popover.classList.add('is-visible');
        popover.setAttribute('aria-hidden', 'false');
      } catch (err) {
        if (activeLink !== link) return;
        console.error('Error fetching popover preview:', err);
        popover.innerHTML = '<div class="md-popover-inner"><p class="md-popover-summary">Failed to load preview.</p></div>';
        positionPopover(popover, link);
        popover.classList.add('is-visible');
        popover.setAttribute('aria-hidden', 'false');
      }
    }, POPOVER_DELAY);
  };

  document.addEventListener('pointerover', (event) => {
    const target = event.target as HTMLElement | null;
    const link = target?.closest('a') as HTMLAnchorElement | null;
    if (link && shouldPreviewLink(link)) {
      if (activeLink !== link) {
        hidePopover();
        activeLink = link;
        void showPopover(link);
      }
      return;
    }

    if (!target?.closest('#md-popover')) {
      hidePopover();
    }
  });

  document.addEventListener('pointerout', (event) => {
    const target = event.target as HTMLElement | null;
    const related = event.relatedTarget as Node | null;
    const leavingPopover = target?.closest('#md-popover');
    const enteringPopover = related instanceof HTMLElement && Boolean(related.closest('#md-popover'));
    if (leavingPopover && !enteringPopover) {
      hidePopover();
      return;
    }

    const link = target?.closest('a') as HTMLAnchorElement | null;
    const stayedInsideLink = Boolean(link && related && link.contains(related));
    const movedToAnotherLink = related instanceof HTMLElement && Boolean(related.closest('a'));
    if (stayedInsideLink) return;
    if (link && !movedToAnotherLink) {
      hidePopover();
    }
  });

  window.addEventListener(
    'scroll',
    () => {
      if (popover.classList.contains('is-visible')) hidePopover();
    },
    { passive: true },
  );

  window.addEventListener('resize', () => {
    if (activeLink && popover.classList.contains('is-visible')) {
      positionPopover(popover, activeLink);
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') hidePopover();
  });

  popover.addEventListener('pointerleave', hidePopover);
}
