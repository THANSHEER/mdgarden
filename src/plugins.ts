// Built-in plugins: Open Graph/Twitter cards, and Giscus comments.

import { absUrl, withBase } from './parser/links.js';
import { escapeAttr, isoDate } from './utils.js';
import type { MdgardenPlugin, RenderInfo } from './core/plugin.js';
import type { MdgardenConfig } from './types.js';

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

/** The built-in plugins enabled for a given config. */
export function builtinPlugins(config: MdgardenConfig): MdgardenPlugin[] {
  const plugins: MdgardenPlugin[] = [ogPlugin()];
  if (config.features.comments && config.comments) plugins.push(commentsPlugin());
  return plugins;
}

// ---------------------------------------------------------------------------
// OG / Twitter Card plugin
// ---------------------------------------------------------------------------

/** Make a URL absolute against `site.baseUrl` (left relative if no baseUrl). */
function absoluteUrl(config: MdgardenConfig, url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  return absUrl(config.site.baseUrl, url);
}

/** Resolve the social image for a document (frontmatter → site default). */
function ogImage(info: RenderInfo, config: MdgardenConfig): string | undefined {
  const fm = info.frontmatter ?? {};
  const raw =
    (typeof fm.image === 'string' && fm.image) ||
    (typeof fm.cover === 'string' && fm.cover) ||
    config.site.image ||
    '';
  if (!raw) return undefined;
  const rooted = raw.startsWith('/') ? withBase(raw) : raw;
  return absoluteUrl(config, rooted);
}

function ogPlugin(): MdgardenPlugin {
  return {
    name: 'og',
    head(info: RenderInfo, config: MdgardenConfig) {
      const fm = info.frontmatter ?? {};
      const title = info.title;
      const desc = info.description;
      const url = absoluteUrl(config, info.url);
      const img = ogImage(info, config);
      const isArticle = info.kind === 'note';

      const tags: string[] = [];

      // Robots meta tag
      const isNoIndex = fm.noindex === true || fm.sitemap === false || info.kind === '404';
      if (typeof fm.robots === 'string') {
        tags.push(`<meta name="robots" content="${escapeAttr(fm.robots)}">`);
      } else if (isNoIndex) {
        tags.push('<meta name="robots" content="noindex, nofollow">');
      }

      // Canonical link
      const canonicalUrl = typeof fm.canonical === 'string' ? fm.canonical : url;
      if (fm.canonical !== false && canonicalUrl) {
        tags.push(`<link rel="canonical" href="${escapeAttr(canonicalUrl)}">`);
      }

      // Author meta
      const author = typeof fm.author === 'string' ? fm.author : config.site.author;
      if (author) {
        tags.push(`<meta name="author" content="${escapeAttr(author)}">`);
      }

      // Open Graph tags
      tags.push(
        `<meta property="og:title" content="${escapeAttr(title)}">`,
        `<meta property="og:description" content="${escapeAttr(desc)}">`,
        `<meta property="og:type" content="${isArticle ? 'article' : 'website'}">`,
        `<meta property="og:url" content="${escapeAttr(url)}">`,
        `<meta property="og:site_name" content="${escapeAttr(config.site.title)}">`,
      );

      if (isArticle) {
        if (typeof fm.date === 'string') {
          const dateStr = isoDate(fm.date);
          tags.push(`<meta property="article:published_time" content="${escapeAttr(dateStr)}">`);
        }
        if (Array.isArray(fm.tags)) {
          for (const tag of fm.tags) {
            tags.push(`<meta property="article:tag" content="${escapeAttr(String(tag))}">`);
          }
        }
      }

      // Twitter tags
      tags.push(
        `<meta name="twitter:card" content="${img ? 'summary_large_image' : 'summary'}">`,
        `<meta name="twitter:title" content="${escapeAttr(title)}">`,
        `<meta name="twitter:description" content="${escapeAttr(desc)}">`,
      );

      if (img) {
        tags.push(`<meta property="og:image" content="${escapeAttr(img)}">`);
        tags.push(`<meta name="twitter:image" content="${escapeAttr(img)}">`);
      }

      return `\n${tags.join('\n')}`;
    },
  };
}

// ---------------------------------------------------------------------------
// Giscus comments plugin
// ---------------------------------------------------------------------------

function commentsPlugin(): MdgardenPlugin {
  return {
    name: 'comments',
    bodyEnd(info: RenderInfo, config: MdgardenConfig) {
      const c = config.comments;
      if (!c || c.provider !== 'giscus') return '';
      if (info.kind !== 'note') return ''; // comments only on real notes
      const attrs: Record<string, string> = {
        'data-repo': c.repo,
        'data-repo-id': c.repoId,
        'data-category': c.category,
        'data-category-id': c.categoryId,
        'data-mapping': c.mapping || 'pathname',
        'data-strict': '0',
        'data-reactions-enabled': '1',
        'data-emit-metadata': '0',
        'data-input-position': 'bottom',
        'data-theme': c.theme || 'preferred_color_scheme',
        'data-lang': config.site.language || 'en',
      };
      const attrStr = Object.entries(attrs)
        .map(([k, v]) => `${k}="${escapeAttr(v)}"`)
        .join(' ');
      return (
        `\n<section class="comments"><script src="https://giscus.app/client.js" ${attrStr} ` +
        `crossorigin="anonymous" async></script></section>`
      );
    },
  };
}
