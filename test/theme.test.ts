import { describe, expect, it } from 'vitest';
import { buildStyles } from '../src/parser/theme.js';
import { DEFAULT_CONFIG } from '../src/core/config.js';
import type { MdgardenConfig } from '../src/types.js';

function withDarkMode(mode: MdgardenConfig['theme']['darkMode']): MdgardenConfig {
  return { ...DEFAULT_CONFIG, theme: { ...DEFAULT_CONFIG.theme, darkMode: mode } };
}

describe('buildStyles', () => {
  it('"auto": emits light vars by default plus a prefers-color-scheme dark block, with no on-site control', () => {
    const css = buildStyles(withDarkMode('auto'));
    expect(css).toContain(':root{--color-bg:#faf8f8');
    expect(css).toContain('@media (prefers-color-scheme:dark){:root{--color-bg:#161618');
    expect(css).not.toContain('data-theme');
  });

  it('"light": only emits light vars, no dark block at all', () => {
    const css = buildStyles(withDarkMode('light'));
    expect(css).toContain('--color-bg:#faf8f8');
    expect(css).not.toContain('--color-bg:#161618');
    expect(css).not.toContain('prefers-color-scheme');
  });

  it('"dark": only emits dark vars', () => {
    const css = buildStyles(withDarkMode('dark'));
    expect(css).toContain('--color-bg:#161618');
    expect(css).not.toContain('--color-bg:#faf8f8');
  });

  it('includes font variables and the bundled base stylesheet', () => {
    const css = buildStyles(DEFAULT_CONFIG);
    expect(css).toContain('--font-heading:');
    expect(css).toContain('--font-body:');
    expect(css).toContain('--font-code:');
    expect(css.length).toBeGreaterThan(200); // base.css is non-trivial
  });

  it('appends custom CSS verbatim when non-blank', () => {
    const css = buildStyles(DEFAULT_CONFIG, '.x { color: red; }');
    expect(css).toContain('/* custom */');
    expect(css).toContain('.x { color: red; }');
  });

  it('omits the custom CSS block when blank/whitespace-only', () => {
    const css = buildStyles(DEFAULT_CONFIG, '   \n  ');
    expect(css).not.toContain('/* custom */');
  });
});
