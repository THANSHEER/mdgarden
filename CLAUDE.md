# Claude / AI Assistant Guidelines

This file provides crucial context for any AI assistant (like Claude, GitHub Copilot, Gemini, etc.) working on the `mdgarden` repository. Please read this before proposing architectural changes or adding new features.

## Project Goal
`mdgarden` is a lightning-fast, zero-config static site generator that turns a folder of Markdown notes into a fully-featured digital garden (with backlinks, local/global interactive graphs, and search). 

It is designed to be **lightweight and framework-free**. It compiles rapidly and relies on minimal dependencies.

## Architecture

The source code (`src/`) is strictly modularized by domain:
- **`src/cli/`**: Command-line interfaces, the interactive setup wizard, and the live-reloading dev server.
- **`src/core/`**: The core build orchestrator (`build.ts`), configuration resolution (`config.ts`), file emission (`emit.ts`), and the plugin architecture.
- **`src/parser/`**: Everything related to transforming Markdown into HTML (markdown-it plugins, syntax highlighting, asset path resolution).
- **`src/features/`**: Static data generators that run at build-time to emit JSON (e.g., `graph.ts` for the network graph, `search.ts` for the search index, `explorer.ts` for the folder tree).
- **`src/client/`**: **BROWSER RUNTIME CODE.** This code runs on the client-side. It manages the interactive search modal, force-directed graph UI, and popovers.

## 🛑 What NOT To Do

1. **Do not mix Browser and Node.js environments.** 
   Files in `src/client/` are shipped directly to the browser. They **must not** import `fs`, `path`, or code from `src/core/`, `src/features/`, or `src/parser/`. 
2. **Do not introduce large frontend frameworks.**
   `mdgarden` prides itself on shipping minimal JavaScript. Do not propose adding React, Vue, Svelte, or TailwindCSS. Use Vanilla JS and standard CSS.
3. **Do not break the Single Executable App (SEA) compatibility.**
   `mdgarden` can be compiled into a standalone binary. Asset loading (like `mdgarden.client.js` or KaTeX fonts) is handled via `src/parser/assets.ts` which uses `node:sea` to read assets when bundled. Do not use standard `fs.readFile` for core assets without utilizing the asset resolver.
4. **Do not hardcode versions.**
   The version number is defined exclusively in `package.json`. It is injected globally into the runtime as `MDGARDEN_VERSION` via `esbuild.config.mjs` using `define`. Use `export const VERSION = typeof MDGARDEN_VERSION !== 'undefined' ? MDGARDEN_VERSION : 'unknown';` as seen in `src/index.ts`.
5. **Do not perform version-control or release actions.**
   Only the repository owner performs these actions. Never stage, commit, tag, push, publish, or create pull requests. You may inspect Git state, edit files, run tests, and suggest commands for the owner.

## ✅ What You SHOULD Do

1. **Follow the established style.**
   Use standard TypeScript, ESModules (`type: module`), and maintain strict typing.
2. **Write tests for new features.**
   Place tests in the `test/` directory using `vitest`. Ensure you test edge cases using the dummy markdown files in `test/fixtures/`.
3. **Sanity-check UI/layout changes against the test vault.**
   `test_vault/` is a small sample vault checked into the repo for manual verification (wikilinks, callouts, math, code, media). Run `npm run vault:build` (one-shot) or `npm run vault:dev` (live reload at `http://localhost:3000`) to see real rendered output before calling a visual change done.

## 📢 Release Notes Guidelines

`CHANGELOG.md` is the single source of truth. The same content is published to
GitHub Releases via `scripts/extract-release-notes.mjs` during the release
workflow — GitHub's auto-generated release notes are never used; the title and
body always come from `CHANGELOG.md`.

### Release Title Format
- **Pattern**: `## [X.Y.Z] - YYYY-MM-DD - [Value Proposition], [Key Benefit]`
- **Example**: `## [0.5.0] - 2026-08-12 - Security Hardening, Automated Updates`
- The trailing ` - Title` segment on the version header is optional but expected for
  tagged releases; `scripts/extract-release-notes.mjs` turns it into the GitHub
  release title (`vX.Y.Z - Value Proposition, Key Benefit`)
- Keep the title to ~10-12 words maximum
- Lead with user benefits, not technical details

### Section Format (include only what applies)
After the header, add a 1-2 sentence summary paragraph, then only the sections
that have content for that release:

| Section | When to include |
|---------|-----------------|
| **Features** | User-facing feature additions |
| **Improvements** | Enhancements to existing behavior, performance, or design |
| **Security** | Security vulnerabilities fixed or hardening added |
| **Fixes** | Resolved bugs |
| **Known Issues** | Known limitations (optional) |

Omit empty sections entirely. End each release with an upgrade footer:

```markdown
---

**Upgrade:** `npm install -g mdgarden@latest` or run `mdgarden update`

No breaking changes.
```

### Release Commands

Update `CHANGELOG.md` for every release using this template:

```markdown
## [X.Y.Z] - YYYY-MM-DD - Value Proposition, Key Benefit

Summary sentence.

### Features
- New feature description

### Improvements
- Improvement description

### Security
- Security vulnerability fixed (CVE-XXXX if applicable)

### Fixes
- Bug fix (#issue-number if applicable)
```

Only include a `CVE-XXXX` or `#issue-number` reference when one genuinely
exists — never invent one to fit the template.

### Version Numbers

| Change type | Bump | Example |
|---|---|---|
| Features | MINOR | `1.0.0` → `1.1.0` |
| Security / Fixes | PATCH | `1.0.0` → `1.0.1` |
| Breaking changes | MAJOR | `1.0.0` → `2.0.0` |

### Writing Style
- Use conversational language ("now automatic" vs "automated via Dependabot")
- Focus on outcomes: faster, safer, easier — not implementation details
- Avoid technical jargon (no "OIDC," "CodeQL," "GitHub Actions") in release text
- Keep each bullet to 1 sentence
- Keep the full release to ~1 page

### Content Translation Guide
| Technical | Public-Friendly |
|-----------|-----------------|
| OIDC Trusted Publishing | Safer release process with auto-expiring tokens |
| CodeQL + npm audit scanning | Continuous security checking |
| Dependabot PRs | Automatic dependency updates |
| Explicit job permissions | Tighter security controls |
| git credential handling | Improved credential safety |

### Tone
- **Professional but warm** - You're talking to people who want reliable software
- **Confident** - Celebrate improvements without apology
- **User-centric** - Focus on what they get, not what we built
- **Honest** - No breaking changes? Say so. No migration needed? Say so.
