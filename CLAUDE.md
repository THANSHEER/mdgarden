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

When generating release notes and titles for public announcements:

### Release Title Format
- **Pattern**: `[emoji] vX.Y.Z - [Value Proposition], [Key Benefit]`
- **Example**: `🔒 v0.5.0 - Security Hardening, Automated Updates`
- Keep to ~10-12 words maximum
- Lead with user benefits, not technical details
- Use 1-2 relevant emojis that reflect the release theme

### Public Release Notes Format
Structure release notes for **general users, not developers**:

1. **Headline** - What's the big win for users? (1-2 sentences)
2. **Key Benefits** - 3-5 user-facing improvements with emojis
   - Focus on outcomes: faster, safer, easier—not implementation details
   - Avoid technical jargon (no "OIDC," "CodeQL," "GitHub Actions")
   - Explain *why* users care
3. **Get Started** - Simple installation/upgrade command
4. **Links** - Docs, issues, security contact

### DO ✅
- Use conversational language ("now automatic" vs "automated via Dependabot")
- Highlight reliability, speed, and ease-of-use
- Explain benefits in plain English
- Lead with "what's new for you"
- Use simple emoji to break up text
- Keep each point to 1 sentence

### DON'T ❌
- Use technical acronyms (OIDC, CodeQL, YAML, CI/CD) in public notes
- Explain implementation details
- List every file changed
- Use developer jargon
- Make it longer than 1 page
- Focus on internal process improvements

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
