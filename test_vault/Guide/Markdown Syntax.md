---
title: Markdown Syntax
description: Wikilinks, embeds, callouts, footnotes, and frontmatter in mdgarden
tags: [guide]
aliases: [syntax, wikilinks]
---

# Markdown Syntax

mdgarden renders standard GitHub-flavored Markdown plus the Obsidian
extensions most note-taking vaults already use.

## Wikilinks

```text
[[Page Name]]
[[Folder/Page Name]]
[[Page Name|custom display text]]
[[Page Name#Some Heading]]
```

Try one for real — this links to the [[Showcase/Math|Math]] page using
custom display text, and this one links by [[Guide/CLI Reference#Commands|heading anchor]].

Links to pages that don't exist yet still render (styled as "unresolved")
instead of crashing the build, which makes it safe to write forward
references while you draft.

## Embeds

```text
![[Page Name]]            embeds another note inline
![[image.png]]            embeds an image
![[clip.mp4]]             embeds a <video> with controls
![[clip.mp3]]             embeds an <audio> player with controls
```

Plain Markdown media works the same way and gets the same treatment —
`![alt](image.png)`, `![alt](clip.mp4)`, `![alt](clip.mp3)` are all
detected by file extension and rendered with the right tag, lazy-loaded,
and (for images) sized from their real pixel dimensions to avoid layout
shift.

## Callouts

```text
> [!note] Optional title
> Body text.

> [!tip]
> Tips, warnings, and other admonitions.
```

Rendered:

> [!note] Note
> This is a standard callout block — same syntax as Obsidian.

> [!warning] Heads up
> Unknown callout types still render with a generic style, so custom types
> from your existing vault won't break.

## Footnotes

Footnotes use the standard syntax: here's a claim that needs a citation[^1].

[^1]: And here's the footnote text, rendered at the bottom of the page.

## Frontmatter

```yaml
---
title: Page Title
description: Shown in search results and social cards
tags: [one, two]
date: 2026-01-15
draft: false
aliases: [old-url-slug]
lang: en
---
```

- **`aliases`** — extra slugs that should also resolve to this page;
  mdgarden emits redirect pages for each one.
- **`draft: true`** — excludes the page from the build (handy for
  work-in-progress notes you don't want published yet).
- **`lang`** — overrides the page's `<html lang>` attribute for
  mixed-language vaults.

## Tags

Add `tags: [...]` to a page's frontmatter to feed the tag index — each tag
gets its own listing page, and tags show up in the graph view.
