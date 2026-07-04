const POPOVER_DELAY = 250; // ms to hover before showing
const CACHE = new Map<string, string>();

let hoverTimer: number | null = null;
let activeLink: HTMLAnchorElement | null = null;

interface PreviewCard {
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

  const url = getBaseUrl(href);
  if (!url || url.origin !== window.location.origin) return false;
  if (url.pathname === window.location.pathname && url.hash) return false;
  return true;
}

function trimSummary(text: string): string {
  const compact = text.replace(/\s+/g, ' ').trim();
  if (compact.length <= 180) return compact;
  return `${compact.slice(0, 177).trimEnd()}...`;
}

function buildPreviewCard(doc: Document, href: string): PreviewCard {
  const summaryFromMeta = doc.querySelector('meta[name="description"]')?.getAttribute('content')?.trim();
  if (summaryFromMeta) {
    return { summary: summaryFromMeta, href };
  }

  const firstParagraph = doc.querySelector('.md-content p')?.textContent?.trim();
  return { summary: firstParagraph ? trimSummary(firstParagraph) : 'No preview available.', href };
}

function renderPreviewCard(card: PreviewCard): string {
  return [
    '<div class="md-popover-inner">',
    `<p class="md-popover-summary">${card.summary}</p>`,
    `<p class="md-popover-footer"><span>${card.href}</span></p>`,
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
  const width = Math.min(440, window.innerWidth - margin * 2);
  const height = Math.min(280, window.innerHeight - margin * 2);

  popover.style.width = `${width}px`;
  popover.style.maxHeight = `${height}px`;

  let left = rect.left;
  if (left + width > window.innerWidth - margin) {
    left = window.innerWidth - width - margin;
  }

  let top = rect.bottom + 12;
  if (top + height > window.innerHeight - margin && rect.top > height + 12) {
    top = rect.top - height - 12;
  }

  popover.style.left = `${Math.max(margin, left)}px`;
  popover.style.top = `${Math.max(margin, top)}px`;
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
