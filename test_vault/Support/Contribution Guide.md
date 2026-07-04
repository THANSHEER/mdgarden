---
title: Contribution Guide
description: How to set up mdgarden locally, run tests, and submit changes
tags: [support, contributing]
---

# Contribution Guide

`mdgarden` is open source — contributions of code, docs, or bug reports are
welcome. This page is the vault-friendly version of the repo's
`CONTRIBUTING.md`; that file is the source of truth if the two ever drift.

## Local development

```bash
git clone https://github.com/THANSHEER/mdgarden.git
cd mdgarden
npm install        # also builds assets via the `prepare` lifecycle hook
```

```bash
npm run dev         # esbuild watch mode
npm run typecheck    # TypeScript only, no bundling
npm run build        # full production build (typecheck + bundle + .d.ts)
```

## Tests

`mdgarden` uses [Vitest](https://vitest.dev/):

```bash
npm run test         # run once
npm run test:watch   # watch mode
```

## Using this vault to verify changes

`test_vault/` (this vault) is the manual-testing fixture — see
[[index|the homepage]] for what it demonstrates. Two commands cover the
loop, each rebuilding the package first so your latest source changes are
picked up:

```bash
npm run vault:build   # builds test_vault → .vault-site (gitignored)
npm run vault:dev      # serves it at http://localhost:3000 with live reload
```

Build output deliberately lives outside `test_vault/`, not nested inside
it — a nested output dir would make `vault:dev`'s watcher see its own
output as a content change and rebuild forever.

> [!note]
> `test/fixtures` intentionally contains edge cases like broken frontmatter.
> The build must never crash on them — if you touch the parser, run the
> full test suite, not just the vault.

## Standalone binary (Node SEA)

```bash
npm run build:binary
```

Outputs to `build/mdgarden` (`build/mdgarden.exe` on Windows).

> [!important]
> SEA builds require an **official, statically-linked Node binary** with
> the fuse sentinel — Homebrew/shared Node installs won't work. If needed,
> download one from [nodejs.org/dist](https://nodejs.org/dist) and set
> `MDGARDEN_SEA_NODE=/path/to/node npm run build:binary`.

## Project layout

See [[Guide/Architecture/Project Architecture|Architecture]] for the
domain breakdown (`src/cli/`, `src/core/`, `src/parser/`,
`src/features/`, `src/client/`).

## Submitting changes

Open a pull request against `main` with a clear description of what
changed and why. Keep changes focused — small, reviewable PRs land faster
than large ones. Found something to fix but don't have time to do it
yourself? See [[Support/Reporting Issues|Reporting Issues]] instead.
