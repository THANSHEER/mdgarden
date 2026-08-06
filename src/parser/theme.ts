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

export function buildStyles(config: MdgardenConfig, customCss = ''): string {
  const { colors, fonts, darkMode } = config.theme;
  const light = colorVars(colors.light);
  const dark = colorVars(colors.dark);
  const fontVars = `--font-heading:${fonts.heading};--font-body:${fonts.body};--font-code:${fonts.code};`;

  let css = '';
  if (darkMode === 'dark') {
    css += `:root, :root[data-theme="dark"] { ${dark}; ${fontVars} }\n`;
  } else if (darkMode === 'light') {
    css += `:root, :root[data-theme="light"] { ${light}; ${fontVars} }\n`;
  } else {
    // Default to light mode
    css += `:root, :root[data-theme="light"] { ${light}; ${fontVars} }\n`;
    // Override with dark mode if OS prefers dark, UNLESS user explicitly forces light mode
    css += `@media (prefers-color-scheme: dark) {\n  :root:not([data-theme="light"]) { ${dark} }\n}\n`;
    // Explicitly force dark mode regardless of OS
    css += `:root[data-theme="dark"] { ${dark} }\n`;
  }

  let finalBaseCss = baseCss;
  if (config.theme.layout?.breakpoints) {
    const { mobile, tablet, laptop, desktop } = config.theme.layout.breakpoints;
    finalBaseCss = finalBaseCss
      .replace(/@bp-mobile/g, mobile)
      .replace(/@bp-tablet/g, tablet)
      .replace(/@bp-laptop/g, laptop)
      .replace(/@bp-desktop/g, desktop);
  }

  css += finalBaseCss;
  if (customCss.trim()) css += `\n/* custom */\n${customCss}`;
  return css;
}
