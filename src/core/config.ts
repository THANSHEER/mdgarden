import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { MdgardenConfig, ThemeColors } from '../types.js';

import defaultTheme from '../../themes/default/theme.json' with { type: 'json' };
import forestTheme from '../../themes/forest/theme.json' with { type: 'json' };
import roseTheme from '../../themes/rose/theme.json' with { type: 'json' };
import nordTheme from '../../themes/nord/theme.json' with { type: 'json' };
import inkTheme from '../../themes/ink/theme.json' with { type: 'json' };

// ---------------------------------------------------------------------------
// Theme presets
// ---------------------------------------------------------------------------

/** Theme preset options (used by the setup wizard). */
export interface ThemePreset {
  id: string;
  label: string;
  hint: string;
  colors: { light: ThemeColors; dark: ThemeColors };
  fonts: { heading: string; body: string; code: string };
  layout: {
    breakpoints: {
      mobile: string;
      tablet: string;
      laptop: string;
      desktop: string;
    };
  };
}

export const THEME_PRESETS: ThemePreset[] = [
  defaultTheme as ThemePreset,
  forestTheme as ThemePreset,
  roseTheme as ThemePreset,
  nordTheme as ThemePreset,
  inkTheme as ThemePreset,
];

/** Find theme preset by ID. */
export function findPreset(id: string): ThemePreset | undefined {
  const want = id.trim().toLowerCase();
  return THEME_PRESETS.find((p) => p.id === want);
}

// ---------------------------------------------------------------------------
// Default config & loading
// ---------------------------------------------------------------------------

export const DEFAULT_CONFIG: MdgardenConfig = {
  site: {
    title: 'My Notes',
    description: 'Notes published with mdgarden',
    baseUrl: '',
    author: '',
    language: 'en',
  },
  theme: {
    name: 'default',
    darkMode: 'auto',
    colors: defaultTheme.colors,
    fonts: defaultTheme.fonts,
    layout: defaultTheme.layout,
  },
  nav: [],
  features: {
    search: true,
    backlinks: true,
    tags: true,
    graph: true,
    math: true,
    syntaxHighlight: true,
    rss: true,
    sitemap: true,
    readingTime: true,
    mermaid: true,
    explorer: true,
    breadcrumbs: true,
    comments: false,
  },
  build: {
    contentDir: '.',
    outDir: 'public',
    basePath: '',
    landingPage: 'index.md',
    folderIndex: true,
  },
};

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Deep-merge overrides onto a base object. */
function deepMerge<T>(base: T, override: unknown): T {
  if (!isPlainObject(base) || !isPlainObject(override)) {
    return override === undefined ? base : (override as T);
  }
  const out: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (value === undefined) continue;
    const baseValue = (base as Record<string, unknown>)[key];
    out[key] = isPlainObject(baseValue) && isPlainObject(value)
      ? deepMerge(baseValue, value)
      : value;
  }
  return out as T;
}

/**
 * Derive build.basePath from site.baseUrl when basePath is not explicitly set.
 * Works for any hosting provider that serves the site at a URL sub-path
 * (GitHub Pages project sites, Cloudflare, Vercel, Render, AWS, Azure, etc.).
 *
 * Examples:
 *   "https://owner.github.io/my-repo"  → "/my-repo"
 *   "https://mysite.vercel.app/docs"   → "/docs"
 *   "https://example.com"              → ""  (root — no prefix needed)
 */
function derivedBasePath(config: MdgardenConfig): string {
  // Explicit basePath always wins (including empty string to force root).
  if (config.build.basePath) return config.build.basePath;
  const url = config.site.baseUrl;
  if (!url) return '';
  try {
    const pathname = new URL(url).pathname.replace(/\/+$/, '');
    return pathname === '' ? '' : pathname;
  } catch {
    return ''; // malformed baseUrl — fall back to root
  }
}

/** Resolve configuration. */
export function resolveConfig(input: unknown): MdgardenConfig {
  const config = deepMerge(DEFAULT_CONFIG, input);
  config.build.basePath = derivedBasePath(config);
  return config;
}

// ---------------------------------------------------------------------------
// Dotted-path config access (powers `mdgarden config get/set/unset`)
// ---------------------------------------------------------------------------

// Property names that resolve to the shared Object.prototype instead of a real
// data field. Without this guard, "mdgarden config set __proto__.x y" would
// walk onto Object.prototype itself and pollute every plain object in the process.
const UNSAFE_KEY_PARTS = new Set(['__proto__', 'constructor', 'prototype']);

function splitKey(key: string): string[] {
  const parts = key.split('.').filter(Boolean);
  if (parts.length === 0) throw new Error('Config key must not be empty');
  if (parts.some((p) => UNSAFE_KEY_PARTS.has(p))) {
    throw new Error(`Config key must not contain "${[...UNSAFE_KEY_PARTS].join('", "')}"`);
  }
  return parts;
}

/** Read a nested value by dotted path, e.g. "site.author" or "theme.colors.light.primary". */
export function getConfigValue(config: MdgardenConfig, key: string): unknown {
  let cur: unknown = config;
  for (const part of splitKey(key)) {
    if (!isPlainObject(cur) && !Array.isArray(cur)) return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

/** Parse a raw CLI argument into a JS value: JSON when it parses (numbers, booleans, arrays, objects), else the raw string. */
export function parseConfigValue(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

/** Return a new config with `value` written at dotted path `key`, creating intermediate objects as needed. */
export function setConfigValue(config: MdgardenConfig, key: string, value: unknown): MdgardenConfig {
  const parts = splitKey(key);
  const clone = structuredClone(config) as unknown as Record<string, unknown>;
  let cur = clone;
  for (let i = 0; i < parts.length - 1; i++) {
    const next = cur[parts[i]];
    if (!isPlainObject(next)) cur[parts[i]] = {};
    cur = cur[parts[i]] as Record<string, unknown>;
  }
  cur[parts[parts.length - 1]] = value;
  return clone as unknown as MdgardenConfig;
}

/** Return a new config with the dotted path `key` removed (falls back to the default on next load). */
export function unsetConfigValue(config: MdgardenConfig, key: string): MdgardenConfig {
  const parts = splitKey(key);
  const clone = structuredClone(config) as unknown as Record<string, unknown>;
  let cur = clone;
  for (let i = 0; i < parts.length - 1; i++) {
    const next = cur[parts[i]];
    if (!isPlainObject(next)) return clone as unknown as MdgardenConfig;
    cur = next as Record<string, unknown>;
  }
  delete cur[parts[parts.length - 1]];
  return clone as unknown as MdgardenConfig;
}

export interface LoadedConfig {
  config: MdgardenConfig;
  /** Directory the config lives in (base for resolving contentDir/outDir/customCss). */
  baseDir: string;
  /** Path the config was loaded from, or null when defaults were used. */
  configPath: string | null;
}

/** Load mdgarden.config.json. */
export async function loadConfig(explicitPath: string | undefined, cwd: string): Promise<LoadedConfig> {
  const target = explicitPath
    ? path.resolve(cwd, explicitPath)
    : path.join(cwd, 'mdgarden.config.json');

  try {
    const raw = await fs.readFile(target, 'utf8');
    const parsed: unknown = JSON.parse(raw);
    return { config: resolveConfig(parsed), baseDir: path.dirname(target), configPath: target };
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (explicitPath || code !== 'ENOENT') {
      throw new Error(`Could not read config at ${target}: ${(err as Error).message}`);
    }
    return { config: resolveConfig({}), baseDir: cwd, configPath: null };
  }
}
