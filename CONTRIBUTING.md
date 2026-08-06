# Contributing to mdgarden

Thanks for helping improve `mdgarden`. Keep changes focused, preserve its
framework-free browser runtime, and include tests for observable behavior.

## Local Development

### Install dependencies

Use Node.js 20.12 or newer:

```bash
npm install
```

The `prepare` lifecycle builds the package after installation.

### Development commands

```bash
npm run dev          # rebuild bundles when source files change
npm run typecheck    # run TypeScript checks only
npm run build        # clean, type-check, bundle, and emit declarations
npm run pack:check   # inspect the files that would be published to npm
```

## Automated Testing

`mdgarden` uses [Vitest](https://vitest.dev/) for unit and integration testing.

```bash
npm test                 # run the complete suite once
npm run test:watch       # rerun affected tests during development
npm run test:coverage    # run tests and write a coverage report
npx vitest run test/links.test.ts  # run one suite
```

Name test files `test/<feature>.test.ts`. Put shared Markdown inputs in
`test/fixtures/`, including malformed or unusual inputs when they reproduce a
bug. There is no fixed coverage threshold, but new behavior and regressions
must have focused tests.

## Verifying Behavior with the Test Vault

`test_vault/` is the repository's manual integration fixture. It covers
wikilinks, backlinks, callouts, media, Mermaid, code highlighting, and math.
Both commands rebuild the package first.

```bash
npm run vault:build  # write the static site to .vault-site/
npm run vault:dev    # serve it with live reload at http://localhost:3000
```

Keep generated output outside the content directory. Otherwise the watcher may
treat generated files as source changes.

`vault:dev` watches both the vault and the package implementation. Changes in
`test_vault/` rebuild the site directly; changes in `src/`, `themes/`, or the
build configuration rebuild `dist/` and restart the development server
automatically. Keep the command running while editing.

### Test an external notes folder

Pass arguments after `--`; absolute paths are recommended:

```bash
npm run site:build -- /absolute/path/to/notes -o /tmp/mdgarden-site -y
npm run site:dev -- /absolute/path/to/notes -o /tmp/mdgarden-site
```

> [!NOTE]
> `test/fixtures/` contains intentionally broken frontmatter and other edge
> cases. It is for automated tests; use `test_vault/` for visual checks.

## UI and Theme Changes

Browser code belongs in `src/client/`; shared styling belongs in `themes/`.
Use vanilla TypeScript and CSS, and avoid Node imports in client modules. Before
submitting a visual change, verify:

- narrow mobile and wide desktop layouts;
- light and dark modes across the built-in themes;
- visible keyboard focus and usable search, explorer, graph, and table of contents;
- long titles, code blocks, media, and reduced-motion behavior.

## Standalone Binary (Node SEA)

Build a standalone executable for the current OS and architecture with:

```bash
npm run build:binary
```

The executable is written to `build/mdgarden` (`build/mdgarden.exe` on
Windows). SEA builds require an official Node binary. If necessary, set
`MDGARDEN_SEA_NODE=/path/to/node` before running the command.

## Pull Requests

Use a short imperative commit subject; prefixes such as `feat:`, `fix:`,
`docs:`, or `test:` are encouraged. A pull request should:

- describe the problem and resulting behavior;
- link a relevant issue when one exists;
- list the verification commands you ran;
- include before/after screenshots for UI changes;
- avoid generated output (`dist/`, `.vault-site/`, and `coverage/`).

Run `npm test`, `npm run typecheck`, and the relevant vault check before
requesting review.
