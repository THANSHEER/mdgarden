---
title: Configuration
description: Every field in mdgarden.config.json, and how to edit it from the CLI
tags: [getting-started, config]
---

# Configuration

`mdgarden init` (or the wizard that runs automatically on a config-less
`build`) writes `mdgarden.config.json` next to your notes. You can hand-edit
it, or use the CLI:

```bash
mdgarden config get                      # print the whole resolved config
mdgarden config get site.author          # read one key (dotted path)
mdgarden config set site.author "Jane Doe"
mdgarden config unset site.logo          # remove a key, fall back to default
```

`config set` parses the value as JSON when it can (so `true`, `42`, and
`["a","b"]` work), and falls back to a plain string otherwise.

## Full shape

```json
{
  "site": {
    "title": "My Notes",
    "description": "Notes published with mdgarden",
    "baseUrl": "",
    "author": "",
    "language": "en",
    "logo": "",
    "image": "",
    "locale": ""
  },
  "theme": {
    "name": "default",
    "darkMode": "auto",
    "colors": { "light": { "...": "..." }, "dark": { "...": "..." } },
    "fonts": { "heading": "...", "body": "...", "code": "..." },
    "customCss": ""
  },
  "nav": [],
  "features": {
    "search": true,
    "backlinks": true,
    "tags": true,
    "graph": true,
    "math": true,
    "syntaxHighlight": true,
    "rss": true,
    "sitemap": true,
    "readingTime": true,
    "mermaid": true,
    "explorer": true,
    "breadcrumbs": true,
    "comments": false
  },
  "build": {
    "contentDir": ".",
    "outDir": "public",
    "basePath": "",
    "landingPage": "index.md",
    "folderIndex": true
  }
}
```

## Field notes

- **`site.baseUrl`** — absolute URL of the deployed site (no trailing
  slash). Used to build absolute links in RSS, the sitemap, and Open Graph
  tags.
- **`site.logo`** — an emoji/short text badge, or an image path/URL, shown
  in the sidebar header. Leave unset to use mdgarden's built-in sprout mark.
- **`theme.darkMode`** — `"auto"` follows the OS preference (default), or
  pin the site to `"light"` / `"dark"`. This is a build-time choice; the
  generated site has no on-page control to change it.
- **`theme.customCss`** — path (relative to the config file) to extra CSS
  appended after the built-in stylesheet, for one-off tweaks without a full
  theme.
- **`build.basePath`** — set this when the site is served from a sub-path
  (e.g. a GitHub Pages project site at `/my-repo`).
- **`build.folderIndex`** — when `true`, folders without their own
  `index.md` get an auto-generated listing page.
- **`comments`** — only used when `features.comments` is `true`; see the
  `CommentsConfig` shape (Giscus only) in the source for the full field
  list.

## Themes

```bash
mdgarden redesign . --theme forest -y
```

Five built-in presets ship today: `default`, `forest`, `rose`, `nord`,
`ink` — each with its own light/dark color pair and fonts. See
[[Guide/Themes and Customization|Themes & Customization]] for previews and
how to override individual colors.
