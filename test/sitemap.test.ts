import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { build } from '../src/core/build.js';

const fixtures = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');
const read = (dir: string, rel: string) => fs.readFile(path.join(dir, rel), 'utf8');
const exists = (dir: string, rel: string) =>
  fs.access(path.join(dir, rel)).then(() => true).catch(() => false);

describe('sitemap & SEO integration', () => {
  let out: string;

  beforeAll(async () => {
    out = await fs.mkdtemp(path.join(os.tmpdir(), 'mdgarden-sitemap-'));
    await build({ cwd: fixtures, contentDir: '.', outDir: out });
  });

  afterAll(async () => {
    await fs.rm(out, { recursive: true, force: true });
  });

  it('generates an HTML sitemap page at sitemap/index.html', async () => {
    expect(await exists(out, 'sitemap/index.html')).toBe(true);
    const html = await read(out, 'sitemap/index.html');
    expect(html).toContain('Sitemap');
    expect(html).toContain('sitemap-nav');
    expect(html).toContain('sitemap-group');
    expect(html).toContain('href="/getting-started/"');
    expect(html).toContain('sitemap.xml');
  });

  it('includes the HTML sitemap in sitemap.xml', async () => {
    const xml = await read(out, 'sitemap.xml');
    expect(xml).toContain('/sitemap/');
    expect(xml).toContain('<priority>0.7</priority>');
  });

  it('injects RSS autodiscovery and sitemap link tags into document head', async () => {
    const html = await read(out, 'getting-started/index.html');
    expect(html).toContain('<link rel="alternate" type="application/rss+xml"');
    expect(html).toContain('href="/rss.xml"');
    expect(html).toContain('<link rel="sitemap" type="application/xml"');
    expect(html).toContain('href="/sitemap.xml"');
  });

  it('injects Open Graph and Twitter Card tags into document head', async () => {
    const html = await read(out, 'getting-started/index.html');
    expect(html).toContain('<meta property="og:title"');
    expect(html).toContain('<meta property="og:site_name"');
    expect(html).toContain('<meta property="og:type" content="article"');
    expect(html).toContain('<meta name="twitter:card"');
    expect(html).toContain('<link rel="canonical"');
  });
});
