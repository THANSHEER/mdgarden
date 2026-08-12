# Cursor IDE Guide for mdgarden

This guide helps Cursor IDE users (and other AI assistants) understand the mdgarden project structure and development workflow.

## Quick Start

```bash
# Install and build
npm install

# Run tests
npm test

# Start dev server for test vault
npm run vault:dev
# Open http://localhost:3000
```

## Project at a Glance

**mdgarden** is a lightning-fast, zero-config static site generator for Markdown notes. It transforms a folder of Markdown files into a fully-featured digital garden with:
- 🔍 Full-text search
- 📊 Interactive network graphs (backlinks visualization)
- 🎨 Beautiful, minimal design
- ⚡ Sub-second builds
- 📱 Mobile-responsive

**Built with**: TypeScript, Node.js (backend), Vanilla JS (frontend)  
**Philosophy**: Minimal dependencies, no frameworks, maximum performance

## Directory Structure

```
mdgarden/
├── src/
│   ├── cli/              # Command-line interface & dev server
│   ├── core/             # Build orchestrator, config, emit
│   ├── parser/           # Markdown → HTML conversion
│   ├── features/         # Search index, graph, explorer generators
│   └── client/           # Browser runtime (search, graph UI)
├── test/                 # Vitest test suites
├── test_vault/           # Sample vault for manual testing
├── themes/               # CSS templates
├── .github/workflows/    # CI/CD pipelines
├── CLAUDE.md             # AI assistant guidelines ⭐
├── Agents.md             # Agent/AI development guide ⭐
└── SECURITY.md           # Security policy & reporting
```

**⭐ Key**: Always read CLAUDE.md and Agents.md before suggesting changes.

## Development Workflow

### Building the Project

```bash
npm run build          # Full build (typecheck + bundle + emit)
npm run dev            # Watch mode for development
npm run typecheck      # TypeScript strict check only
```

### Testing

```bash
npm test               # Run all tests once
npm run test:watch     # Watch mode (rerun on changes)
npm run test:coverage  # Coverage report
```

### Manual Testing

```bash
# Build and serve the test vault
npm run vault:dev

# Build the test vault (one-shot)
npm run vault:build

# Test CLI against fixtures
node dist/cli.js build test/fixtures -o /tmp/out
```

## Code Structure Highlights

### src/client/ - Browser Code
- **Framework-free** - Pure JavaScript, minimal bundle
- **No Node APIs** - Cannot import `fs`, `path`, etc.
- **Assets via resolver** - Use `src/parser/assets.ts` for bundled resources
- **Includes**: search modal, force-directed graph, popovers

### src/parser/ - Markdown Processing
- **markdown-it plugins** - Syntax highlighting, math, footnotes
- **Asset resolution** - Handles KaTeX fonts and embedded scripts
- **SEA-compatible** - Works in both npm and binary distributions

### src/features/ - Data Generators
Runs at build-time to generate JSON files:
- `graph.ts` - Network graph data for backlinks visualization
- `search.ts` - Full-text search index
- `explorer.ts` - Folder tree structure
- `feed.ts` - RSS feed generation

### src/core/ - Build Orchestration
- `build.ts` - Main build orchestrator
- `config.ts` - Configuration parsing & defaults
- `emit.ts` - File writing to output directory
- Plugin architecture for extensibility

## Important Rules

### ❌ DON'T

1. **Mix browser and Node.js code**
   - `src/client/` cannot import from `src/core/`, `src/features/`, or `src/parser/`
   - Cannot use `fs`, `path`, `crypto` in browser code

2. **Add large frontend frameworks**
   - No React, Vue, Svelte, TailwindCSS
   - Keep JavaScript bundle small (~40KB)

3. **Break SEA (Single Executable App) compatibility**
   - Don't use `fs.readFile()` for bundled assets
   - Use asset resolver from `src/parser/assets.ts`

4. **Hardcode version numbers**
   - Version lives in `package.json` only
   - It's injected at build time via `MDGARDEN_VERSION`

5. **Perform git/release actions**
   - Never commit, push, tag, publish, or create PRs
   - Suggest commands for the repository owner to run

### ✅ DO

1. **Use strict TypeScript**
   - Maintain type safety
   - Run `npm run typecheck` before suggesting changes

2. **Write tests for new features**
   - Place in `test/<feature>.test.ts`
   - Use fixtures from `test/fixtures/` for Markdown test cases
   - Test edge cases

3. **Verify UI changes manually**
   - Run `npm run vault:dev`
   - Test desktop and mobile widths
   - Check light and dark themes
   - Verify keyboard navigation and focus states

4. **Follow code style**
   - 2-space indentation
   - Single quotes
   - Semicolons
   - camelCase functions, PascalCase types

5. **Keep commits focused**
   - Use short, imperative subject lines
   - Prefix with `feat:`, `fix:`, `docs:`, etc.
   - One logical change per commit

## Common Tasks

### Adding a new CLI command
1. Create handler in `src/cli/commands/`
2. Wire up in `src/cli/index.ts`
3. Add tests in `test/cli.test.ts`
4. Test with `npm run vault:dev`

### Adding a parser feature
1. Create plugin in `src/parser/plugins/`
2. Register in `src/parser/index.ts`
3. Add tests for parsing and edge cases
4. Verify rendering in test vault

### Adding a data generator (feature)
1. Create in `src/features/<name>.ts`
2. Export function that processes file tree
3. Call from build orchestrator
4. Emit JSON files via emit system
5. Add tests for edge cases

### Modifying the graph visualization
1. Edit `src/client/graph/` components
2. Test with `npm run vault:dev` (live reload)
3. Check desktop + mobile at various widths
4. Verify keyboard shortcuts still work
5. Test in light/dark themes

## Release Notes

`CHANGELOG.md` is the single source of truth. GitHub Releases use the same
content via `scripts/extract-release-notes.mjs`.

When writing a release entry:

1. Add a `## [X.Y.Z] - YYYY-MM-DD` section at the top (below `[Unreleased]`)
2. Title: `### [emoji] vX.Y.Z - Value Prop, Key Benefit`
3. Write a 1-2 sentence summary
4. Include only the sections that apply: **✨ New**, **🚀 Features**, **💡 Improvements**, **🐛 Bug Fixes**, **⚠️ Known Issues**
5. End with the upgrade footer

See [CLAUDE.md Release Notes Guidelines](./CLAUDE.md#-release-notes-guidelines) for examples.

## Debugging Tips

### Build Issues
```bash
# Check TypeScript errors
npm run typecheck

# Rebuild from scratch
npm run clean && npm run build

# Check bundle sizes
node esbuild.config.mjs
```

### Test Failures
```bash
# Run specific test file
npm test -- test/parser.test.ts

# Watch mode for debugging
npm run test:watch

# Show coverage
npm run test:coverage
```

### Runtime Issues
```bash
# Use vault dev server with live reload
npm run vault:dev

# Open browser dev tools (F12)
# Check console for errors and logs

# Inspect generated HTML in .vault-site/
```

## Useful npm Scripts

| Command | Purpose |
|---------|---------|
| `npm run build` | Full build with typecheck |
| `npm run dev` | Watch mode for active development |
| `npm test` | Run all tests once |
| `npm run test:watch` | Rerun tests on file changes |
| `npm run typecheck` | TypeScript validation only |
| `npm run vault:build` | Build test vault one-shot |
| `npm run vault:dev` | Serve test vault with live reload |
| `npm run pack:check` | Verify npm package contents |

## Security & Best Practices

- **No secrets in code** - Use environment variables
- **Validate at boundaries** - Trust internal code, validate external input
- **Prefer types over comments** - TypeScript types document behavior
- **Minimal dependencies** - Keep the bundle lean
- **No hardcoded paths** - Use configuration resolution

For security issues, see [SECURITY.md](./SECURITY.md).

## Resources

- **Main docs**: See [README.md](./README.md)
- **Contributing**: See [CONTRIBUTING.md](./CONTRIBUTING.md)
- **AI guidelines**: See [CLAUDE.md](./CLAUDE.md) and [Agents.md](./Agents.md)
- **Security policy**: See [SECURITY.md](./SECURITY.md)
- **Issue tracker**: [GitHub Issues](https://github.com/THANSHEER/mdgarden/issues)

---

**Happy building! 🚀**
