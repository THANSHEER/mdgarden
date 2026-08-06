---
title: Code Highlighting
description: Shiki-powered syntax highlighting across languages
tags: [showcase, code]
---

# Code Highlighting

Syntax highlighting is powered by [Shiki](https://shiki.style/), which
loads grammars dynamically — only the languages actually used in your
content are bundled, but the full ~300-grammar catalog is available, not a
hardcoded subset.

## TypeScript

```typescript
export function buildSlug(path: string): string {
  return path
    .toLowerCase()
    .replace(/\.md$/, '')
    .replace(/\s+/g, '-');
}
```

## Python

```python
def reading_time(words: int, wpm: int = 200) -> int:
    return max(1, round(words / wpm))
```

## Bash

```bash
mdgarden build ./notes -o ./dist
mdgarden serve ./notes --port 4000
```

## JSON

```json
{
  "site": { "title": "My Notes" },
  "theme": { "name": "forest" }
}
```

## Rust

```rust
fn slugify(input: &str) -> String {
    input.to_lowercase().replace(' ', "-")
}
```

> [!tip] Disabling highlighting
> `mdgarden config set features.syntaxHighlight false` renders plain code
> blocks with no highlighting and no Shiki bundle at all.
