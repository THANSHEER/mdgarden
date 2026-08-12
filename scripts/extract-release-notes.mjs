// Extract public release notes for a version from CHANGELOG.md.
//
//   node scripts/extract-release-notes.mjs <version>           # body (for gh --notes-file)
//   node scripts/extract-release-notes.mjs <version> --title   # first ### heading
//
// Version accepts "0.5.0" or "v0.5.0". Exits 1 if the section is missing.

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

const titleMatch = section.match(/^### (.+)$/m);

if (wantTitle) {
  if (!titleMatch) {
    console.error(`No ### title found in changelog section for version ${version}`);
    process.exit(1);
  }
  process.stdout.write(titleMatch[1].trim());
} else {
  const body = titleMatch
    ? section.slice(titleMatch.index + titleMatch[0].length).trimStart()
    : section;
  process.stdout.write(body);
}

function extractSection(text, releaseVersion) {
  const header = `## [${releaseVersion}]`;
  const start = text.indexOf(header);
  if (start === -1) return null;

  const bodyStart = text.indexOf('\n', start);
  if (bodyStart === -1) return null;

  const rest = text.slice(bodyStart + 1);
  const nextRelease = rest.search(/\n## \[/);
  const globalFooter = rest.indexOf('\n---\n\nFor migration');

  let end = rest.length;
  if (nextRelease !== -1) end = Math.min(end, nextRelease);
  if (globalFooter !== -1) end = Math.min(end, globalFooter);

  return rest.slice(0, end).trimEnd();
}
