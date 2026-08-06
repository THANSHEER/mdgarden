---
title: Diagrams
description: Mermaid diagrams and static SVGs, side by side
tags: [showcase]
---

# Diagrams

mdgarden renders fenced ` ```mermaid ` blocks as interactive diagrams via a
lazy-loaded client chunk (only fetched on pages that actually use one), and
plain SVG/PNG images load like any other embed.

## Flowchart

```mermaid
flowchart LR
  A[Markdown notes] --> B(mdgarden build)
  B --> C{Has frontmatter?}
  C -->|yes| D[Parse + apply]
  C -->|no| E[Use defaults]
  D --> F[Render HTML]
  E --> F
  F --> G[Static site]
```

## Sequence diagram

```mermaid
sequenceDiagram
  participant You
  participant CLI as mdgarden serve
  participant Browser

  You->>CLI: save a .md file
  CLI->>CLI: rebuild changed pages
  CLI->>Browser: push reload event
  Browser->>Browser: refresh tab
```

## A hand-drawn SVG

Not every diagram needs Mermaid — a plain SVG embeds the same way:

![[diagram.svg]]

> [!note] Toggle `features.mermaid`
> Don't need diagrams? `mdgarden config set features.mermaid false` skips
> shipping the Mermaid chunk entirely.
