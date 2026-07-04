# Repository Guidelines

## Project Structure & Module Organization

`src/` is organized by runtime and domain:

- `src/cli/` contains commands, setup flows, and the development server.
- `src/core/` handles configuration, builds, output, and plugins.
- `src/parser/` converts Markdown and resolves bundled assets.
- `src/features/` generates search, graph, feed, and explorer data.
- `src/client/` is framework-free browser code. Never import Node APIs or server modules here.
- `themes/` contains site CSS; `test/` contains Vitest suites and fixtures.
- `test_vault/` is the manual integration and visual-regression sample.

Keep the browser bundle small. Do not add frontend frameworks. Core assets must use the resolver in `src/parser/assets.ts` so standalone-binary builds continue to work. Define the release version only in `package.json`; runtime code reads the injected `MDGARDEN_VERSION`.

## Build, Test, and Development Commands

- `npm install`: install dependencies and run the package build.
- `npm run build`: type-check, bundle browser/CLI assets, and emit declarations.
- `npm test`: run all Vitest suites once.
- `npm run test:watch`: rerun affected tests while editing.
- `npm run test:coverage`: generate the coverage report.
- `npm run vault:build`: build `test_vault/` into `.vault-site/`.
- `npm run vault:dev`: serve the test vault at `http://localhost:3000`.
- `npm run site:dev -- /absolute/notes/path -o /tmp/mdgarden-site`: preview an external vault. Keep output outside the notes directory.

## Coding Style & Naming Conventions

Use strict TypeScript, ES modules, two-space indentation, semicolons, and single quotes. Follow existing names: `camelCase` for functions and variables, `PascalCase` for types, and descriptive lowercase filenames. No formatter or linter is enforced, so match adjacent code and run `npm run typecheck`.

## Testing and UI Changes

Name suites `test/<feature>.test.ts`; put reusable Markdown cases in `test/fixtures/`. Add regression tests for parsing, paths, configuration, and emitted output. For UI changes, use `test_vault/` and verify desktop and mobile widths, light/dark themes, keyboard focus, overflow, reduced motion, and search/graph/explorer interactions.

## Repository Actions

Only the repository owner performs version-control and release actions. Never stage, commit, tag, push, publish, or create pull requests. Agents may inspect Git state, edit files, run tests, and suggest commands for the owner.

## Commits & Pull Requests

History uses short, imperative subjects; optional Conventional Commit prefixes such as `feat:` or `fix:` are encouraged. Keep commits focused. Pull requests should explain behavior and motivation, link issues, list commands run, and include before/after screenshots for visual changes. Do not commit generated `dist/`, `.vault-site/`, coverage, or local configuration.
