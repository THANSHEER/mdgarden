import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const script = path.resolve('scripts/extract-release-notes.mjs');

function run(args: string[]) {
  return execFileSync(process.execPath, [script, ...args], { encoding: 'utf8' });
}

describe('extract-release-notes.mjs', () => {
  it('extracts the release title from CHANGELOG.md', () => {
    const title = run(['0.5.0', '--title']).trim();
    expect(title).toMatch(/^🔒 v0\.5\.0/);
  });

  it('extracts the release body without the title heading', () => {
    const body = run(['0.5.0']).trim();
    expect(body).toContain('Lightning-fast digital gardens');
    expect(body).toContain('### 💡 Improvements');
    expect(body).not.toMatch(/^### /);
  });

  it('accepts a v-prefixed version', () => {
    const title = run(['v0.1.0', '--title']).trim();
    expect(title).toMatch(/^🌱 v0\.1\.0/);
  });

  it('only includes sections that have content for that release', () => {
    const body = run(['0.5.0']).trim();
    expect(body).not.toContain('### 🚀 Features');
    expect(body).not.toContain('### 🐛 Bug Fixes');
  });

  it('includes feature and bug-fix sections when present', () => {
    const body = run(['0.4.0']).trim();
    expect(body).toContain('### 🚀 Features');
    expect(body).toContain('### 💡 Improvements');
    expect(body).toContain('### 🐛 Bug Fixes');
  });

  it('exits with an error for unknown versions', () => {
    expect(() => run(['99.99.99'])).toThrow();
  });
});
