---
title: Download
description: Every way to get mdgarden onto your machine
tags: [getting-started, download]
---

# Download

Every method below installs the same `mdgarden` command. Pick whichever
fits your setup — npm needs Node ≥ 18; the standalone binary and Homebrew
need nothing else installed.

## npm (needs Node ≥ 18)

```bash
npm install -g mdgarden
```

Or skip the global install entirely:

```bash
npx mdgarden build
```

## Homebrew (macOS/Linux)

```bash
brew tap THANSHEER/tap
brew install mdgarden
```

## Standalone binary, no Node required

macOS/Linux:

```bash
curl -fsSL https://raw.githubusercontent.com/THANSHEER/mdgarden/main/scripts/install.sh | sh
```

Windows (PowerShell):

```powershell
irm https://raw.githubusercontent.com/THANSHEER/mdgarden/main/scripts/install.ps1 | iex
```

## Manual download

Prebuilt binaries for every platform are attached to each
[GitHub release](https://github.com/THANSHEER/mdgarden/releases) — download
the one matching your OS/architecture, make it executable, and put it on
your `PATH`.

---

Once installed, jump to [[Getting Started/Initial Setup|Initial Setup]] to
run the setup wizard, or [[Getting Started/Quick Start|Quick Start]] to
build a site right away.
