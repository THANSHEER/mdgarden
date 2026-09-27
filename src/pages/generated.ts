// Generated pages: home, 404, tag index, and per-tag pages.

import { renderDocument, type RenderContext } from '../parser/render.js';
import { tagUrl, withBase } from '../parser/links.js';
import { escapeAttr, escapeHtml, t } from '../utils.js';
import type { Page } from '../types.js';

// ---------------------------------------------------------------------------
// Home & 404
// ---------------------------------------------------------------------------

/** Render generated home page. */
export function renderHomePage(ctx: RenderContext): string {
  const { config } = ctx;
  const recent = [...ctx.pages].sort(byDateThenTitle);
  const list = recent
    .map((p) => {
      const date = p.date ? ` <span class="page-meta">${escapeHtml(shortDate(p.date))}</span>` : '';
      return `<li><a href="${escapeAttr(p.url)}">${escapeHtml(p.title)}</a>${date}</li>`;
    })
    .join('');
  const intro = config.site.description
    ? `<p>${escapeHtml(config.site.description)}</p>`
    : '';
  const body = `${intro}<ul class="page-list home-list">${list || `<li>${escapeHtml(t('noNotes', config))}</li>`}</ul>`;

  return renderDocument(
    {
      title: config.site.title,
      description: config.site.description,
      bodyHtml: body,
      url: '/',
      kind: 'home',
    },
    ctx,
  );
}

/** Render 404 page. */
export function renderNotFoundPage(ctx: RenderContext): string {
  const { config } = ctx;
  const notFound = t('pageNotFound', config);
  const body = `<p>${escapeHtml(t('pageNotFoundBody', config))}</p><p><a href="${escapeAttr(withBase('/'))}">${escapeHtml(t('backHome', config))}</a></p>`;
  return renderDocument(
    { title: notFound, description: notFound, bodyHtml: body, url: '/404', kind: '404' },
    ctx,
  );
}

function byDateThenTitle(a: Page, b: Page): number {
  if (a.date && b.date) return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
  if (a.date) return -1;
  if (b.date) return 1;
  return a.title.localeCompare(b.title);
}

function shortDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// ---------------------------------------------------------------------------
// Tags
// ---------------------------------------------------------------------------

export interface TagEntry {
  display: string;
  pages: Page[];
}

/** Group pages by tag. */
export function buildTagMap(pages: Page[]): Map<string, TagEntry> {
  const map = new Map<string, TagEntry>();
  for (const page of pages) {
    for (const tag of page.tags) {
      const key = tag.toLowerCase();
      let entry = map.get(key);
      if (!entry) {
        entry = { display: tag, pages: [] };
        map.set(key, entry);
      }
      entry.pages.push(page);
    }
  }
  return map;
}

/** Render tag cloud index. */
export function renderTagIndex(ctx: RenderContext, map: Map<string, TagEntry>): string {
  const entries = [...map.values()].sort((a, b) => a.display.localeCompare(b.display));
  const cloud = entries
    .map(
      (e) =>
        `<a class="tag" href="${escapeAttr(tagUrl(e.display))}">#${escapeHtml(e.display)} (${e.pages.length})</a>`,
    )
    .join('');
  const body = `<div class="tag-cloud">${cloud || 'No tags yet.'}</div>`;
  const title = t('tags', ctx.config);
  return renderDocument(
    { title, description: title, bodyHtml: body, url: '/tags/', kind: 'tag' },
    ctx,
  );
}

/** Render individual tag page. */
export function renderTagPage(ctx: RenderContext, entry: TagEntry): string {
  const list = [...entry.pages]
    .sort((a, b) => a.title.localeCompare(b.title))
    .map((p) => `<li><a href="${escapeAttr(p.url)}">${escapeHtml(p.title)}</a></li>`)
    .join('');
  const body = `<ul class="page-list">${list}</ul>`;
  return renderDocument(
    {
      title: `#${entry.display}`,
      description: `Notes tagged ${entry.display}`,
      bodyHtml: body,
      url: tagUrl(entry.display),
      kind: 'tag',
    },
    ctx,
  );
}

// ---------------------------------------------------------------------------
// HTML Sitemap
// ---------------------------------------------------------------------------

/** Group pages alphabetically by first letter of title. */
function buildAlphabeticalMap(pages: Page[]): Map<string, Page[]> {
  const map = new Map<string, Page[]>();
  const sorted = [...pages].sort((a, b) => a.title.localeCompare(b.title));
  for (const page of sorted) {
    const firstChar = (page.title[0] ?? '#').toUpperCase();
    const group = /[A-Z]/.test(firstChar) ? firstChar : '#';
    let list = map.get(group);
    if (!list) {
      list = [];
      map.set(group, list);
    }
    list.push(page);
  }
  return map;
}

/** Render HTML sitemap page. */
export function renderSitemapPage(ctx: RenderContext): string {
  const { config } = ctx;
  const eligiblePages = ctx.pages.filter(
    (p) => p.frontmatter?.sitemap !== false && p.frontmatter?.noindex !== true,
  );
  const alphaMap = buildAlphabeticalMap(eligiblePages);
  const letters = Array.from(alphaMap.keys()).sort((a, b) => {
    if (a === '#') return 1;
    if (b === '#') return -1;
    return a.localeCompare(b);
  });

  const jumpLinks = letters
    .map((l) => `<a class="tag" href="#letter-${escapeAttr(l)}">${escapeHtml(l)}</a>`)
    .join(' ');

  let groupsHtml = '';
  for (const letter of letters) {
    const pages = alphaMap.get(letter) ?? [];
    const list = pages
      .map((p) => {
        const date = p.date ? ` <span class="page-meta">${escapeHtml(shortDate(p.date))}</span>` : '';
        return `<li><a href="${escapeAttr(p.url)}">${escapeHtml(p.title)}</a>${date}</li>`;
      })
      .join('');
    groupsHtml += `<section class="sitemap-group" id="letter-${escapeAttr(letter)}"><h2>${escapeHtml(letter)}</h2><ul class="page-list">${list}</ul></section>`;
  }

  const extraLinks: string[] = [];
  if (config.features.tags) {
    extraLinks.push(`<a class="tag" href="${escapeAttr(withBase('/tags/'))}">${escapeHtml(t('tags', config))}</a>`);
  }
  if (config.features.rss) {
    extraLinks.push(`<a class="tag" href="${escapeAttr(withBase('/rss.xml'))}">RSS Feed</a>`);
  }
  extraLinks.push(`<a class="tag" href="${escapeAttr(withBase('/sitemap.xml'))}">sitemap.xml</a>`);

  const intro = `<p>${eligiblePages.length} notes published in this garden.</p>`;
  const navBar = `<div class="tag-cloud sitemap-nav">${extraLinks.join(' ')}${jumpLinks ? ` &middot; ${jumpLinks}` : ''}</div>`;
  const body = `${intro}${navBar}${groupsHtml || `<p>${escapeHtml(t('noNotes', config))}</p>`}`;

  const title = t('sitemap', config);
  return renderDocument(
    {
      title,
      description: `Site map and overview of notes on ${config.site.title}`,
      bodyHtml: body,
      url: withBase('/sitemap/'),
      kind: 'sitemap',
    },
    ctx,
  );
}
