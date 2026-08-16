// Extract public release notes for a version from CHANGELOG.md.
//
//   node scripts/extract-release-notes.mjs <version>           # body (for gh --notes-file)
//   node scripts/extract-release-notes.mjs <version> --title   # release title
//
// Version accepts "0.5.0" or "v0.5.0". Exits 1 if the section is missing.
//
// Expects a CHANGELOG.md header of the form:
//   ## [X.Y.Z] - YYYY-MM-DD - Value Proposition, Key Benefit
// The trailing " - Title" segment is optional; when present it becomes the
// GitHub release title alongside the version (e.g. "v0.5.0 - Value Proposition").

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const changelogPath = path.join(root, 'CHANGELOG.md');

const rawVersion = process.argv[2];
const wantTitle = process.argv.includes('--title');

if (!rawVersion) {
  console.error('Usage: node scripts/extract-release-notes.mjs <version> [--title]');
  process.exit(1);
}

const version = rawVersion.replace(/^v/, '');
const changelog = readFileSync(changelogPath, 'utf8');
const section = extractSection(changelog, version);

if (!section) {
  console.error(`No changelog section found for version ${version}`);
  process.exit(1);
}

if (wantTitle) {
  process.stdout.write(section.title);
} else {
  process.stdout.write(section.body);
}

function extractSection(text, releaseVersion) {
  const headerPattern = new RegExp(
    `^## \\[${escapeRegExp(releaseVersion)}\\] - \\d{4}-\\d{2}-\\d{2}(?: - (.+))?$`,
    'm'
  );
  const match = headerPattern.exec(text);
  if (!match) return null;

  const title = match[1] ? `v${releaseVersion} - ${match[1].trim()}` : `v${releaseVersion}`;

  const bodyStart = text.indexOf('\n', match.index);
  const rest = text.slice(bodyStart + 1);
  const nextRelease = rest.search(/\n## \[/);
  const globalFooter = rest.indexOf('\n---\n\nFor migration');

  let end = rest.length;
  if (nextRelease !== -1) end = Math.min(end, nextRelease);
  if (globalFooter !== -1) end = Math.min(end, globalFooter);

  return { title, body: rest.slice(0, end).trim() };
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
