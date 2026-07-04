import { promises as fs } from 'node:fs';
import path from 'node:path';
import { loadConfig } from './config.js';
import { collectContent, loadIgnorePatterns } from '../parser/content.js';
import { buildSiteIndex, outPathForSlug, setBasePath, slugifyPath, tagSlug, withBase } from '../parser/links.js';
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
import type { Heading, Page } from '../types.js';

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

  const cache = await readBuildCache(cwd);
  const cachedCount = renderPages(md, pages, index, cache);
  await writeBuildCache(cwd, pages);
  if (cachedCount > 0) {
    console.log(`\x1b[36m[cache]\x1b[0m Skipped markdown parsing for ${cachedCount} unchanged file(s)`);
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

  if (config.build.folderIndex) {
    for (const folder of listFolders(buildTree(pages))) {
      if (folder.page) continue;
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
      await writeOut(outDir, 'tags/index.html', renderTagIndex(ctx, tagMap));
      for (const entry of tagMap.values()) {
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
    await writeOut(outDir, 'sitemap.xml', buildSitemap(pages, config.site.baseUrl));
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

interface CachedPage {
  mtimeMs: number;
  html: string;
  links: string[];
  headings: Heading[];
  description: string;
}

type BuildCache = Record<string, CachedPage>;

const CACHE_FILENAME = '.mdgarden-cache.json';

function isCachedPage(v: unknown): v is CachedPage {
  return (
    typeof v === 'object' && v !== null &&
    typeof (v as CachedPage).mtimeMs === 'number' &&
    typeof (v as CachedPage).html === 'string'
  );
}

/** Read the previous build's cache, or an empty cache if there isn't one (or it's corrupt). */
async function readBuildCache(cwd: string): Promise<BuildCache> {
  try {
    const raw = await fs.readFile(path.join(cwd, CACHE_FILENAME), 'utf8');
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return {};
    const cache: BuildCache = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (isCachedPage(value)) cache[key] = value;
    }
    return cache;
  } catch {
    return {}; // no previous build, or the cache file is unreadable/corrupt — start fresh.
  }
}

/** Reuse cached HTML for pages whose mtime hasn't changed; render the rest. Returns the reused count. */
function renderPages(
  md: ReturnType<typeof createMarkdown>,
  pages: Page[],
  index: ReturnType<typeof buildSiteIndex>,
  cache: BuildCache,
): number {
  let cachedCount = 0;
  for (const page of pages) {
    const cached = cache[page.sourcePath];
    if (page.mtimeMs !== undefined && cached?.mtimeMs === page.mtimeMs) {
      page.html = cached.html;
      page.links = cached.links;
      page.headings = cached.headings;
      page.description = cached.description;
      cachedCount++;
    } else {
      renderBody(md, page, index);
    }
    prepareBodyHtml(page);
  }
  return cachedCount;
}

/** Persist the freshly rendered pages as the cache for the next build. */
async function writeBuildCache(cwd: string, pages: Page[]): Promise<void> {
  const cache: BuildCache = {};
  for (const page of pages) {
    if (page.mtimeMs !== undefined) {
      cache[page.sourcePath] = {
        mtimeMs: page.mtimeMs,
        html: page.html,
        links: page.links,
        headings: page.headings,
        description: page.description,
      };
    }
  }
  try {
    await fs.writeFile(path.join(cwd, CACHE_FILENAME), JSON.stringify(cache));
  } catch (err) {
    console.warn(`Failed to write incremental cache: ${(err as Error).message}`);
  }
}
