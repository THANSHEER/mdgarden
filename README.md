<div align="center">

<img src="assets/logo.svg" width="72" height="72" alt="mdgarden logo">

# mdgarden

**A fast, framework-free static site generator for Markdown notes.**

Current release: `v0.3.0`

Search, backlinks, tags, graph view, dark mode, math, and syntax highlighting.
Zero config. No runtime framework.

[![npm version](https://img.shields.io/npm/v/mdgarden.svg)](https://www.npmjs.com/package/mdgarden)
[![npm downloads](https://img.shields.io/npm/dm/mdgarden.svg)](https://www.npmjs.com/package/mdgarden)
[![CI](https://github.com/THANSHEER/mdgarden/actions/workflows/ci.yml/badge.svg)](https://github.com/THANSHEER/mdgarden/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node version](https://img.shields.io/node/v/mdgarden.svg)](package.json)

[Why mdgarden](#why-mdgarden) · [Features](#features) · [Install](#install) · [Quick Start](#quick-start) · [Docs](#docs)

</div>

---

`mdgarden` turns an Obsidian vault, or any folder of Markdown files, into a
clean digital garden. The generated site is static, responsive, and designed
to stay lightweight without a frontend framework or server runtime.

## Why mdgarden

- It feels like a polished site, not a note dump.
- It keeps the browser bundle small and the content pipeline simple.
- It supports the workflows people already use in Markdown and Obsidian.
- It ships with the pieces most note sites need out of the box.

## Features

- Obsidian-style wikilinks, embeds, callouts, tags, footnotes, and math
- Search, backlinks, breadcrumbs, folder explorer, and interactive graphs
- Responsive layouts, dark mode, syntax highlighting, Mermaid, and media embeds
- Keyboard navigation, semantic landmarks, visible focus, and reduced-motion support
- RSS, sitemap, social metadata, aliases, and sub-path hosting
- Five built-in themes with interactive setup and scriptable configuration
- Live reload, a plugin API, and CLI, library, and standalone-binary usage

## Install

The npm package requires Node.js 20.12 or newer.

```bash
npm install -g mdgarden
```

On macOS, install with Homebrew:

```bash
brew tap THANSHEER/tap && brew install mdgarden
```

Standalone downloads for macOS, Linux, and Windows are available from
[GitHub Releases](https://github.com/THANSHEER/mdgarden/releases).

## Quick Start

```bash
# Build a site from a notes folder
mdgarden build ./my-notes -o ./dist

# Create sample content and configuration
mdgarden init ./my-notes

# Preview locally with auto-rebuild
mdgarden serve ./my-notes -o ./preview

# Change the theme or configuration
mdgarden redesign ./my-notes --theme forest -y
mdgarden config set site.author "Your Name" -c ./my-notes/mdgarden.config.json
```

Keep the output directory outside the notes folder when using `serve`, so the
watcher does not treat generated pages as source content.

## Docs

- `npm run vault:dev` previews the bundled sample vault at `http://localhost:3000`
- `npm run vault:build` builds the sample vault into `.vault-site/`
- `npm run site:dev -- /absolute/notes/path -o /tmp/mdgarden-site` previews an external vault
- `CONTRIBUTING.md` covers development commands and the visual-check workflow

## License

[MIT](LICENSE) © 2026 Mohammed Thanseer
