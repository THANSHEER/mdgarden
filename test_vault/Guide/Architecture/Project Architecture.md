---
title: Project Architecture
description: How the mdgarden codebase is organized, domain by domain
tags: [guide, architecture]
---

# Project Architecture

`mdgarden`'s source (`src/`) is strictly modularized by domain, so each
piece can be reasoned about — and tested — on its own.

| Domain | Responsibility |
|---|---|
| `src/cli/` | Command-line entry points, the interactive `init` wizard, and the live-reloading dev server |
| `src/core/` | The build orchestrator, configuration resolution, file emission, and the plugin architecture |
| `src/parser/` | Turning Markdown into HTML — wikilinks, callouts, math, syntax highlighting, asset path resolution |
| `src/features/` | Build-time data generators that emit JSON consumed by the browser — the graph, the search index, the folder-tree explorer |
| `src/client/` | **Browser runtime code.** Powers the interactive search modal, the force-directed graph, dark mode, and popovers |

## A strict boundary

`src/client/` code ships directly to the browser. It never imports `fs`,
`path`, or anything from `src/core/`, `src/features/`, or `src/parser/` —
keeping Node-only code out of the bundle that runs on a visitor's machine.

## Build pipeline

`src/core/build.ts` is the orchestrator: it resolves config, hands every
source file to `src/parser/` for rendering, runs the `src/features/`
generators over the resulting page set, then emits HTML, JSON, and client
assets to the output directory.

## Standalone binaries

`mdgarden` can also be compiled into a Single Executable Application (SEA).
Assets like the client bundle and KaTeX fonts are loaded through an asset
resolver (`src/parser/assets.ts`) backed by `node:sea`, rather than plain
`fs.readFile`, so the same code works whether it's running from `node_modules`
or from a self-contained binary.

See [[Support/Contributing/Contribution Guide|Contributing]] for how to
build and test this locally, and [[About|About]] for why this architecture
is a deliberate trade-off, not an accident.
