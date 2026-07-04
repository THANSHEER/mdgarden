---
title: Installation
description: Install mdgarden via npm, Homebrew, or a standalone binary
tags: [getting-started]
---

# Installation

Every method installs the same `mdgarden` command. The **npm** route needs
Node ≥ 18; the **standalone binary** and **Homebrew** options need nothing
else installed.

## macOS / Linux

```bash
# Homebrew
brew tap THANSHEER/tap && brew install mdgarden

# npm (needs Node >= 18)
npm install -g mdgarden

# Standalone binary, no Node required
curl -fsSL https://raw.githubusercontent.com/THANSHEER/mdgarden/main/scripts/install.sh | sh
```

## Windows (PowerShell)

```powershell
# npm (needs Node >= 18)
npm install -g mdgarden

# Standalone binary, no Node required
irm https://raw.githubusercontent.com/THANSHEER/mdgarden/main/scripts/install.ps1 | iex
```

## Run without installing

```bash
npx mdgarden build
```

Prebuilt binaries for every platform are also attached to each
[GitHub release](https://github.com/THANSHEER/mdgarden/releases).

## Next

Continue to [[Getting Started/Quick Start|Quick Start]].
