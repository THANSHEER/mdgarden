import type MarkdownIt from 'markdown-it';
import { getBasePath, makeRenderEnv, tagUrl, withBase, type SiteIndex } from './links.js';
import { escapeAttr, escapeHtml, humanizeSlug, stripHtml, t } from '../utils.js';
import { collectHtml, type MdgardenPlugin, type PageKind, type RenderInfo } from '../core/plugin.js';
import { buildTree, type TreeNode } from '../features/explorer.js';
import { VERSION } from '../version.js';
import type { Heading, MdgardenConfig, Page } from '../types.js';

/** Right-pointing chevron, rotated via CSS when its folder is open. */
const folderChevron =
  '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 6 15 12 9 18"></polyline></svg>';

/**
 * mdgarden's default mark: a sprout growing out of a note. Original,
 * hand-authored geometry (rect + two rotated ellipses) — no third-party
 * artwork, free to ship since this project isn't trademarking it.
 */
function gardenMarkSvg(fill: string): string {
  return `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" fill="${fill}" aria-hidden="true">` +
    `<rect x="9" y="15" width="14" height="13" rx="2.5"></rect>` +
    `<rect x="15" y="9" width="2" height="9" rx="1"></rect>` +
    `<ellipse cx="11.5" cy="10.5" rx="5" ry="2.5" transform="rotate(-35 11.5 10.5)"></ellipse>` +
    `<ellipse cx="20.5" cy="10.5" rx="5" ry="2.5" transform="rotate(35 20.5 10.5)"></ellipse>` +
    `</svg>`;
}
const defaultLogoSvg = gardenMarkSvg('currentColor');
/** Standalone favicon document can't see page CSS vars, so it gets one fixed brand color. */
const faviconHref = `data:image/svg+xml,${encodeURIComponent(gardenMarkSvg('#2f6f4f'))}`;

export interface RenderContext {
  config: MdgardenConfig;
  /** All published pages, used for the left "notes" sidebar. */
  pages: Page[];
  cssHref: string;
  clientJsHref: string;
  /** Set when math is enabled (KaTeX stylesheet). */
  mathCssHref?: string;
  /** Set in Phase B when a search index is emitted. */
  searchIndexHref?: string;
  /** Plugins whose head/bodyEnd hooks contribute to every document. */
  plugins: MdgardenPlugin[];
}

export interface DocumentOptions {
  title: string;
  description: string;
  /** Inner HTML of the article (already rendered). */
  bodyHtml: string;
  /** Current page URL, for active-state highlighting. */
  url: string;
  /** Page slug (no base, '/'-separated) — drives breadcrumbs. */
  slug?: string;
  headings?: Heading[];
  showMeta?: boolean;
  date?: string;
  tags?: string[];
  /** Estimated reading time in minutes (shown when features.readingTime). */
  readingTime?: number;
  /** Per-page language for <html lang> (frontmatter `lang`). */
  lang?: string;
  backlinks?: Page[];
  /** When true the caller supplies its own <h1> inside bodyHtml. */
  hideTitle?: boolean;
  /** Optional anchor id transferred from a matching Markdown H1. */
  titleId?: string;
  /** Document kind, for plugins (defaults to "note"). */
  kind?: PageKind;
  /** Source frontmatter for real notes (plugins read e.g. an OG image). */
  frontmatter?: Record<string, unknown>;
}

/** Render markdown page body. */
export function renderBody(md: MarkdownIt, page: Page, index: SiteIndex): void {
  const env = makeRenderEnv(index);
  page.html = md.render(page.body, env);
  page.headings = env.headings;
  page.links = [...env.outgoing];
  prepareBodyHtml(page);
  if (!page.description) {
    page.description = stripHtml(page.html).slice(0, 180).trim();
  }
}

/** Apply idempotent document-level fixes to freshly rendered or cached HTML. */
export function prepareBodyHtml(page: Page): void {
  // The document template owns the page H1. When a note starts with an
  // identical Markdown H1, remove that duplicate and transfer its anchor to
  // the template heading. Other H1s remain author content.
  const leadingH1 = page.html.match(/^\s*<h1\b[^>]*>[\s\S]*?<\/h1>\s*/i);
  if (leadingH1) {
    const headingText = stripHtml(leadingH1[0]).trim();
    if (headingText.toLocaleLowerCase() === page.title.trim().toLocaleLowerCase()) {
      page.html = page.html.slice(leadingH1[0].length);
    } else {
      const demoted = leadingH1[0]
        .replace(/^(\s*)<h1\b/i, '$1<h2')
        .replace(/<\/h1>(\s*)$/i, '</h2>$1');
      page.html = demoted + page.html.slice(leadingH1[0].length);
      const heading = page.headings.find(
        (item) => item.level === 1 && item.text.trim() === headingText,
      );
      if (heading) heading.level = 2;
    }
  }

  // Overflow regions must be keyboard-focusable so code and wide tables can
  // be scrolled without a pointer.
  page.html = page.html
    .replace(/<pre\b(?![^>]*\btabindex=)/g, '<pre tabindex="0"')
    .replace(/<table\b(?![^>]*\btabindex=)/g, '<table tabindex="0"');
}

/** Render full HTML document. */
export function renderDocument(opts: DocumentOptions, ctx: RenderContext): string {
  const { config } = ctx;
  const siteTitle = config.site.title;
  const fullTitle = opts.title && opts.title !== siteTitle
    ? `${opts.title} — ${siteTitle}`
    : siteTitle;
  const lang = opts.lang || config.site.language || 'en';
  const description = opts.description || config.site.description;

  const info: RenderInfo = {
    kind: opts.kind ?? 'note',
    url: opts.url,
    title: opts.title || siteTitle,
    description,
    frontmatter: opts.frontmatter,
  };
  const pluginHead = collectHtml(ctx.plugins, 'head', info, config);
  const pluginBodyEnd = collectHtml(ctx.plugins, 'bodyEnd', info, config);

  // The home/landing page shows the full graph; note pages get a local/global toggle.
  const isHome = (opts.slug ?? '') === '' || opts.kind === 'home';
  const tocLabel = t('onThisPage', config);
  const tocHtml = renderToc(opts.headings ?? [], tocLabel);
  const tocSection = tocHtml ? `<h2>${escapeHtml(t('onThisPage', config))}</h2>${tocHtml}` : '';
  const graphToggle = !isHome
    ? `<div class="graph-toggle" role="group" aria-label="${escapeAttr(t('graph', config))}">` +
      `<button type="button" class="graph-toggle-btn is-active" data-graph-mode="local" aria-pressed="true">${escapeHtml(t('graphLocal', config))}</button>` +
      `<button type="button" class="graph-toggle-btn" data-graph-mode="global" aria-pressed="false">${escapeHtml(t('graphGlobal', config))}</button>` +
      `</div>`
    : '';
  const graphPanel = config.features.graph
    ? `<section class="graph-panel"><h2>${escapeHtml(t('graph', config))}</h2>${graphToggle}` +
      `<div class="graph" data-graph>` +
      `<p class="sr-only">${escapeHtml(t('graphInstructions', config))}</p>` +
      `<canvas aria-hidden="true"></canvas>` +
      `<details class="graph-links"><summary>${escapeHtml(t('graphBrowse', config))}</summary><ul></ul></details>` +
      `</div></section>`
    : '';
  const backlinksHtml = renderBacklinks(opts.backlinks ?? [], config);
  const rightInner = `${tocSection}${graphPanel}${backlinksHtml}`;
  const rightSidebar = rightInner
    ? `<aside class="sidebar sidebar-right" aria-label="${escapeAttr(t('supplementary', config))}">${rightInner}</aside>`
    : '';
  const titleId = opts.titleId ? ` id="${escapeAttr(opts.titleId)}"` : '';

  return `<!doctype html>
<html lang="${escapeAttr(lang)}" data-base="${escapeAttr(getBasePath())}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(fullTitle)}</title>
<meta name="description" content="${escapeAttr(description)}">
<meta name="generator" content="mdgarden ${escapeAttr(VERSION)}">
<link rel="icon" href="${escapeAttr(faviconHref)}">
<link rel="stylesheet" href="${escapeAttr(ctx.cssHref)}">
${ctx.mathCssHref ? `<link rel="stylesheet" href="${escapeAttr(ctx.mathCssHref)}">` : ''}

${pluginHead}
</head>
<body>
<a class="skip-link" href="#main-content">${escapeHtml(t('skipToContent', config))}</a>
${renderMobileBar(ctx)}
<div class="layout${rightSidebar ? '' : ' no-right'}">
<aside class="sidebar sidebar-left" id="site-sidebar" aria-label="${escapeAttr(t('siteNavigation', config))}">
<div class="sidebar-fixed">
${renderSidebarHeader(ctx)}
</div>
<div class="sidebar-scroll">
${renderSidebarProfile(config)}
${renderPageList(ctx, opts.url)}
</div>
</aside>
<main class="content" id="main-content" tabindex="-1">
<article class="md-content">
${renderBreadcrumbs(opts, config)}
${opts.hideTitle ? '' : `<h1 class="page-title"${titleId}>${escapeHtml(opts.title)}</h1>`}
${opts.showMeta ? renderMeta(opts, config) : ''}
${opts.bodyHtml}${pluginBodyEnd}
</article>
</main>
${rightSidebar}
</div>
<a class="powered-by-mdgarden" href="https://github.com/THANSHEER/Mdgarden" title="Built with mdgarden">${escapeHtml(t('builtWith', config))} mdgarden</a>
<script src="${escapeAttr(ctx.clientJsHref)}" defer></script>
</body>
</html>`;
}

/** Render left sidebar header. */
function renderSidebarHeader(ctx: RenderContext): string {
  const { config } = ctx;
  const nav = config.nav.length
    ? `<nav class="sidebar-nav">${config.nav
        .map((n) => `<a class="nav-link" href="${escapeAttr(withBase(n.url))}">${escapeHtml(n.title)}</a>`)
        .join('')}</nav>`
    : '';

  const searchLabel = escapeAttr(t('search', config));
  const searchIcon = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>';
  const search = ctx.searchIndexHref
    ? `<button class="search-trigger" type="button" data-search-open ` +
      `data-placeholder="${escapeAttr(t('searchPlaceholder', config))}" ` +
      `data-close-label="${escapeAttr(t('close', config))}" ` +
      `data-results-label="${escapeAttr(t('searchResults', config))}" ` +
      `aria-label="${searchLabel}" aria-haspopup="dialog" aria-expanded="false">` +
      `${searchIcon}<span class="search-trigger-label">${escapeHtml(t('searchPlaceholder', config))}</span></button>`
    : '';

  return `<div class="sidebar-header">
${renderSidebarLogo(config)}
<div class="sidebar-header-top">
<a class="site-title" href="${escapeAttr(withBase('/'))}">${escapeHtml(config.site.title)}</a>
</div>
${nav}
${search}
</div>`;
}

/** Render the sidebar logo: user-configured emoji/text/image, or the default mark. */
function renderSidebarLogo(config: MdgardenConfig): string {
  const logo = config.site.logo?.trim();
  const href = escapeAttr(withBase('/'));
  const alt = escapeAttr(config.site.title);
  if (!logo) {
    return `<a class="sidebar-logo sidebar-logo-mark" href="${href}" aria-label="${alt}">${defaultLogoSvg}</a>`;
  }
  const isUrl = /^https?:\/\//i.test(logo);
  const isImage = isUrl || /\.(png|jpe?g|svg|webp|gif|avif)$/i.test(logo);
  if (isImage) {
    const src = isUrl ? logo : withBase(logo.startsWith('/') ? logo : `/${logo}`);
    return `<a class="sidebar-logo" href="${href}" aria-label="${alt}"><img class="sidebar-logo-img" src="${escapeAttr(src)}" alt="${alt}"></a>`;
  }
  return `<a class="sidebar-logo sidebar-logo-emoji" href="${href}" aria-label="${alt}">${escapeHtml(logo)}</a>`;
}

/** Render mobile bar header. */
function renderMobileBar(ctx: RenderContext): string {
  const { config } = ctx;
  const menuLabel = escapeAttr(t('menu', config));
  const closeLabel = escapeAttr(t('close', config));
  return `<header class="mobile-bar">
<button class="icon-button" type="button" data-sidebar-toggle aria-controls="site-sidebar" aria-expanded="false" aria-label="${menuLabel}" title="${menuLabel}">☰</button>
<a class="site-title" href="${escapeAttr(withBase('/'))}">${escapeHtml(config.site.title)}</a>
</header>
<button class="sidebar-backdrop" type="button" data-sidebar-backdrop aria-label="${closeLabel}"></button>`;
}

/** Render profile section. */
function renderSidebarProfile(config: MdgardenConfig): string {
  const { author, description } = config.site;
  if (!author && !description) return '';
  const name = author ? `<div class="sidebar-profile-name">${escapeHtml(author)}</div>` : '';
  const bio = description ? `<p class="sidebar-profile-bio">${escapeHtml(description)}</p>` : '';
  return `<div class="sidebar-profile">${name}${bio}</div>`;
}

function renderPageList(ctx: RenderContext, currentUrl: string): string {
  if (ctx.config.features.explorer) {
    return `<ul class="explorer-list">${renderTree(buildTree(ctx.pages), currentUrl)}</ul>`;
  }
  const items = [...ctx.pages]
    .sort((a, b) => a.title.localeCompare(b.title))
    .map((p) => {
      const active = p.url === currentUrl;
      const attrs = active ? ' class="is-active" aria-current="page"' : '';
      return `<li><a href="${escapeAttr(p.url)}"${attrs} title="${escapeAttr(p.title)}">${escapeHtml(p.title)}</a></li>`;
    })
    .join('');
  return `<ul class="page-list">${items}</ul>`;
}

/** Render folder tree. */
function renderTree(nodes: TreeNode[], currentUrl: string): string {
  return nodes
    .map((n) => {
      if (n.isFolder) {
        const open = currentUrl.startsWith(n.url);
        const title = escapeAttr(n.name);
        const label = n.page
          ? `<a class="folder-label" href="${escapeAttr(n.page.url)}" title="${title}">${escapeHtml(n.name)}</a>`
          : `<span class="folder-label" title="${title}">${escapeHtml(n.name)}</span>`;
        return `<li class="explorer-folder${open ? ' is-open' : ''}">` +
          `<button class="folder-toggle" type="button" aria-expanded="${open}" aria-label="Toggle ${title} folder">${folderChevron}</button>` +
          `${label}<ul class="explorer-children">${renderTree(n.children, currentUrl)}</ul></li>`;
      }
      const active = Boolean(n.page && n.page.url === currentUrl);
      const attrs = active ? ' class="is-active" aria-current="page"' : '';
      const href = n.page ? n.page.url : n.url;
      return `<li class="explorer-file"><a href="${escapeAttr(href)}"${attrs} title="${escapeAttr(n.name)}">${escapeHtml(n.name)}</a></li>`;
    })
    .join('');
}

function renderToc(headings: Heading[], label: string): string {
  const items = headings.filter((h) => h.level === 2 || h.level === 3);
  if (items.length === 0) return '';
  const lis = items
    .map(
      (h) =>
        `<li><a class="toc-h${h.level}" href="#${escapeAttr(h.slug)}">${escapeHtml(h.text)}</a></li>`,
    )
    .join('');
  return `<nav aria-label="${escapeAttr(label)}"><ul class="toc-list">${lis}</ul></nav>`;
}

/** Render breadcrumb trail. */
function renderBreadcrumbs(opts: DocumentOptions, config: MdgardenConfig): string {
  if (!config.features.breadcrumbs) return '';
  const slug = opts.slug ?? '';
  if (!slug || !slug.includes('/')) return ''; // only show on nested pages
  const segs = slug.split('/');
  const sep = '<span class="crumb-sep">/</span>';
  const crumbs = [
    `<a href="${escapeAttr(withBase('/'))}">${escapeHtml(t('home', config))}</a>`,
  ];
  let acc = '';
  for (let i = 0; i < segs.length - 1; i++) {
    acc += `/${segs[i]}`;
    crumbs.push(
      `<a href="${escapeAttr(withBase(`${acc}/`))}">${escapeHtml(humanizeSlug(segs[i]))}</a>`,
    );
  }
  crumbs.push(`<span aria-current="page">${escapeHtml(opts.title)}</span>`);
  return `<nav class="breadcrumbs" aria-label="Breadcrumb">${crumbs.join(sep)}</nav>`;
}

function renderMeta(opts: DocumentOptions, config: MdgardenConfig): string {
  const parts: string[] = [];
  if (opts.date) {
    const d = formatDate(opts.date, config);
    if (d) parts.push(`<time datetime="${escapeAttr(opts.date)}">${escapeHtml(d)}</time>`);
  }
  if (config.features.readingTime && opts.readingTime) {
    parts.push(`<span class="reading-time">${opts.readingTime} ${escapeHtml(t('minRead', config))}</span>`);
  }
  for (const tag of opts.tags ?? []) {
    parts.push(`<a class="tag" href="${escapeAttr(tagUrl(tag))}">#${escapeHtml(tag)}</a>`);
  }
  if (parts.length === 0) return '';
  return `<div class="page-meta">${parts.join('')}</div>`;
}

function renderBacklinks(backlinks: Page[], config: MdgardenConfig): string {
  if (backlinks.length === 0) return '';
  const items = backlinks
    .map(
      (p) =>
        `<li class="backlink-item"><a href="${escapeAttr(p.url)}">${escapeHtml(p.title)}</a></li>`,
    )
    .join('');
  return `<section class="backlinks"><h2>${escapeHtml(t('linkedReferences', config))}</h2><ul class="backlink-list">${items}</ul></section>`;
}

function formatDate(value: string, config: MdgardenConfig): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const locale = config.site.locale || config.site.language || 'en';
  return d.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' });
}
