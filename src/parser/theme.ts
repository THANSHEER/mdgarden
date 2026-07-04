import baseCss from '../../themes/default/base.css';
import type { MdgardenConfig, ThemeColors } from '../types.js';

function colorVars(c: ThemeColors): string {
  return [
    `--color-bg:${c.background}`,
    `--color-text:${c.text}`,
    `--color-primary:${c.primary}`,
    `--color-accent:${c.accent}`,
    `--color-muted:${c.muted}`,
    `--color-border:${c.border}`,
    `--color-surface:${c.surface}`,
  ].join(';');
}

/** Build site stylesheet. Theme is decided entirely at build time (config/`redesign`) — the site ships no UI to switch it. */
export function buildStyles(config: MdgardenConfig, customCss = ''): string {
  const { colors, fonts, darkMode } = config.theme;
  const light = colorVars(colors.light);
  const dark = colorVars(colors.dark);
  const fontVars = `--font-heading:${fonts.heading};--font-body:${fonts.body};--font-code:${fonts.code};`;

  let css = '';
  if (darkMode === 'dark') {
    css += `:root{${dark};${fontVars}}\n`;
  } else if (darkMode === 'light') {
    css += `:root{${light};${fontVars}}\n`;
  } else {
    // 'auto': light by default, dark only via the OS preference — there's no
    // on-site control, so this is the sole source of dark mode.
    css += `:root{${light};${fontVars}}\n`;
    css += `@media (prefers-color-scheme:dark){:root{${dark}}}\n`;
  }

  css += baseCss;
  if (customCss.trim()) css += `\n/* custom */\n${customCss}`;
  return css;
}
