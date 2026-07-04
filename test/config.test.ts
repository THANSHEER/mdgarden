import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CONFIG,
  getConfigValue,
  parseConfigValue,
  resolveConfig,
  setConfigValue,
  unsetConfigValue,
} from '../src/core/config.js';
import { UI, t } from '../src/utils.js';

describe('config defaults', () => {
  it('keeps new feature flags on (comments off) and base defaults', () => {
    const f = DEFAULT_CONFIG.features;
    expect([f.readingTime, f.mermaid, f.explorer, f.breadcrumbs]).toEqual([true, true, true, true]);
    expect(f.comments).toBe(false);
    expect(DEFAULT_CONFIG.build.basePath).toBe('');
    expect(DEFAULT_CONFIG.build.folderIndex).toBe(true);
    // build.ignore no longer exists — patterns live in .mdgardenignore
    expect('ignore' in DEFAULT_CONFIG.build).toBe(false);
  });

  it('deep-merges a partial user config onto the defaults (missing flags retained)', () => {
    const cfg = resolveConfig({ features: { graph: false } });
    expect(cfg.features.graph).toBe(false);
    expect(cfg.features.search).toBe(true); // untouched default survives
    expect(cfg.features.mermaid).toBe(true); // new default survives a partial features block
  });
});

describe('config get/set/unset (dotted paths)', () => {
  it('reads a nested value by dotted path', () => {
    expect(getConfigValue(DEFAULT_CONFIG, 'site.title')).toBe('My Notes');
    expect(getConfigValue(DEFAULT_CONFIG, 'theme.colors.light.primary')).toBe('#284b63');
  });

  it('returns undefined for an unknown path without throwing', () => {
    expect(getConfigValue(DEFAULT_CONFIG, 'site.nope')).toBeUndefined();
    expect(getConfigValue(DEFAULT_CONFIG, 'nope.nope.nope')).toBeUndefined();
  });

  it('sets a nested value without mutating the original config', () => {
    const updated = setConfigValue(DEFAULT_CONFIG, 'site.author', 'Jane Doe');
    expect(updated.site.author).toBe('Jane Doe');
    expect(DEFAULT_CONFIG.site.author).toBe('');
  });

  it('creates intermediate objects for a path that does not exist yet', () => {
    const updated = setConfigValue(DEFAULT_CONFIG, 'ui.onThisPage', 'On this note');
    expect(updated.ui).toEqual({ onThisPage: 'On this note' });
  });

  it('removes a key with unset, leaving the rest of the config intact', () => {
    const withLogo = setConfigValue(DEFAULT_CONFIG, 'site.logo', '🌱');
    const removed = unsetConfigValue(withLogo, 'site.logo');
    expect(removed.site.logo).toBeUndefined();
    expect(removed.site.title).toBe(DEFAULT_CONFIG.site.title);
  });

  it('rejects an empty key', () => {
    expect(() => getConfigValue(DEFAULT_CONFIG, '')).toThrow(/must not be empty/);
    expect(() => setConfigValue(DEFAULT_CONFIG, '', 'x')).toThrow(/must not be empty/);
  });

  it('rejects __proto__/constructor/prototype segments instead of polluting Object.prototype', () => {
    expect(() => setConfigValue(DEFAULT_CONFIG, '__proto__.polluted', true)).toThrow(/must not contain/);
    expect(() => setConfigValue(DEFAULT_CONFIG, 'site.constructor.polluted', true)).toThrow(/must not contain/);
    expect(() => unsetConfigValue(DEFAULT_CONFIG, '__proto__.polluted')).toThrow(/must not contain/);
    expect(() => getConfigValue(DEFAULT_CONFIG, '__proto__.polluted')).toThrow(/must not contain/);
    // The actual regression this guards against: no shared prototype was touched.
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});

describe('parseConfigValue', () => {
  it('parses JSON-shaped CLI values (booleans, numbers, arrays, objects)', () => {
    expect(parseConfigValue('true')).toBe(true);
    expect(parseConfigValue('42')).toBe(42);
    expect(parseConfigValue('["a","b"]')).toEqual(['a', 'b']);
    expect(parseConfigValue('{"url":"/"}')).toEqual({ url: '/' });
  });

  it('falls back to the raw string when it is not valid JSON', () => {
    expect(parseConfigValue('Jane Doe')).toBe('Jane Doe');
    expect(parseConfigValue('https://example.com')).toBe('https://example.com');
  });
});

describe('i18n', () => {
  it('falls back to the English default, honors ui overrides', () => {
    expect(t('onThisPage')).toBe(UI.onThisPage);
    expect(t('onThisPage', { ui: { onThisPage: 'Sur cette page' } })).toBe('Sur cette page');
  });
});
