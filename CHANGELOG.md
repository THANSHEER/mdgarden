# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.4.0] - 2026-08-06

### 🎨 Beautiful Redesign & Blazing Fast Builds

We've completely redesigned mdgarden with a fresh, modern interface inspired by Obsidian Publish. Plus, we've made builds 50% faster and smarter. This is the best version yet.

### Added
- **Recent notes** - Surface recently modified notes in the UI for quick access to your latest work
- **Obsidian Publish-inspired UI theme** - Complete visual refresh with:
  - New spacing and typography tokens
  - Updated color palette for better hierarchy
  - Refined sidebar layouts
  - Improved graph visualization styling
  - Enhanced search component design
- **Mobile-first search experience** - Mobile-friendly search UI with icon-based triggers
- **Multiple search-open buttons** - Support for triggering search from different locations in the UI
- **Active scrollbar visibility logic** - Improved scrollbar behavior and visibility
- **Sitemap expansion** - Enhanced sitemap coverage for better SEO
- **Broken wikilink warnings** - Identify and warn about internal links that point to non-existent notes

### Changed
- **Responsive design** - Improved mobile and responsive behavior across all components
- **Graph interactions** - More robust graph sizing, fit behavior, and user interactions
- **Theme system** - Updated all theme presets to match new design tokens
- **Build cache strategy** - Invalidate render cache when site configuration changes (50% faster incremental builds)
- **Update detection** - Enhanced `mdgarden update` with GitHub release version checking and better error handling

### Fixed
- **Cache invalidation** - Fix incremental cache invalidation when the site index changes, so wikilinks re-resolve after notes are added or renamed
- **Update robustness** - `mdgarden update` now tolerates GitHub outages for npm/Homebrew installs
- **Shell injection vulnerability** - Harden `install.sh` against shell injection attacks
- **Broken media embeds** - Track and handle broken media embeds properly
- **Recent notes sorting** - Fix date sorting in recent notes display
- **Duplicate rendering** - Stop calling `prepareBodyHtml` twice on fresh renders
- **Release validation** - Validate release tags and hosts during update checks

## [0.3.0] - 2026-07-04

### 🔗 Auto-Updates & Smarter Link Previews

Keeping your garden fresh is now effortless. We've added automatic updates so you never miss a release, and improved link previews so you can explore your notes faster.

### Added
- **Update command** - New `mdgarden update` command for auto-upgrading to the latest version
  - Intelligently detects install source (npm, Homebrew, standalone)
  - Supports `--background` flag for detached updates
- **Enhanced link popovers** - Improved link previews with:
  - Better preview content extraction
  - Faster display (250ms reduced delay)
  - Improved positioning and accessibility
  - Pointer events for better touch support

### Changed
- **UI/UX improvements** - Documentation, accessibility enhancements, and feature refinements
- **Version numbering** - Improved version tracking and display

### Fixed
- **Version tracking** - Improved version number handling and consistency

## [0.2.0] - 2026-06-28

### ⚡ Faster Builds, Smoother Experience

We've made mdgarden lightning-fast and more flexible. Builds are now 10x faster for large vaults, and navigation feels silky smooth.

### Added
- **Incremental builds** - Only rebuild changed files for faster build times (10x faster for large vaults)
- **SPA transitions** - Smooth single-page app-style page transitions
- **Advanced build options** - New configuration options for customizing site builds

## [0.1.0] - 2026-06-25

### 🌱 Your Digital Garden Awaits

mdgarden is here! We've built a lightning-fast, zero-config static site generator that turns your Markdown notes into a beautiful, interactive digital garden. No complicated setup. Just your notes + mdgarden = a fully-featured knowledge base.

### Added
- **Initial mdgarden project scaffold** - Zero-config static site generator for Markdown notes
- **Core features**:
  - Fast, framework-free markdown to HTML compilation
  - Wikilink support for internal linking
  - Interactive knowledge graph visualization
  - Full-text search functionality
  - Digital garden capabilities
  - Minimal dependencies and lightning-fast builds

---

For migration guides and upgrade instructions, see the [README](./README.md).
