import { describe, expect, it, vi } from 'vitest';
import {
  buildUpdatePlan,
  checkForUpdate,
  compareVersions,
  detectUpdateSource,
  fetchLatestVersion,
  normalizeVersion,
} from '../src/cli/update.js';

describe('update source detection', () => {
  it('detects Homebrew installs from the Cellar path', () => {
    expect(detectUpdateSource('/opt/homebrew/Cellar/mdgarden/0.3.0/bin/mdgarden')).toBe('homebrew');
  });

  it('detects standalone binaries from the executable name', () => {
    expect(detectUpdateSource('/usr/local/bin/mdgarden')).toBe('standalone');
  });

  it('falls back to npm for node-based installs', () => {
    expect(detectUpdateSource('/opt/homebrew/bin/node')).toBe('npm');
  });
});

describe('version comparison', () => {
  it('normalizes a leading v', () => {
    expect(normalizeVersion('v0.3.0')).toBe('0.3.0');
    expect(normalizeVersion('0.3.0')).toBe('0.3.0');
  });

  it('orders dotted versions', () => {
    expect(compareVersions('0.2.0', '0.3.0')).toBe(-1);
    expect(compareVersions('v0.3.0', '0.3.0')).toBe(0);
    expect(compareVersions('0.4.0', '0.3.9')).toBe(1);
  });
});

describe('latest release lookup', () => {
  it('reads the tag from the followed /releases/latest URL', async () => {
    const fetchImpl = vi.fn(async () => ({
      url: 'https://github.com/THANSHEER/mdgarden/releases/tag/v0.3.0',
      headers: { get: () => null },
    })) as unknown as typeof fetch;

    await expect(fetchLatestVersion(fetchImpl)).resolves.toBe('v0.3.0');
  });

  it('reports no update when current matches latest', async () => {
    const fetchImpl = vi.fn(async () => ({
      url: 'https://github.com/THANSHEER/mdgarden/releases/tag/v0.3.0',
      headers: { get: () => null },
    })) as unknown as typeof fetch;

    const check = await checkForUpdate('0.3.0', fetchImpl);
    expect(check).toEqual({
      current: '0.3.0',
      latest: '0.3.0',
      latestTag: 'v0.3.0',
      updateAvailable: false,
    });
  });

  it('reports an update when current is older', async () => {
    const fetchImpl = vi.fn(async () => ({
      url: 'https://github.com/THANSHEER/mdgarden/releases/tag/v0.4.0',
      headers: { get: () => null },
    })) as unknown as typeof fetch;

    const check = await checkForUpdate('0.3.0', fetchImpl);
    expect(check.updateAvailable).toBe(true);
    expect(check.latestTag).toBe('v0.4.0');
  });
});

describe('update plan', () => {
  it('uses brew upgrade for Homebrew installs', () => {
    const plan = buildUpdatePlan('/opt/homebrew/Cellar/mdgarden/0.3.0/bin/mdgarden');
    expect(plan.source).toBe('homebrew');
    expect(plan.command).toBe('brew');
    expect(plan.args).toEqual(['upgrade', 'mdgarden']);
  });

  it('uses the standalone installer for unix binaries', () => {
    const plan = buildUpdatePlan('/usr/local/bin/mdgarden', 'linux', 'v0.3.0');
    expect(plan.source).toBe('standalone');
    expect(plan.command).toBe('sh');
    expect(plan.args[0]).toBe('-c');
    expect(plan.env?.MDGARDEN_BIN_DIR).toBe('/usr/local/bin');
    expect(plan.env?.MDGARDEN_VERSION).toBe('v0.3.0');
  });

  it('uses a detached PowerShell helper for standalone Windows binaries', () => {
    const plan = buildUpdatePlan(
      'C:/Users/test/AppData/Local/Programs/mdgarden/mdgarden.exe',
      'win32',
      'v0.3.0',
    );
    expect(plan.source).toBe('standalone');
    expect(plan.command).toBe('powershell');
    expect(plan.detached).toBe(true);
    expect(plan.args.join(' ')).toContain('MDGARDEN_BIN_DIR');
    expect(plan.args.join(' ')).toContain('v0.3.0');
  });

  it('uses npm for node-based installs', () => {
    const plan = buildUpdatePlan('/opt/homebrew/bin/node');
    expect(plan.source).toBe('npm');
    expect(plan.command).toBe('npm');
    expect(plan.args).toEqual(['install', '-g', 'mdgarden@latest']);
  });
});
