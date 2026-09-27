import { escapeHtml, isoDate } from '../utils.js';
import { absUrl, withBase } from '../parser/links.js';
import type { MdgardenConfig, Page } from '../types.js';

/** Build sitemap.xml, including any generated pages (tag index, sitemap index, folder indexes, etc.). */
export function buildSitemap(pages: Page[], baseUrl: string, extraUrls: string[] = []): string {
  const noteUrls = pages
    .filter((p) => p.frontmatter.sitemap !== false && p.frontmatter.noindex !== true)
    .map((p) => {
      const dateVal = p.date || (p.mtimeMs ? new Date(p.mtimeMs).toISOString().slice(0, 10) : undefined);
      const lastmod = dateVal ? `<lastmod>${isoDate(dateVal)}</lastmod>` : '';

      const isHome = p.slug === '' || p.url === '/' || p.url === withBase('/');
      const fmPriority = p.frontmatter.priority ?? (p.frontmatter.sitemap as Record<string, unknown> | undefined)?.priority;
      let priorityVal = isHome ? '1.0' : '0.8';
      if (typeof fmPriority === 'number' || (typeof fmPriority === 'string' && !isNaN(Number(fmPriority)))) {
        priorityVal = Math.min(1.0, Math.max(0.0, Number(fmPriority))).toFixed(1);
      }
      const priority = `<priority>${priorityVal}</priority>`;

      const fmFreq = p.frontmatter.changefreq ?? (p.frontmatter.sitemap as Record<string, unknown> | undefined)?.changefreq;
      const freqVal = typeof fmFreq === 'string' ? fmFreq : (isHome ? 'daily' : 'weekly');
      const changefreq = `<changefreq>${escapeHtml(freqVal)}</changefreq>`;

      return `<url><loc>${escapeHtml(absUrl(baseUrl, p.url))}</loc>${lastmod}${changefreq}${priority}</url>`;
    });

  const generatedUrls = extraUrls.map((u) => {
    const isSitemap = u.includes('/sitemap/');
    const priorityVal = isSitemap ? '0.7' : '0.5';
    return `<url><loc>${escapeHtml(absUrl(baseUrl, u))}</loc><changefreq>weekly</changefreq><priority>${priorityVal}</priority></url>`;
  });

  const urls = [...noteUrls, ...generatedUrls].join('');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>\n`;
}

/** Build RSS feed. */
export function buildRss(pages: Page[], config: MdgardenConfig): string {
  const base = config.site.baseUrl;
  const items = pages
    .filter((p) => p.date && p.frontmatter.noindex !== true)
    .sort((a, b) => (a.date! < b.date! ? 1 : -1))
    .slice(0, 20)
    .map((p) => {
      const link = escapeHtml(absUrl(base, p.url));
      const pubDate = p.date ? `<pubDate>${new Date(p.date).toUTCString()}</pubDate>` : '';
      return `<item><title>${escapeHtml(p.title)}</title><link>${link}</link><guid>${link}</guid>${pubDate}<description>${escapeHtml(p.description)}</description></item>`;
    })
    .join('');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>${escapeHtml(config.site.title)}</title><link>${escapeHtml(absUrl(base, withBase('/')))}</link><description>${escapeHtml(config.site.description)}</description>${items}</channel></rss>\n`;
}

/** Build robots.txt. */
export function buildRobots(config: MdgardenConfig): string {
  const lines = ['User-agent: *', 'Allow: /'];
  const base = config.site.baseUrl.replace(/\/$/, '');
  if (base) lines.push(`Sitemap: ${base}${withBase('/sitemap.xml')}`);
  return `${lines.join('\n')}\n`;
}
