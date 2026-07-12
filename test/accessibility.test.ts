import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { build } from '../src/core/build.js';
import { prepareBodyHtml } from '../src/parser/render.js';
import type { Page } from '../src/types.js';

const fixtures = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');
const themeCss = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../themes/default/base.css',
);

describe('generated accessibility and responsive foundations', () => {
  let out: string;
  let html: string;
  let css: string;

  beforeAll(async () => {
    out = await fs.mkdtemp(path.join(os.tmpdir(), 'mdgarden-a11y-'));
    await build({ cwd: fixtures, contentDir: '.', outDir: out });
    html = await fs.readFile(path.join(out, 'getting-started/index.html'), 'utf8');
    const rawCss = await fs.readFile(themeCss, 'utf8');
    css = rawCss
      .replace(/@bp-mobile/g, '36rem')
      .replace(/@bp-tablet/g, '56rem')
      .replace(/@bp-laptop/g, '80rem')
      .replace(/@bp-desktop/g, '100rem');
  });

  afterAll(async () => {
    await fs.rm(out, { recursive: true, force: true });
  });

  it('provides skip navigation, landmarks, and current-page state', () => {
    expect(html).toContain('class="skip-link" href="#main-content"');
    expect(html).toContain('<main class="content" id="main-content" tabindex="-1">');
    expect(html).toContain('<article class="md-content">');
    expect(html).toContain('id="site-sidebar" aria-label="Site navigation"');
    expect(html).toContain('aria-current="page"');
  });

  it('emits one page H1 and preserves the Markdown title anchor', () => {
    expect(html.match(/<h1\b/g)).toHaveLength(1);
    expect(html).toContain('<h1 class="page-title" id="getting-started">Getting Started</h1>');
  });

  it('makes overflow regions keyboard-focusable', () => {
    expect(html).toMatch(/<pre\b[^>]*\btabindex="0"/);
    expect(html).toMatch(/<table\b[^>]*\btabindex="0"/);
  });

  it('provides accessible controls and a graph link alternative', () => {
    expect(html).toContain('aria-controls="site-sidebar" aria-expanded="false"');
    expect(html).toContain('aria-haspopup="dialog" aria-expanded="false"');
    expect(html).toContain('<details class="graph-links">');
    expect(html).toContain('<canvas aria-hidden="true"></canvas>');
    expect(html).toMatch(
      /<header class="mobile-bar">\s*<button[^>]*data-sidebar-toggle[\s\S]*?<a class="site-title"/,
    );
  });

  it('includes fluid, reflow, focus, and reduced-motion CSS', () => {
    expect(css).toContain('width: min(100%, 105rem)');
    expect(css).toContain('@media (max-width: 80rem)');
    expect(css).toContain('@media (max-width: 56rem)');
    expect(css).toContain(':focus-visible');
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    expect(css).toContain('direction: rtl');
    expect(css).toContain('scrollbar-width: thin');
    expect(css).toContain('.explorer-file a.is-active::before');
    expect(css).toContain('--pane-inline-space: clamp(1rem, 1.4vw, 1.5rem)');
    expect(css).toContain('padding: 0 var(--article-inline-space) 1.5rem');
  });

  it('demotes a leading Markdown H1 that differs from the page title', () => {
    const page = {
      title: 'Documentation',
      html: '<h1 id="welcome">Welcome</h1><p>Intro</p>',
      headings: [{ level: 1, text: 'Welcome', slug: 'welcome' }],
    } as Page;
    prepareBodyHtml(page);
    expect(page.html).toContain('<h2 id="welcome">Welcome</h2>');
    expect(page.headings[0].level).toBe(2);
  });
});
