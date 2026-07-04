import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { collectContent, loadIgnorePatterns } from '../src/parser/content.js';
import { resolveConfig } from '../src/core/config.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mdgarden-ignore-'));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('loadIgnorePatterns', () => {
  it('returns empty array when neither file exists', async () => {
    const patterns = await loadIgnorePatterns(tmpDir);
    expect(patterns).toEqual([]);
  });

  it('reads patterns from .mdgardenignore (strips comments and blanks)', async () => {
    await fs.writeFile(
      path.join(tmpDir, '.mdgardenignore'),
      '# OS files\n.DS_Store\n\nnode_modules/\n',
    );
    const patterns = await loadIgnorePatterns(tmpDir);
    expect(patterns).toEqual(['.DS_Store', 'node_modules/']);
  });

  it('reads patterns from .gitignore when present', async () => {
    await fs.writeFile(
      path.join(tmpDir, '.gitignore'),
      '# git\ndist/\n.env\n',
    );
    const patterns = await loadIgnorePatterns(tmpDir);
    expect(patterns).toEqual(['dist/', '.env']);
  });

  it('merges .mdgardenignore + .gitignore in that order', async () => {
    await fs.writeFile(path.join(tmpDir, '.mdgardenignore'), 'node_modules/\n');
    await fs.writeFile(path.join(tmpDir, '.gitignore'), 'dist/\n');
    const patterns = await loadIgnorePatterns(tmpDir);
    expect(patterns).toEqual(['node_modules/', 'dist/']);
  });

  it('silently skips files that are not readable', async () => {
    // No files written — should not throw.
    await expect(loadIgnorePatterns(tmpDir)).resolves.toEqual([]);
  });

  it('ignores inline comments and trailing whitespace', async () => {
    await fs.writeFile(
      path.join(tmpDir, '.mdgardenignore'),
      '  .DS_Store  \n  # comment \n  \n*.log\n',
    );
    const patterns = await loadIgnorePatterns(tmpDir);
    expect(patterns).toEqual(['.DS_Store', '*.log']);
  });
});

describe('collectContent (git-date lookup is shell-injection safe)', () => {
  it('treats a shell-metacharacter filename as a literal path, never as shell syntax', async () => {
    // A filename like this would execute `touch pwned` if the git-date lookup
    // ever shelled out via string interpolation instead of execFile's argv array.
    const evilName = '$(touch pwned).md';
    await fs.writeFile(path.join(tmpDir, evilName), '# Title\n\nBody text.\n');

    const { pages } = await collectContent(tmpDir, resolveConfig({}), []);

    expect(pages).toHaveLength(1);
    expect(pages[0].title).toBe('Title');
    await expect(fs.access(path.join(tmpDir, 'pwned'))).rejects.toThrow();
  });
});
