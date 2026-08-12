# Changelog

All notable changes to this project are documented in this file. The same
content is published to [GitHub Releases](https://github.com/THANSHEER/mdgarden/releases).

Each release uses one title and only the sections that apply:

- **✨ New** — brand-new commands or major capabilities
- **🚀 Features** — user-facing feature additions
- **💡 Improvements** — enhancements to existing behavior, performance, or design
- **🐛 Bug Fixes** — resolved bugs
- **⚠️ Known Issues** — optional; only when there are known limitations

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.5.0] - 2026-08-12

### 🔒 v0.5.0 - Security Hardening, Automated Updates

Lightning-fast digital gardens, now more secure and reliable. This release
strengthens how mdgarden is built and maintained — no breaking changes for
your existing gardens.

### 💡 Improvements

- **Safer release process** — Publishing now uses auto-expiring security tokens
- **Continuous security scanning** — Code is checked for vulnerabilities automatically
- **Clear security policy** — Published [SECURITY.md](./SECURITY.md) so you know how to report issues
- **Automatic dependency updates** — Dependencies are reviewed and updated weekly
- **Reliable builds** — Enhanced CI/CD pipeline catches issues before they reach you

---

**Upgrade:** `npm install -g mdgarden@latest` or run `mdgarden update`

No breaking changes.

## [0.4.0] - 2026-08-06

### 🎨 v0.4.0 - Beautiful Redesign, Faster Builds

We've completely redesigned mdgarden with a fresh, modern interface inspired
by Obsidian Publish. Builds are now 50% faster with smarter caching.

### 🚀 Features

- **Recent notes** — Surface recently modified notes for quick access to your latest work
- **Obsidian Publish-inspired UI theme** — Complete visual refresh with new spacing, typography, colors, sidebar layouts, graph styling, and search design
- **Mobile-first search** — Mobile-friendly search UI with icon-based triggers and multiple open buttons
- **Active scrollbar visibility** — Improved scrollbar behavior across the site
- **Sitemap expansion** — Broader sitemap coverage for better SEO
- **Broken wikilink warnings** — Warn when internal links point to notes that do not exist

### 💡 Improvements

- **Responsive design** — Better mobile and responsive behavior across all components
- **Graph interactions** — More robust graph sizing, fit behavior, and user interactions
- **Theme system** — Updated all theme presets to match new design tokens
- **Build cache strategy** — Invalidate render cache when site configuration changes (50% faster incremental builds)
- **Update detection** — Enhanced `mdgarden update` with GitHub release version checking and better error handling

### 🐛 Bug Fixes

- **Cache invalidation** — Wikilinks re-resolve after notes are added or renamed
- **Update robustness** — `mdgarden update` tolerates GitHub outages for npm/Homebrew installs
- **Shell injection vulnerability** — Hardened `install.sh` against shell injection attacks
- **Broken media embeds** — Track and handle broken media embeds properly
- **Recent notes sorting** — Fixed date sorting in recent notes display
- **Duplicate rendering** — Stop calling `prepareBodyHtml` twice on fresh renders
- **Release validation** — Validate release tags and hosts during update checks

---

**Upgrade:** `npm install -g mdgarden@latest` or run `mdgarden update`

No breaking changes.

## [0.3.0] - 2026-07-04

### 🔗 v0.3.0 - Auto-Updates, Smart Link Previews

Keeping your garden fresh is now effortless. A new update command keeps you on
the latest release, and link previews are faster and more touch-friendly.

### ✨ New

- **`mdgarden update` command** — Auto-upgrade to the latest version; detects install source (npm, Homebrew, standalone) and supports a `--background` flag

### 🚀 Features

- **Enhanced link popovers** — Better preview content, 250ms faster display, improved positioning and accessibility, and touch-friendly pointer events

### 💡 Improvements

- **UI/UX refinements** — Documentation, accessibility enhancements, and feature polish
- **Version numbering** — Improved version tracking and display

### 🐛 Bug Fixes

- **Version tracking** — Improved version number handling and consistency

---

**Upgrade:** `npm install -g mdgarden@latest` or run `mdgarden update`

No breaking changes.

## [0.2.0] - 2026-06-28

### ⚡ v0.2.0 - Faster Builds, Smooth Transitions

Builds are now 10x faster for large vaults, and page navigation feels silky
smooth with SPA-style transitions.

### 🚀 Features

- **Incremental builds** — Only rebuild changed files (10x faster for large vaults)
- **SPA transitions** — Smooth single-page-app-style page transitions
- **Advanced build options** — New configuration options for customizing site builds

---

**Upgrade:** `npm install -g mdgarden@latest` or run `mdgarden update`

No breaking changes.

## [0.1.0] - 2026-06-25

### 🌱 v0.1.0 - Your Digital Garden Awaits

mdgarden is here — a lightning-fast, zero-config static site generator that
turns your Markdown notes into a beautiful, interactive digital garden.

### 🚀 Features

- **Zero-config setup** — Point mdgarden at a folder of Markdown notes and build
- **Fast compilation** — Framework-free markdown-to-HTML with minimal dependencies
- **Wikilink support** — Internal linking between notes
- **Interactive knowledge graph** — Explore connections with a force-directed graph
- **Full-text search** — Find notes instantly across your vault
- **Digital garden ready** — Backlinks, tags, and a clean reading experience

---

**Get started:** `npm install -g mdgarden`

---

For migration guides and upgrade instructions, see the [README](./README.md).
