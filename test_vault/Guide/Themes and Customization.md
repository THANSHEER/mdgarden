---
title: Themes and Customization
description: Built-in theme presets, custom colors, and custom CSS
tags: [guide, theme]
---

# Themes & Customization

## Built-in presets

| id | feel |
|---|---|
| `default` | Clean steel-blue, neutral background |
| `forest` | Calm greens, garden feel |
| `rose` | Warm rose + plum, soft contrast |
| `nord` | Cool nordic blue-grey |
| `ink` | Minimal monochrome, serif body |

Switch with:

```bash
mdgarden redesign . --theme forest -y
```

Each preset defines a full light/dark color pair (background, text,
primary, accent, muted, border, surface) plus heading/body/code fonts —
`mdgarden redesign` writes the chosen preset's values straight into
`theme` in your config and rebuilds.

## Overriding individual colors

Presets are just a starting point — tweak any single value afterward
without resetting the rest:

```bash
mdgarden config set theme.colors.light.primary "#a14a6b"
mdgarden config set theme.colors.dark.accent "#e0a7bd"
```

## Dark mode behavior

The theme — preset, colors, and light/dark behavior — is a build-time
decision made by whoever runs `mdgarden build`/`redesign`. The generated
site ships with no on-page control to change it; visitors just see what
you configured.

```bash
mdgarden config set theme.darkMode auto   # follow the OS preference (default)
mdgarden config set theme.darkMode light  # pin to light
mdgarden config set theme.darkMode dark   # pin to dark
```

`auto` renders light by default and switches to your `colors.dark` palette
automatically via `prefers-color-scheme` — no JavaScript involved.

## Custom CSS

For changes a color override can't express, point `theme.customCss` at a
stylesheet (path relative to `mdgarden.config.json`) — it's appended after
the built-in CSS, so it can override anything with a more specific
selector:

```bash
mdgarden config set theme.customCss "extra.css"
```

## Fonts

```bash
mdgarden config set theme.fonts.heading "Fraunces, serif"
mdgarden config set theme.fonts.body "Inter, system-ui, sans-serif"
mdgarden config set theme.fonts.code "JetBrains Mono, monospace"
```

Any valid CSS `font-family` value works — system fonts need no extra
setup; web fonts need a `@font-face` (or `<link>`) added via
`theme.customCss`.
