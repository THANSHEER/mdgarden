---
title: CLI Reference
description: Every mdgarden command, flag, and what it does
tags: [guide, cli]
---

# CLI Reference

## Commands

### `mdgarden build [contentDir]`

Build a static site from a folder of Markdown. Runs the setup wizard first
if no config exists yet and the terminal is interactive.

| Flag | Description |
|---|---|
| `-o, --out <dir>` | Output directory (default: from config, or `public`) |
| `-c, --config <file>` | Path to `mdgarden.config.json` |
| `-y, --yes` | Skip the interactive setup; build with config/defaults |

### `mdgarden rebuild [contentDir]`

Like `build`, but requires an existing `mdgarden.config.json` — never
launches the wizard. Useful in CI.

| Flag | Description |
|---|---|
| `-o, --out <dir>` | Output directory |
| `-c, --config <file>` | Path to `mdgarden.config.json` |

### `mdgarden serve [contentDir]`

Build, then serve locally with live reload. Watches `contentDir` (and the
config file) for changes and rebuilds automatically.

| Flag | Description |
|---|---|
| `-p, --port <port>` | Port to listen on (default: `3000`, tries the next few if busy) |
| `-o, --out <dir>` | Output directory |
| `-c, --config <file>` | Path to `mdgarden.config.json` |

### `mdgarden init [dir]`

Scaffold a `mdgarden.config.json` and sample content in `dir` (default `.`).

| Flag | Description |
|---|---|
| `-y, --yes` | Skip prompts; scaffold with sensible defaults |

### `mdgarden redesign [dir]`

Pick a new theme preset for an existing site and rebuild.

| Flag | Description |
|---|---|
| `--theme <id>` | Theme preset id: `default`, `forest`, `rose`, `nord`, `ink` |
| `-y, --yes` | Skip prompts (requires `--theme`) |

### `mdgarden config <action> [key] [value]`

Read or edit `mdgarden.config.json` without hand-writing JSON.

```bash
mdgarden config get [key]          # print whole config, or one dotted key
mdgarden config set <key> <value>  # write a value (parsed as JSON if possible)
mdgarden config unset <key>        # remove a key, falling back to default
```

| Flag | Description |
|---|---|
| `-c, --config <file>` | Path to `mdgarden.config.json` |

### `mdgarden update`

Update `mdgarden` to the latest available version.

| Flag | Description |
|---|---|
| `-b, --background` | Run the update in the background and return immediately |

Update behavior depends on the install source:

- standalone installs re-run the bundled installer against the current binary
  directory;
- Homebrew installs use `brew upgrade mdgarden`;
- npm installs use `npm install -g mdgarden@latest`.

### `mdgarden publish [contentDir]`

Build, then deploy straight to GitHub Pages or Cloudflare Pages.

| Flag | Description |
|---|---|
| `-t, --target <target>` | Deploy target: `github` or `cloudflare` |
| `-b, --branch <branch>` | Git branch for GitHub Pages (default `gh-pages`) |
| `--project-name <name>` | Cloudflare Pages project name |
| `-m, --message <message>` | Commit message for the GitHub Pages deploy |
| `-o, --out <dir>` | Output directory |
| `-c, --config <file>` | Path to `mdgarden.config.json` |

## See also

- `mdgarden --help` / `mdgarden <command> --help` for this same reference
  in your terminal.
- `mdgarden --version` to print the installed version.
