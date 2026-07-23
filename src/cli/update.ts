import { spawn } from 'node:child_process';
import { realpathSync } from 'node:fs';
import path from 'node:path';
import { VERSION } from '../version.js';

const INSTALL_SH_URL = 'https://raw.githubusercontent.com/THANSHEER/mdgarden/main/scripts/install.sh';
const INSTALL_PS1_URL = 'https://raw.githubusercontent.com/THANSHEER/mdgarden/main/scripts/install.ps1';
const LATEST_RELEASE_URL = 'https://github.com/THANSHEER/mdgarden/releases/latest';

export type UpdateSource = 'homebrew' | 'standalone' | 'npm';

export interface UpdatePlan {
  source: UpdateSource;
  command: string;
  args: string[];
  env?: NodeJS.ProcessEnv;
  note: string;
  detached?: boolean;
}

export interface VersionCheck {
  /** Installed version without a leading `v`. */
  current: string;
  /** Latest release version without a leading `v`. */
  latest: string;
  /** GitHub release tag to pass to the installer (usually `vX.Y.Z`). */
  latestTag: string;
  updateAvailable: boolean;
}

function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}

function escapePowerShellSingleQuoted(value: string): string {
  return value.replace(/'/g, "''");
}

function resolveRealPath(filePath: string): string {
  try {
    return normalizePath(realpathSync(filePath));
  } catch {
    return normalizePath(filePath);
  }
}

/** Strip a leading `v` so `v0.3.0` and `0.3.0` compare equal. */
export function normalizeVersion(version: string): string {
  return version.trim().replace(/^v/i, '');
}

/** Compare dotted numeric versions. Returns -1 / 0 / 1 like strcmp. */
export function compareVersions(a: string, b: string): number {
  const left = normalizeVersion(a).split('.').map((part) => Number.parseInt(part, 10) || 0);
  const right = normalizeVersion(b).split('.').map((part) => Number.parseInt(part, 10) || 0);
  const len = Math.max(left.length, right.length);
  for (let i = 0; i < len; i++) {
    const x = left[i] ?? 0;
    const y = right[i] ?? 0;
    if (x < y) return -1;
    if (x > y) return 1;
  }
  return 0;
}

function releaseTagFromUrl(url: string): string | undefined {
  const match = url.match(/\/releases\/tag\/([^/?#]+)/);
  return match?.[1];
}

/** Resolve the latest GitHub release tag (no API key; follows the /releases/latest redirect). */
export async function fetchLatestVersion(fetchImpl: typeof fetch = fetch): Promise<string> {
  const res = await fetchImpl(LATEST_RELEASE_URL, {
    method: 'HEAD',
    redirect: 'follow',
    headers: { 'User-Agent': 'mdgarden-update' },
  });
  const tag =
    releaseTagFromUrl(res.url) ??
    releaseTagFromUrl(res.headers.get('location') ?? '');
  if (!tag) {
    throw new Error('Could not determine the latest mdgarden release from GitHub');
  }
  return tag;
}

/** Compare the running binary against the latest GitHub release. */
export async function checkForUpdate(
  currentVersion = VERSION,
  fetchImpl: typeof fetch = fetch,
): Promise<VersionCheck> {
  const latestTag = await fetchLatestVersion(fetchImpl);
  const current = normalizeVersion(currentVersion);
  const latest = normalizeVersion(latestTag);
  const tagged = latestTag.startsWith('v') || latestTag.startsWith('V') ? latestTag : `v${latestTag}`;
  return {
    current,
    latest,
    latestTag: tagged,
    // Unknown local builds should still be allowed to update.
    updateAvailable: current === 'unknown' || compareVersions(current, latest) < 0,
  };
}

export function detectUpdateSource(execPath = process.execPath): UpdateSource {
  const normalized = normalizePath(execPath);
  if (normalized.includes('/Cellar/mdgarden/')) return 'homebrew';
  const base = path.basename(normalized).toLowerCase();
  if (base === 'mdgarden' || base === 'mdgarden.exe') return 'standalone';
  return 'npm';
}

export function buildUpdatePlan(
  execPath = process.execPath,
  platform = process.platform,
  /** Exact release tag for standalone installs (`vX.Y.Z` or `latest`). */
  version = 'latest',
): UpdatePlan {
  const realExecPath = resolveRealPath(execPath);
  const source = detectUpdateSource(realExecPath);
  const installDir = path.dirname(realExecPath);

  if (source === 'homebrew') {
    return {
      source,
      command: 'brew',
      args: ['upgrade', 'mdgarden'],
      note: 'Homebrew manages this install, so update it with `brew upgrade mdgarden`.',
    };
  }

  if (source === 'standalone') {
    if (platform === 'win32') {
      const script = [
        '$ErrorActionPreference = "Stop"',
        `$parentPid = ${process.pid}`,
        'while (Get-Process -Id $parentPid -ErrorAction SilentlyContinue) { Start-Sleep -Milliseconds 500 }',
        `$env:MDGARDEN_BIN_DIR = '${escapePowerShellSingleQuoted(installDir)}'`,
        `$env:MDGARDEN_VERSION = '${escapePowerShellSingleQuoted(version)}'`,
        `irm '${INSTALL_PS1_URL}' | iex`,
      ].join('; ');

      return {
        source,
        command: 'powershell',
        args: ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script],
        detached: true,
        note: 'Standalone Windows installs update after the current process exits.',
      };
    }

    return {
      source,
      command: 'sh',
      args: ['-c', `curl -fsSL ${INSTALL_SH_URL} | sh`],
      env: {
        ...process.env,
        MDGARDEN_BIN_DIR: installDir,
        MDGARDEN_VERSION: version,
      },
      note: 'Standalone installs update by re-running the bundled installer script.',
    };
  }

  return {
    source,
    command: 'npm',
    args: ['install', '-g', 'mdgarden@latest'],
    note: 'npm installs update with `npm install -g mdgarden@latest`.',
  };
}

export async function runUpdatePlan(plan: UpdatePlan): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(plan.command, plan.args, {
      detached: Boolean(plan.detached),
      env: plan.env,
      stdio: plan.detached ? 'ignore' : 'inherit',
      shell: false,
    });
    child.once('error', reject);
    child.once('spawn', () => {
      if (plan.detached) {
        child.unref();
        resolve();
        return;
      }
      child.once('exit', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`${plan.command} exited with code ${code ?? 'unknown'}`));
      });
    });
  });
}
