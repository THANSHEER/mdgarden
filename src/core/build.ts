import { promises as fs } from 'node:fs';
import path from 'node:path';
import { loadConfig } from './config.js';
import { collectContent, loadIgnorePatterns } from '../parser/content.js';
import {
  buildSiteIndex,
  outPathForSlug,
  setBasePath,
  slugifyPath,
  tagSlug,
  withBase,
  type SiteIndex,
} from '../parser/links.js';
import { buildTree, listFolders } from '../features/explorer.js';
import { escapeAttr, escapeHtml } from '../utils.js';
import { createMarkdown } from '../parser/markdown.js';
import { collectCodeLangs, createCodeHighlighter, type HighlightFn } from '../parser/highlight.js';
import { prepareBodyHtml, renderBody, renderDocument, type RenderContext } from '../parser/render.js';
import { renderHomePage, renderNotFoundPage, buildTagMap, renderTagIndex, renderTagPage } from '../pages/generated.js';
import { buildSearchIndex, buildGraph } from '../features/data.js';
import { buildSitemap, buildRss, buildRobots } from '../features/feeds.js';
import { buildStyles } from '../parser/theme.js';
import { copyAsset, ensureCleanDir, writeOut } from './emit.js';
import { getClientRuntime, getMermaidRuntime, getKatexCss, writeKatexFonts } from '../parser/assets.js';
import { builtinPlugins } from '../plugins.js';
import { VERSION } from '../version.js';
import type { MdgardenPlugin, PluginContext } from './plugin.js';
import type { Heading, MdgardenConfig, Page } from '../types.js';

const META_FILENAME = 'mdgarden-meta.json';

/** Leading integer of a version string ("2.1.0" / "v2.1.0" → 2), or null if unparseable. */
export function majorVersion(v: string): number | null {
  const m = /^v?(\d+)/.exec(v.trim());
  return m ? Number(m[1]) : null;
}

export interface BuildOptions {
  cwd?: string;
  /** Override config.build.contentDir. */
  contentDir?: string;
  /** Override config.build.outDir. */
  outDir?: string;
  /** Explicit path to mdgarden.config.json. */
  configPath?: string;
  /** Extra plugins, appended after the built-ins (programmatic use). */
  plugins?: MdgardenPlugin[];
}

export interface BuildResult {
  pageCount: number;
  assetCount: number;
  outDir: string;
}

/** Build static site from markdown files. */
export async function build(opts: BuildOptions = {}): Promise<BuildResult> {
  const cwd = opts.cwd ?? process.cwd();
  const { config, baseDir } = await loadConfig(opts.configPath, cwd);

  setBasePath(config.build.basePath);

  const contentDir = opts.contentDir
    ? path.resolve(cwd, opts.contentDir)
    : path.resolve(baseDir, config.build.contentDir);
  const outDir = opts.outDir
    ? path.resolve(cwd, opts.outDir)
    : path.resolve(baseDir, config.build.outDir);

  const ignorePatterns = await loadIgnorePatterns(baseDir);
  const { pages, assets } = await collectContent(contentDir, config, ignorePatterns);
  const index = buildSiteIndex(pages, assets);

  const plugins: MdgardenPlugin[] = [...builtinPlugins(config), ...(opts.plugins ?? [])];
  const pluginCtx: PluginContext = { config, pages, outDir };

  let highlight: HighlightFn | undefined;
  if (config.features.syntaxHighlight) {
    try {
      // Load exactly the languages used in the content — supports any of shiki's
      // bundled grammars without a hardcoded allow-list.
      highlight = await createCodeHighlighter(collectCodeLangs(pages.map((p) => p.body)));
    } catch (err) {
      console.warn(`Syntax highlighting disabled for this build: ${(err as Error).message}`);
    }
  }
  const md = createMarkdown(config, { highlight, plugins });

  const configSig = configSignature(config);
  const indexSig = indexSignature(index);
  const cache = await readBuildCache(cwd, configSig, indexSig);
  const { cachedCount, brokenByPage } = renderPages(md, pages, index, cache);
  await writeBuildCache(cwd, pages, configSig, indexSig, brokenByPage);
  if (cachedCount > 0) {
    console.log(`\x1b[36m[cache]\x1b[0m Skipped markdown parsing for ${cachedCount} unchanged file(s)`);
  }
  if (brokenByPage.size > 0) {
    let total = 0;
    for (const [src, targets] of brokenByPage) {
      for (const t of targets) {
        console.warn(`  \x1b[33m⚠\x1b[0m  [[${t}]] in ${src}`);
        total++;
      }
    }
    console.warn(`\x1b[33m⚠\x1b[0m  ${total} broken wikilink(s) — readers will see dead links.\n`);
  }

  if (config.features.backlinks) computeBacklinks(pages, index);

  for (const page of pages) {
    for (const plugin of plugins) await plugin.page?.(page, pluginCtx);
  }

  let customCss = '';
  if (config.theme.customCss) {
    const customCssPath = path.resolve(baseDir, config.theme.customCss);
    try {
      customCss = await fs.readFile(customCssPath, 'utf8');
    } catch (err) {
      console.warn(`Could not read theme.customCss at ${customCssPath}: ${(err as Error).message}`);
    }
  }

  const ctx: RenderContext = {
    config,
    pages,
    cssHref: withBase('/styles.css'),
    clientJsHref: withBase('/mdgarden.client.js'),
    mathCssHref: config.features.math ? withBase('/katex/katex.min.css') : undefined,
    searchIndexHref: config.features.search ? withBase('/search-index.json') : undefined,
    plugins,
  };

  await warnOnMajorVersionJump(outDir);
  await ensureCleanDir(outDir);

  for (const page of pages) {
    const backlinks = page.backlinks
      .map((slug) => index.pages.get(slug))
      .filter((p): p is Page => p !== undefined);
    const titleHeading = page.headings.find(
      (heading) =>
        heading.level === 1 &&
        heading.text.trim().toLocaleLowerCase() === page.title.trim().toLocaleLowerCase(),
    );

    const html = renderDocument(
      {
        title: page.title,
        description: page.description,
        bodyHtml: page.html,
        url: page.url,
        slug: page.slug,
        headings: page.headings,
        showMeta: true,
        date: page.date,
        tags: page.tags,
        backlinks,
        kind: 'note',
        frontmatter: page.frontmatter,
        readingTime: page.readingTime,
        lang: page.lang,
        titleId: titleHeading?.slug,
      },
      ctx,
    );
    await writeOut(outDir, page.outPath, html);
  }

  if (!pages.some((p) => p.slug === '')) {
    await writeOut(outDir, 'index.html', renderHomePage(ctx));
  }

  const sitemapExtraUrls: string[] = [];

  if (config.build.folderIndex) {
    for (const folder of listFolders(buildTree(pages))) {
      if (folder.page) continue;
      sitemapExtraUrls.push(folder.url);
      const items = folder.children
        .map((c) => {
          const href = c.page ? c.page.url : c.url;
          const label = c.isFolder ? `${escapeHtml(c.name)}/` : escapeHtml(c.name);
          return `<li><a href="${escapeAttr(href)}">${label}</a></li>`;
        })
        .join('');
      const body = `<ul class="page-list home-list">${items}</ul>`;
      const html = renderDocument(
        { title: folder.name, description: '', bodyHtml: body, url: folder.url, slug: folder.slug, kind: 'folder' },
        ctx,
      );
      await writeOut(outDir, outPathForSlug(folder.slug), html);
    }
  }

  await writeOut(outDir, '404.html', renderNotFoundPage(ctx));

  if (config.features.tags) {
    const tagMap = buildTagMap(pages);
    if (tagMap.size > 0) {
      sitemapExtraUrls.push(withBase('/tags/'));
      await writeOut(outDir, 'tags/index.html', renderTagIndex(ctx, tagMap));
      for (const entry of tagMap.values()) {
        sitemapExtraUrls.push(withBase(`/tags/${tagSlug(entry.display)}/`));
        await writeOut(outDir, `tags/${tagSlug(entry.display)}/index.html`, renderTagPage(ctx, entry));
      }
    }
  }

  const realSlugs = new Set(pages.map((p) => p.slug));
  const writtenAliases = new Set<string>();
  for (const page of pages) {
    for (const alias of page.aliases) {
      const aliasSlug = slugifyPath(alias);
      if (!aliasSlug || realSlugs.has(aliasSlug) || writtenAliases.has(aliasSlug)) continue;
      writtenAliases.add(aliasSlug);
      await writeOut(outDir, outPathForSlug(aliasSlug), redirectHtml(page.url));
    }
  }

  if (config.features.search) {
    await writeOut(outDir, 'search-index.json', buildSearchIndex(pages));
  }

  if (config.features.graph) {
    await writeOut(outDir, 'graph.json', buildGraph(pages));
  }

  // Feeds.
  if (config.features.sitemap) {
    await writeOut(outDir, 'sitemap.xml', buildSitemap(pages, config.site.baseUrl, sitemapExtraUrls));
    await writeOut(outDir, 'robots.txt', buildRobots(config));
  }
  if (config.features.rss) {
    await writeOut(outDir, 'rss.xml', buildRss(pages, config));
  }

  await writeOut(outDir, 'styles.css', buildStyles(config, customCss));

  const client = await getClientRuntime();
  if (client) await writeOut(outDir, 'mdgarden.client.js', client);

  if (config.features.mermaid && pages.some((p) => p.html.includes('class="mermaid"'))) {
    const mermaidJs = await getMermaidRuntime();
    if (mermaidJs) await writeOut(outDir, 'mdgarden.mermaid.js', mermaidJs);
  }

  if (config.features.math) {
    try {
      await copyKatexAssets(outDir);
    } catch (err) {
      console.warn(`Could not copy KaTeX assets (math may be unstyled): ${(err as Error).message}`);
    }
  }

  for (const asset of assets) {
    await copyAsset(contentDir, asset.sourcePath, outDir, asset.outPath);
  }

  for (const plugin of plugins) {
    for (const file of (await plugin.emit?.(pluginCtx)) ?? []) {
      await writeOut(outDir, file.path, file.content);
    }
  }

  await writeOut(
    outDir,
    META_FILENAME,
    JSON.stringify({ version: VERSION, builtAt: new Date().toISOString() }, null, 2),
  );

  return { pageCount: pages.length, assetCount: assets.length, outDir };
}

/** Warn (non-blocking) if the previous build in outDir was made by an older major version. */
async function warnOnMajorVersionJump(outDir: string): Promise<void> {
  if (VERSION === 'unknown') return;
  let previousVersion: string | undefined;
  try {
    const raw = await fs.readFile(path.join(outDir, META_FILENAME), 'utf8');
    previousVersion = (JSON.parse(raw) as { version?: string }).version;
  } catch {
    return; // no previous build, or it predates this manifest — nothing to compare.
  }
  if (!previousVersion) return;

  const prevMajor = majorVersion(previousVersion);
  const curMajor = majorVersion(VERSION);
  if (prevMajor !== null && curMajor !== null && curMajor > prevMajor) {
    console.warn(
      `\n⚠  This site in "${path.basename(outDir)}" was last built with mdgarden v${previousVersion}; ` +
      `you're now on v${VERSION}.\n` +
      `   Major version upgrades may change config or output — check the changelog before publishing.\n`,
    );
  }
}

async function copyKatexAssets(outDir: string): Promise<void> {
  const katexOut = path.join(outDir, 'katex');
  await fs.mkdir(katexOut, { recursive: true });
  await fs.writeFile(path.join(katexOut, 'katex.min.css'), await getKatexCss());
  await writeKatexFonts(path.join(katexOut, 'fonts'));
}

function redirectHtml(target: string): string {
  const attr = escapeAttr(target);
  return (
    `<!doctype html><html lang="en"><head><meta charset="utf-8">` +
    `<meta http-equiv="refresh" content="0; url=${attr}">` +
    `<link rel="canonical" href="${attr}"><title>Redirecting…</title></head>` +
    `<body><p><a href="${attr}">Redirecting…</a></p>` +
    `<script>location.replace(${JSON.stringify(target)})</script></body></html>`
  );
}

/** Populate each page's `backlinks` from outbound wikilink targets. */
function computeBacklinks(pages: Page[], index: ReturnType<typeof buildSiteIndex>): void {
  for (const page of pages) {
    for (const targetSlug of page.links) {
      const target = index.pages.get(targetSlug);
      if (target && target.slug !== page.slug && !target.backlinks.includes(page.slug)) {
        target.backlinks.push(page.slug);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Incremental render cache (skip re-parsing markdown for unchanged files)
// ---------------------------------------------------------------------------

/** Fingerprint of config fields that affect body HTML (features, basePath, landing, ui).
 *  Does not cover programmatic plugins — those bypass this cache path when HTML changes. */
function configSignature(config: MdgardenConfig): string {
  return JSON.stringify({
    features: config.features,
    basePath: config.build.basePath,
    landingPage: config.build.landingPage,
    ui: config.ui ?? null,
  });
}

/** Fingerprint of the resolvable page/asset name space. Adding, renaming, or deleting a
 *  note or asset invalidates every cached body so wikilink resolutions stay correct. */
function indexSignature(index: SiteIndex): string {
  return JSON.stringify({
    pages: [...index.pages.keys()].sort(),
    paths: [...index.pagesByPath.keys()].sort(),
    assets: [...index.assetsByPath.keys()].sort(),
  });
}

interface CachedPage {
  mtimeMs: number;
  html: string;
  links: string[];
  headings: Heading[];
  description: string;
  broken: string[];
}

interface CacheFile {
  configSig: string;
  indexSig: string;
  pages: Record<string, CachedPage>;
}

type BuildCache = Record<string, CachedPage>;

const CACHE_FILENAME = '.mdgarden-cache.json';

/** Type-guard for a cache entry; older caches without `broken` are accepted as empty. */
function isCachedPage(v: unknown): v is CachedPage {
  if (typeof v !== 'object' || v === null) return false;
  const page = v as CachedPage;
  if (typeof page.mtimeMs !== 'number' || typeof page.html !== 'string') return false;
  // Older caches omit `broken`; treat as empty. Reject non-array values.
  if (page.broken === undefined) {
    (page as CachedPage).broken = [];
    return true;
  }
  return Array.isArray(page.broken) && page.broken.every((t) => typeof t === 'string');
}

/** Read the previous build's cache. Returns empty if absent, corrupt, or if
 *  config or the site index changed since the last build. */
async function readBuildCache(
  cwd: string,
  configSig: string,
  indexSig: string,
): Promise<BuildCache> {
  try {
    const raw = await fs.readFile(path.join(cwd, CACHE_FILENAME), 'utf8');
    const file = JSON.parse(raw) as unknown;
    if (typeof file !== 'object' || file === null) return {};
    const cached = file as { configSig?: unknown; indexSig?: unknown; pages?: unknown };
    if (cached.configSig !== configSig || cached.indexSig !== indexSig) return {};
    const pagesRaw = cached.pages;
    if (typeof pagesRaw !== 'object' || pagesRaw === null) return {};
    const cache: BuildCache = {};
    for (const [key, value] of Object.entries(pagesRaw as Record<string, unknown>)) {
      if (isCachedPage(value)) cache[key] = value;
    }
    return cache;
  } catch {
    return {}; // no previous build, or the cache file is unreadable/corrupt — start fresh.
  }
}

/** Reuse cached HTML for pages whose mtime hasn't changed; render the rest.
 *  Returns the reuse count and a map of broken wikilink targets per source file. */
function renderPages(
  md: ReturnType<typeof createMarkdown>,
  pages: Page[],
  index: SiteIndex,
  cache: BuildCache,
): { cachedCount: number; brokenByPage: Map<string, string[]> } {
  let cachedCount = 0;
  const brokenByPage = new Map<string, string[]>();
  for (const page of pages) {
    const cached = cache[page.sourcePath];
    if (page.mtimeMs !== undefined && cached?.mtimeMs === page.mtimeMs) {
      page.html = cached.html;
      page.links = cached.links;
      page.headings = cached.headings;
      page.description = cached.description;
      prepareBodyHtml(page);
      if (cached.broken.length > 0) brokenByPage.set(page.sourcePath, cached.broken);
      cachedCount++;
    } else {
      const broken = renderBody(md, page, index);
      if (broken.length > 0) brokenByPage.set(page.sourcePath, broken);
    }
  }
  return { cachedCount, brokenByPage };
}

/** Persist the freshly rendered pages as the cache for the next build. */
async function writeBuildCache(
  cwd: string,
  pages: Page[],
  configSig: string,
  indexSig: string,
  brokenByPage: Map<string, string[]>,
): Promise<void> {
  const pagesData: BuildCache = {};
  for (const page of pages) {
    if (page.mtimeMs !== undefined) {
      pagesData[page.sourcePath] = {
        mtimeMs: page.mtimeMs,
        html: page.html,
        links: page.links,
        headings: page.headings,
        description: page.description,
        broken: brokenByPage.get(page.sourcePath) ?? [],
      };
    }
  }
  const file: CacheFile = { configSig, indexSig, pages: pagesData };
  try {
    await fs.writeFile(path.join(cwd, CACHE_FILENAME), JSON.stringify(file));
  } catch (err) {
    console.warn(`Failed to write incremental cache: ${(err as Error).message}`);
  }
}
