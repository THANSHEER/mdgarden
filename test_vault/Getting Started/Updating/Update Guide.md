---
title: Update Guide
description: How to update mdgarden once it's already installed
tags: [getting-started, update]
---

# Update Guide

How you update depends on how you [[Getting Started/Download|installed]]
`mdgarden` in the first place.

## npm

```bash
npm update -g mdgarden
```

## Homebrew

```bash
brew upgrade mdgarden
```

## Standalone binary

Re-run the same install script you used the first time — it always fetches
the latest release:

```bash
curl -fsSL https://raw.githubusercontent.com/THANSHEER/mdgarden/main/scripts/install.sh | sh
```

```powershell
irm https://raw.githubusercontent.com/THANSHEER/mdgarden/main/scripts/install.ps1 | iex
```

Or download the newest binary directly from
[GitHub Releases](https://github.com/THANSHEER/mdgarden/releases) and replace
the old one on your `PATH`.

## Checking your version

```bash
mdgarden --version
```

Compare it against the latest tag on
[GitHub Releases](https://github.com/THANSHEER/mdgarden/releases), where every
release lists what changed.

> [!warning] Before updating across a major version
> Check the release notes for breaking changes to `mdgarden.config.json` —
> run `mdgarden config get` after updating to confirm your config still
> resolves the way you expect, and see
> [[Support/Troubleshooting|Troubleshooting]] if something looks off.
