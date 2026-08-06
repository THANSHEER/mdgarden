---
title: Initial Setup
description: A walkthrough of the mdgarden init wizard, prompt by prompt
tags: [getting-started, setup]
---

# Initial Setup

Once `mdgarden` is [[Getting Started/Download|installed]], the fastest way
to get a working `mdgarden.config.json` is the interactive wizard:

```bash
mdgarden init
```

It also runs automatically the first time you `build` a folder that has no
config file yet, so you rarely need to type `init` explicitly.

## What it asks

| Prompt | What to enter | Result |
|---|---|---|
| Site name | Your garden's title, e.g. `My Notes` | written to `site.title` |
| Author | Your name (optional) | written to `site.author` |
| Theme | One of `default`, `forest`, `rose`, `nord`, `ink` | written to `theme.name` plus the full color/font set for that preset |
| Dark mode | `auto` / `light` / `dark` | written to `theme.darkMode` |
| Features | Toggle search, backlinks, tags, graph, math, syntax highlighting, RSS, sitemap, comments, etc. | written to `features.*` |

Every answer maps directly onto a field documented in
[[Getting Started/Configuration|Configuration]] — nothing the wizard writes
is special or hidden, so you can keep editing the same file by hand or with
`mdgarden config set` afterward.

## What it produces

A `mdgarden.config.json` next to your notes, shaped like the example in
[[Getting Started/Configuration|Configuration]], with your answers filled
in and sensible defaults for everything you skipped.

## After running it

```bash
mdgarden build .          # build once
mdgarden serve .          # live-reloading dev server
```

> [!tip] Changed your mind on a theme?
> No need to re-run the wizard — `mdgarden redesign . --theme forest -y`
> swaps the whole color/font set in one command. See
> [[Guide/Themes and Customization|Themes & Customization]].
