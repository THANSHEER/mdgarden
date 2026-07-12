import MiniSearch from 'minisearch';

/** Escape HTML special chars (browser-safe, no Node imports). */
function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Escape for use inside a double-quoted HTML attribute. */
function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/"/g, '&quot;');
}

/** Prefix a root-relative URL with the base path stored on the <html> element. */
function withBase(url: string): string {
  const base = document.documentElement.dataset.base ?? '';
  if (!base) return url;
  if (!url.startsWith('/') || url.startsWith('//')) return url;
  return base + url;
}

interface Doc {
  id: string;
  url: string;
  title: string;
  tags: string;
  content: string;
}

/** Client search module. */
export function initSearch(): void {
  const button = document.querySelector<HTMLButtonElement>('[data-search-open]');
  if (!button) return;
  const trigger = button;
  const searchPlaceholder = trigger.dataset.placeholder || 'Search notes…';
  const searchLabel = trigger.getAttribute('aria-label') || 'Search';
  const closeLabel = trigger.dataset.closeLabel || 'Close';
  const resultsLabel = trigger.dataset.resultsLabel || 'Search results';

  let mini: MiniSearch<Doc> | null = null;
  let loading = false;
  const docs = new Map<string, Doc>();
  let modal: HTMLDialogElement | null = null;
  let input: HTMLInputElement | null = null;
  let results: HTMLElement | null = null;
  let status: HTMLElement | null = null;

  async function ensureIndex(): Promise<void> {
    if (mini || loading) return;
    loading = true;
    try {
      const res = await fetch(withBase('/search-index.json'));
      const data = (await res.json()) as Doc[];
      for (const d of data) docs.set(d.id, d);
      const ms = new MiniSearch<Doc>({
        fields: ['title', 'tags', 'content'],
        storeFields: ['url', 'title'],
        searchOptions: { boost: { title: 3, tags: 2 }, prefix: true, fuzzy: 0.2 },
      });
      ms.addAll(data);
      mini = ms;
    } finally {
      loading = false;
    }
  }

  function ensureModal(): void {
    if (modal) return;
    const placeholder = searchPlaceholder;
    modal = document.createElement('dialog');
    modal.className = 'search-modal';
    modal.setAttribute('aria-labelledby', 'mdgarden-search-title');
    modal.innerHTML =
      `<div class="search-box">` +
      `<h2 class="sr-only" id="mdgarden-search-title">${escapeHtml(searchLabel)}</h2>` +
      `<div class="search-box-header"><input type="search" aria-controls="mdgarden-search-results">` +
      `<button class="icon-button search-close" type="button" aria-label="${escapeAttr(closeLabel)}">×</button></div>` +
      `<p class="sr-only" data-search-status aria-live="polite"></p>` +
      `<ul class="search-results" id="mdgarden-search-results" aria-label="${escapeAttr(resultsLabel)}"></ul>` +
      `</div>`;
    document.body.appendChild(modal);
    input = modal.querySelector('input');
    results = modal.querySelector('.search-results');
    status = modal.querySelector('[data-search-status]');
    if (input) {
      input.placeholder = placeholder;
      input.setAttribute('aria-label', placeholder);
    }
    modal.addEventListener('click', (e) => {
      if (e.target === modal) close();
    });
    modal.querySelector<HTMLButtonElement>('.search-close')?.addEventListener('click', close);
    modal.addEventListener('close', () => {
      trigger.setAttribute('aria-expanded', 'false');
      trigger.focus();
    });
    input?.addEventListener('input', () => runQuery(input?.value ?? ''));
    input?.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowDown') return;
      const first = results?.querySelector<HTMLAnchorElement>('a');
      if (!first) return;
      e.preventDefault();
      first.focus();
    });
    results?.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      const links = Array.from(results?.querySelectorAll<HTMLAnchorElement>('a') ?? []);
      const current = links.indexOf(document.activeElement as HTMLAnchorElement);
      if (current < 0) return;
      e.preventDefault();
      const direction = e.key === 'ArrowDown' ? 1 : -1;
      links[(current + direction + links.length) % links.length]?.focus();
    });
    results?.addEventListener('click', () => close());
  }

  async function open(): Promise<void> {
    ensureModal();
    if (!modal?.open) modal?.showModal();
    trigger.setAttribute('aria-expanded', 'true');
    input?.focus();
    await ensureIndex();
    runQuery(input?.value ?? '');
  }

  function close(): void {
    if (modal?.open) modal.close();
  }

  function runQuery(query: string): void {
    if (!mini || !results) return;
    const q = query.trim();
    const hits = q ? mini.search(q).slice(0, 20) : [];
    if (status) {
      status.textContent = q ? `${hits.length} ${resultsLabel.toLocaleLowerCase()}` : '';
    }
    results.innerHTML = hits
      .map((hit) => {
        const doc = docs.get(String(hit.id));
        if (!doc) return '';
        const titleHtml = highlightText(doc.title, q);
        const excerptHtml = highlightText(excerptFor(doc.content, q), q);
        return `<li><a href="${escapeAttr(doc.url)}">${titleHtml}<span class="search-result-excerpt">${excerptHtml}</span></a></li>`;
      })
      .join('');
  }

  trigger.addEventListener('click', () => {
    void open();
  });

  document.addEventListener('keydown', (e) => {
    const target = e.target as HTMLElement | null;
    const typing =
      !!target &&
      (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
    if (e.key === 'Escape') {
      close();
      return;
    }
    if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) {
      e.preventDefault();
      void open();
    }
  });
}

function excerptFor(content: string, query: string): string {
  const term = query.split(/\s+/)[0]?.toLowerCase() ?? '';
  const idx = term ? content.toLowerCase().indexOf(term) : -1;
  const start = idx > 50 ? idx - 50 : 0;
  const slice = content.slice(start, start + 140);
  return `${start > 0 ? '…' : ''}${slice}${content.length > start + 140 ? '…' : ''}`;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlightText(text: string, query: string): string {
  if (!query.trim()) return escapeHtml(text);
  const terms = query.split(/\s+/).filter((t) => t.length > 0).map(escapeRegExp);
  if (terms.length === 0) return escapeHtml(text);
  
  const regex = new RegExp(`(${terms.join('|')})`, 'gi');
  let match;
  const ranges: { start: number; end: number }[] = [];
  
  while ((match = regex.exec(text)) !== null) {
    const start = match.index;
    const end = regex.lastIndex;
    if (end === start) {
      regex.lastIndex++;
      continue;
    }
    ranges.push({ start, end });
  }

  if (ranges.length === 0) return escapeHtml(text);
  
  const merged: { start: number; end: number }[] = [];
  let current = ranges[0];
  for (let i = 1; i < ranges.length; i++) {
    const r = ranges[i];
    if (r.start <= current.end) {
      current.end = Math.max(current.end, r.end);
    } else {
      merged.push(current);
      current = r;
    }
  }
  merged.push(current);

  let result = '';
  let lastIndex = 0;
  for (const range of merged) {
    result += escapeHtml(text.slice(lastIndex, range.start));
    result += `<mark class="search-highlight">${escapeHtml(text.slice(range.start, range.end))}</mark>`;
    lastIndex = range.end;
  }
  result += escapeHtml(text.slice(lastIndex));
  return result;
}
