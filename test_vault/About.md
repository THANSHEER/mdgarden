---
title: About
description: What mdgarden is, who builds it, and why
tags: [about]
---

# About mdgarden

`mdgarden` is a lightweight, framework-free static-site generator: point it
at a folder of `.md` files and it renders a complete digital garden —
search, backlinks, tags, an interactive graph view, dark mode, math, and
syntax highlighting — with no runtime framework and no native dependencies.
It speaks Obsidian-flavored Markdown, so an existing Obsidian vault (or any
pile of notes) works out of the box.

This very vault, [[index|the docs you're reading]], is also the project's
manual-testing fixture — see [[Support/Contributing/Contribution Guide|Contributing]]
for how that works.

## Why it exists

Most static-site generators that handle wikilinks and a graph view pull in a
full frontend framework. `mdgarden` is built around the opposite bet: ship
the smallest possible amount of JavaScript and CSS, no native build
dependencies, and a single binary if you want one — see
[[Guide/Architecture/Project Architecture|Architecture]] for how the codebase
is organized to keep that promise.

## Author & license

Built and maintained by Mohammed Thanseer. Source is published under
[GPL-3.0-or-later](https://github.com/THANSHEER/mdgarden/blob/main/LICENSE).

## Links

- Repository — [github.com/THANSHEER/mdgarden](https://github.com/THANSHEER/mdgarden)
- Package — [npmjs.com/package/mdgarden](https://www.npmjs.com/package/mdgarden)
- Releases — [github.com/THANSHEER/mdgarden/releases](https://github.com/THANSHEER/mdgarden/releases)

> [!tip] Like the project?
> See [[Donate|Donate]] for ways to support development, including a live
> example site built with `mdgarden`.
