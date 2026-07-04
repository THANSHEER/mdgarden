---
title: Troubleshooting
description: Common build and serve problems, and how to fix them
tags: [support, troubleshooting]
---

# Troubleshooting

A short list of problems people actually hit, and the fix for each.

## "command not found: mdgarden"

The install didn't put the binary on your `PATH`. If you installed via npm,
confirm the global bin directory is on `PATH` (`npm config get prefix`); if
you used the standalone binary, confirm you made it executable and moved it
somewhere on `PATH`. See [[Getting Started/Download|Download]].

## Build picks up stale content

`mdgarden` caches parsed content between runs. If edits aren't showing up,
delete the cache file in your vault root and rebuild:

```bash
rm .mdgarden-cache.json
mdgarden build .
```

## `mdgarden serve` says the port is already in use

Another process (often a previous `serve` that didn't exit cleanly) is
bound to the same port. Stop it, or pass a different port if your version
of the CLI supports `--port`.

## A page fails to render / build crashes on one file

Check that file's frontmatter — invalid YAML (unmatched quotes, bad
indentation) is the most common cause. The build is designed to skip
broken pages rather than crash the whole site; if it doesn't, that's a bug —
see [[Support/Reporting Issues|Reporting Issues]].

## A `[[wikilink]]` renders as plain text instead of a link

The link target doesn't match any file by title or path. Double check the
folder/filename spelling, including spaces and capitalization — wikilinks
are resolved against actual file paths.

## Still stuck?

Open an issue with the details listed in
[[Support/Reporting Issues|Reporting Issues]].
