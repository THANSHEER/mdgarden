import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildUpdatePlan,
  checkForUpdate,
  compareVersions,
  decideUpdate,
  detectUpdateSource,
  fetchLatestVersion,
  isValidReleaseTag,
  normalizeVersion,
} from '../src/cli/update.js';

function okFetch(url: string, location: string | null = null): typeof fetch {
  return vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
    expect(init?.signal).toBeDefined();
    return {
      ok: true,
      status: 200,
      url,
      headers: { get: (name: string) => (name.toLowerCase() === 'location' ? location : null) },
    };
  }) as unknown as typeof fetch;
}

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

describe('release tag validation', () => {
  it('accepts stable release tags', () => {
    expect(isValidReleaseTag('v0.4.0')).toBe(true);
    expect(isValidReleaseTag('0.4.0')).toBe(true);
  });

  it('rejects prereleases, shell metacharacters, and non-semver tags', () => {
    expect(isValidReleaseTag('v0.4.0-rc.1')).toBe(false);
    expect(isValidReleaseTag('0.4.0-beta')).toBe(false);
    expect(isValidReleaseTag('$(curl evil)')).toBe(false);
    expect(isValidReleaseTag('latest')).toBe(false);
    expect(isValidReleaseTag('v0.4')).toBe(false);
  });
});

describe('latest release lookup', () => {
  it('reads the tag from the followed /releases/latest URL', async () => {
    const fetchImpl = okFetch('https://github.com/THANSHEER/mdgarden/releases/tag/v0.3.0');
    await expect(fetchLatestVersion(fetchImpl)).resolves.toBe('v0.3.0');
  });

  it('rejects a non-GitHub redirect host', async () => {
    const fetchImpl = okFetch('https://evil.example/releases/tag/v0.3.0');
    await expect(fetchLatestVersion(fetchImpl)).rejects.toThrow(/Unexpected release redirect host/);
  });

  it('rejects malformed release tags', async () => {
    const fetchImpl = okFetch(
      'https://github.com/THANSHEER/mdgarden/releases/tag/$(curl%20evil)',
    );
    await expect(fetchLatestVersion(fetchImpl)).rejects.toThrow(
      /Could not determine the latest mdgarden release/,
    );
  });

  it('rejects non-OK responses', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: false,
      status: 403,
      url: 'https://github.com/THANSHEER/mdgarden/releases/latest',
      headers: { get: () => null },
    })) as unknown as typeof fetch;
    await expect(fetchLatestVersion(fetchImpl)).rejects.toThrow(/HTTP 403/);
  });

  it('reports no update when current matches latest', async () => {
    const fetchImpl = okFetch('https://github.com/THANSHEER/mdgarden/releases/tag/v0.3.0');
    const check = await checkForUpdate('0.3.0', fetchImpl);
    expect(check).toEqual({
      current: '0.3.0',
      latest: '0.3.0',
      latestTag: 'v0.3.0',
      updateAvailable: false,
    });
  });

  it('reports an update when current is older', async () => {
    const fetchImpl = okFetch('https://github.com/THANSHEER/mdgarden/releases/tag/v0.4.0');
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

describe('update decision', () => {
  const failingFetch = vi.fn(async () => {
    throw new Error('network down');
  }) as unknown as typeof fetch;

  beforeEach(() => {
    failingFetch.mockClear();
  });

  it('skips GitHub when forcing an npm reinstall', async () => {
    const decision = await decideUpdate('/opt/homebrew/bin/node', { force: true }, failingFetch);
    expect(decision.proceed).toBe(true);
    expect(decision.latestTag).toBe('latest');
    expect(decision.lines).toEqual(['Reinstalling (--force) via npm...']);
    expect(failingFetch).not.toHaveBeenCalled();
  });

  it('skips GitHub when forcing a Homebrew reinstall', async () => {
    const decision = await decideUpdate(
      '/opt/homebrew/Cellar/mdgarden/0.3.0/bin/mdgarden',
      { force: true },
      failingFetch,
    );
    expect(decision.proceed).toBe(true);
    expect(decision.lines).toEqual(['Reinstalling (--force) via homebrew...']);
    expect(failingFetch).not.toHaveBeenCalled();
  });

  it('proceeds with npm when GitHub is unreachable', async () => {
    const decision = await decideUpdate('/opt/homebrew/bin/node', {}, failingFetch);
    expect(decision.proceed).toBe(true);
    expect(decision.lines).toEqual([
      'Could not check GitHub releases: network down',
      'Proceeding with npm update...',
    ]);
  });

  it('proceeds with Homebrew when GitHub is unreachable', async () => {
    const decision = await decideUpdate(
      '/opt/homebrew/Cellar/mdgarden/0.3.0/bin/mdgarden',
      {},
      failingFetch,
    );
    expect(decision.proceed).toBe(true);
    expect(decision.lines[1]).toBe('Proceeding with homebrew update...');
  });

  it('still fails for standalone installs when GitHub is unreachable', async () => {
    await expect(
      decideUpdate('/usr/local/bin/mdgarden', {}, failingFetch),
    ).rejects.toThrow('network down');
  });

  it('falls back to latest when forcing a standalone reinstall without GitHub', async () => {
    const decision = await decideUpdate('/usr/local/bin/mdgarden', { force: true }, failingFetch);
    expect(decision.proceed).toBe(true);
    expect(decision.latestTag).toBe('latest');
    expect(decision.lines[1]).toBe('Reinstalling with latest release (--force)...');
  });
});
