// Black-box CLI tests: spawn the built `dist/cli.js` like a real user would.
// cli.ts calls cli.parse() at import time, so it can't be unit-imported —
// these exercise it the same way the CI smoke test and real users do.

import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);
const cliPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'cli.js');

async function runCli(args: string[], cwd: string): Promise<{ stdout: string; stderr: string; code: number }> {
  try {
    const { stdout, stderr } = await execFileAsync('node', [cliPath, ...args], { cwd });
    return { stdout, stderr, code: 0 };
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; code?: number };
    return { stdout: e.stdout ?? '', stderr: e.stderr ?? '', code: e.code ?? 1 };
  }
}

beforeAll(async () => {
  await expect(fs.access(cliPath)).resolves.toBeUndefined();
});

describe('mdgarden --help / --version', () => {
  it('lists all commands', async () => {
    const { stdout, code } = await runCli(['--help'], process.cwd());
    expect(code).toBe(0);
    for (const cmd of ['build', 'rebuild', 'serve', 'init', 'redesign', 'config', 'publish']) {
      expect(stdout).toContain(cmd);
    }
  });

  it('prints a version string', async () => {
    const { stdout, code } = await runCli(['--version'], process.cwd());
    expect(code).toBe(0);
    expect(stdout).toContain('mdgarden/');
  });
});

describe('mdgarden build / rebuild (non-interactive)', () => {
  let dir: string;
  afterEach(async () => {
    if (dir) await fs.rm(dir, { recursive: true, force: true });
  });

  it('build -y builds without prompting, even with no config on disk', async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'mdgarden-cli-build-'));
    const { stdout, code } = await runCli(['build', '.', '-y'], dir);
    expect(code).toBe(0);
    expect(stdout).toContain('✓ Built');
  });

  it('rebuild fails clearly when no config exists yet', async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'mdgarden-cli-rebuild-'));
    const { stderr, code } = await runCli(['rebuild', '.'], dir);
    expect(code).toBe(1);
    expect(stderr).toContain('mdgarden init');
  });

  it('rebuild succeeds against a site set up with init', async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'mdgarden-cli-rebuild-ok-'));
    const init = await runCli(['init', '.', '-y'], dir);
    expect(init.code).toBe(0);
    await expect(fs.access(path.join(dir, 'mdgarden.config.json'))).resolves.toBeUndefined();

    const { stdout, code } = await runCli(['rebuild', '.'], dir);
    expect(code).toBe(0);
    expect(stdout).toContain('✓ Rebuilt');
  });
});

describe('mdgarden redesign', () => {
  let dir: string;
  afterEach(async () => {
    if (dir) await fs.rm(dir, { recursive: true, force: true });
  });

  it('applies a theme preset and rebuilds', async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'mdgarden-cli-redesign-'));
    await runCli(['init', '.', '-y'], dir);
    const { stdout, code } = await runCli(['redesign', '.', '--theme', 'forest', '-y'], dir);
    expect(code).toBe(0);
    expect(stdout).toContain('✓ Redesigned and rebuilt');

    const config = JSON.parse(await fs.readFile(path.join(dir, 'mdgarden.config.json'), 'utf8'));
    expect(config.theme.name).toBe('forest');
  });

  it('rejects an unknown theme id', async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'mdgarden-cli-redesign-bad-'));
    await runCli(['init', '.', '-y'], dir);
    const { stderr, code } = await runCli(['redesign', '.', '--theme', 'no-such-theme', '-y'], dir);
    expect(code).toBe(1);
    expect(stderr).toContain('Unknown theme');
  });
});

describe('mdgarden config get/set/unset', () => {
  let dir: string;
  afterEach(async () => {
    if (dir) await fs.rm(dir, { recursive: true, force: true });
  });

  it('set writes a nested key, get reads it back', async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'mdgarden-cli-config-'));
    await runCli(['init', '.', '-y'], dir);

    const set = await runCli(['config', 'set', 'site.author', 'Jane Doe'], dir);
    expect(set.code).toBe(0);
    expect(set.stdout).toContain('✓ Set site.author = Jane Doe');

    const get = await runCli(['config', 'get', 'site.author'], dir);
    expect(get.code).toBe(0);
    expect(get.stdout.trim()).toBe('Jane Doe');

    const config = JSON.parse(await fs.readFile(path.join(dir, 'mdgarden.config.json'), 'utf8'));
    expect(config.site.author).toBe('Jane Doe');
  });

  it('set JSON-parses values that look like booleans/numbers/objects', async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'mdgarden-cli-config-json-'));
    await runCli(['init', '.', '-y'], dir);

    await runCli(['config', 'set', 'features.graph', 'false'], dir);
    const config = JSON.parse(await fs.readFile(path.join(dir, 'mdgarden.config.json'), 'utf8'));
    expect(config.features.graph).toBe(false);
  });

  it('get with no key prints the whole config as JSON', async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'mdgarden-cli-config-all-'));
    await runCli(['init', '.', '-y'], dir);

    const { stdout, code } = await runCli(['config', 'get'], dir);
    expect(code).toBe(0);
    expect(JSON.parse(stdout).site).toBeDefined();
  });

  it('unset removes a key', async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'mdgarden-cli-config-unset-'));
    await runCli(['init', '.', '-y'], dir);
    await runCli(['config', 'set', 'site.logo', '"🌱"'], dir);

    const unset = await runCli(['config', 'unset', 'site.logo'], dir);
    expect(unset.code).toBe(0);
    expect(unset.stdout).toContain('✓ Unset site.logo');

    const config = JSON.parse(await fs.readFile(path.join(dir, 'mdgarden.config.json'), 'utf8'));
    expect(config.site.logo).toBeUndefined();
  });

  it('set fails clearly when no config exists yet', async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'mdgarden-cli-config-noconfig-'));
    const { stderr, code } = await runCli(['config', 'set', 'site.author', 'Jane'], dir);
    expect(code).toBe(1);
    expect(stderr).toContain('mdgarden init');
  });

  it('get of an unknown key fails clearly', async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'mdgarden-cli-config-unknown-'));
    await runCli(['init', '.', '-y'], dir);
    const { stderr, code } = await runCli(['config', 'get', 'site.nope'], dir);
    expect(code).toBe(1);
    expect(stderr).toContain('No such config key');
  });
});

describe('mdgarden publish', () => {
  let dir: string;
  afterEach(async () => {
    if (dir) await fs.rm(dir, { recursive: true, force: true });
  });

  it('fails clearly when no deploy target is configured', async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'mdgarden-cli-publish-'));
    await runCli(['build', '.', '-y'], dir);
    const { stderr, code } = await runCli(['publish', '.'], dir);
    expect(code).toBe(1);
    expect(stderr).toContain('No deploy target specified');
  });
});
