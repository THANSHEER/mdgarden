---
title: mdgarden Documentation
description: A lightweight, framework-free static-site generator for Markdown notes
---

# mdgarden 🌱

`mdgarden` turns a folder of Markdown notes into a fast, themeable static
website — search, backlinks, tags, an interactive graph view, dark mode,
math, and syntax highlighting, with no runtime framework and no native
dependencies. It speaks Obsidian-flavored Markdown, so an existing Obsidian
vault (or any pile of `.md` files) works out of the box.

This vault **is** the documentation — and it's also what we build against
during development (`npm run vault:dev`), so every page on the left doubles
as a real, rendered example of the feature it describes.

## Start here

- [[Getting Started/Download|Download]] — every install method, side by side
- [[Getting Started/Installation|Installation]] — npm, Homebrew, or a standalone binary
- [[Getting Started/Initial Setup|Initial Setup]] — the `mdgarden init` wizard, prompt by prompt
- [[Getting Started/Quick Start|Quick Start]] — build your first site in under a minute
- [[Getting Started/Configuration|Configuration]] — `mdgarden.config.json`, themes, and feature flags
- [[Getting Started/Updating/Update Guide|Updating]] — keep an existing install current

## Guide

- [[Guide/Markdown Syntax|Markdown Syntax]] — wikilinks, embeds, callouts, footnotes, frontmatter
- [[Guide/CLI Reference|CLI Reference]] — every command and flag
- [[Guide/Themes and Customization|Themes & Customization]] — presets, custom colors, custom CSS
- [[Guide/Architecture/Project Architecture|Architecture]] — how the codebase is organized

## Showcase

- [[Showcase/Diagrams|Diagrams]] — Mermaid flowcharts, sequence diagrams, and a hand-drawn SVG
- [[Showcase/Code Highlighting|Code Highlighting]] — Shiki syntax highlighting across languages
- [[Showcase/Math|Math]] — KaTeX inline and block equations

## Support

- [[Support/Troubleshooting|Troubleshooting]] — common problems and fixes
- [[Support/Reporting Issues|Reporting Issues]] — how to file a useful bug report
- [[Support/Contributing/Contribution Guide|Contributing]] — local dev setup, tests, and PRs

## About

- [[About|About]] — what mdgarden is, and who builds it
- [[Donate|Donate]] — ways to support development

## Why mdgarden?

| | |
|---|---|
| 🔗 **Obsidian-flavored Markdown** | `[[wikilinks]]`, `![[embeds]]`, `> [!note]` callouts, GFM, footnotes, math |
| 🖼️ **Media-aware** | Images, GIFs, video, and audio embeds — lazy-loaded, dimensions set automatically |
| 🪴 **Obsidian Publish–style layout** | Three independently scrolling panes (notes · article · graph/TOC) |
| 🧙 **Interactive setup** | `mdgarden init` asks for a name, theme, and features — no JSON to write by hand |
| 🎨 **Built-in themes** | `default`, `forest`, `rose`, `nord`, `ink` |
| 🔍 **Search & navigation** | Static search index, folder-tree explorer, breadcrumbs, backlinks, tags, graph |
| 🌙 **Rich rendering** | Dark mode, Shiki syntax highlighting, KaTeX math, lazy Mermaid diagrams |
| 📡 **SEO & sharing** | Social cards, `robots.txt`, RSS, sitemap, aliases/redirects, sub-path hosting |
| ⚡ **Dev experience** | `mdgarden serve` with live reload, a small plugin API, optional Giscus comments |

> [!tip] Try it
> Run `npm run vault:dev` from the repo root, then edit any file under
> `test_vault/` — the page rebuilds and reloads automatically.
