---
title: Quick Start
description: Build, serve, and theme your first mdgarden site
tags: [getting-started]
---

# Quick Start

```bash
# Point mdgarden at a folder of notes and build a static site
mdgarden build ./my-notes -o ./dist

# Or run the interactive setup wizard for a guided first build
mdgarden init

# Live-preview while you write, with auto-rebuild on save
mdgarden serve ./my-notes

# Switch themes or tweak settings without hand-editing JSON
mdgarden redesign ./my-notes --theme forest -y
mdgarden config set site.author "Your Name"
```

## What just happened

- `mdgarden build` scans `./my-notes` for `.md` files, renders each one to
  HTML, and writes the result (plus search index, graph data, RSS, sitemap,
  and copied assets) to `./dist`.
- If no `mdgarden.config.json` exists yet and you're in an interactive
  terminal, `build` (and `init`) launch a short setup wizard — site title,
  author, theme preset, and which features to turn on.
- `mdgarden serve` does the same build, then starts a local HTTP server with
  live reload: edit a note, save, and the open browser tab refreshes itself.

## Where to go next

- [[Getting Started/Configuration|Configuration]] to see every setting
  `mdgarden.config.json` supports.
- [[Guide/CLI Reference|CLI Reference]] for the full command list.
- [[Guide/Markdown Syntax|Markdown Syntax]] for wikilinks, callouts, and embeds.
