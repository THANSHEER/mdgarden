<div align="center">

<img src="assets/logo.svg" width="72" height="72" alt="mdgarden logo">

# mdgarden

**Turn a folder of Markdown notes into a fast, themeable static website.**

Search · Backlinks · Tags · Graph view · Dark mode · Math · Syntax highlighting — zero config, no runtime framework.

[![npm version](https://img.shields.io/npm/v/mdgarden.svg)](https://www.npmjs.com/package/mdgarden)
[![npm downloads](https://img.shields.io/npm/dm/mdgarden.svg)](https://www.npmjs.com/package/mdgarden)
[![CI](https://github.com/THANSHEER/mdgarden/actions/workflows/ci.yml/badge.svg)](https://github.com/THANSHEER/mdgarden/actions/workflows/ci.yml)
[![License: GPL-3.0-or-later](https://img.shields.io/badge/license-GPL--3.0--or--later-blue.svg)](LICENSE)
[![Node version](https://img.shields.io/node/v/mdgarden.svg)](package.json)

[Features](#features) · [Installation](#installation) · [Quick Start](#quick-start) · [Contributing](#contributing)

</div>

---

`mdgarden` turns an Obsidian vault—or any directory of Markdown files—into a
static digital garden. The generated site has no frontend framework or server
runtime.

## Features

- Obsidian-style wikilinks, embeds, callouts, tags, footnotes, and math
- Search, backlinks, breadcrumbs, folder explorer, and interactive graphs
- Responsive layouts, dark mode, syntax highlighting, Mermaid, and media embeds
- Keyboard navigation, semantic landmarks, visible focus, and reduced-motion support
- RSS, sitemap, social metadata, aliases, and sub-path hosting
- Five built-in themes with an interactive setup and scriptable configuration
- Live reload, a plugin API, and CLI, library, and standalone-binary usage

## Installation

The npm package requires Node.js 20.12 or newer:

```bash
npm install -g mdgarden
```

On macOS, install with Homebrew using
`brew tap THANSHEER/tap && brew install mdgarden`. Standalone downloads for
macOS, Linux, and Windows are available from
[GitHub Releases](https://github.com/THANSHEER/mdgarden/releases).

## Quick Start

```bash
# Point mdgarden at a folder of notes and build a static site
mdgarden build ./my-notes -o ./dist

# Create sample content and configuration
mdgarden init ./my-notes

# Live-preview while you write, with auto-rebuild on save
mdgarden serve ./my-notes -o ./preview

# Change the design or a configuration value
mdgarden redesign ./my-notes --theme forest -y
mdgarden config set site.author "Your Name" -c ./my-notes/mdgarden.config.json
```

Keep the output directory outside the notes folder when using `serve`, so the
file watcher does not process generated pages as content.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development commands, automated
tests, and the bundled `test_vault/` visual-check workflow.

## License

[GPL-3.0-or-later](LICENSE) © 2026 Mohammed Thanseer
