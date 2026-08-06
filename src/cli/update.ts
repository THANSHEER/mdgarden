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

/** Normalize path separators to `/` for reliable substring checks. */
function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}

/** Escape a value for safe inclusion inside a PowerShell single-quoted string. */
function escapePowerShellSingleQuoted(value: string): string {
  return value.replace(/'/g, "''");
}

/** Resolve symlinks when possible; fall back to the normalized input path. */
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

/**
 * Compare dotted numeric versions. Returns -1 / 0 / 1 like strcmp.
 * Not full SemVer: a single trailing prerelease suffix (`-rc.1`) is stripped so
 * `0.4.0-rc.1` compares equal to `0.4.0` rather than as a newer build.
 */
export function compareVersions(a: string, b: string): number {
  const left = normalizeVersion(a)
    .replace(/-.*$/, '')
    .split('.')
    .map((part) => Number.parseInt(part, 10) || 0);
  const right = normalizeVersion(b)
    .replace(/-.*$/, '')
    .split('.')
    .map((part) => Number.parseInt(part, 10) || 0);
  const len = Math.max(left.length, right.length);
  for (let i = 0; i < len; i++) {
    const x = left[i] ?? 0;
    const y = right[i] ?? 0;
    if (x < y) return -1;
    if (x > y) return 1;
  }
  return 0;
}

/** Accept only release-style tags (optionally with a trailing prerelease segment). */
export const RELEASE_TAG_RE = /^v?\d+\.\d+\.\d+([.-][\w.]+)?$/i;

/** Return true when `tag` looks like a safe release tag (`v1.2.3` or with a prerelease suffix). */
export function isValidReleaseTag(tag: string): boolean {
  return RELEASE_TAG_RE.test(tag.trim());
}

/** Extract the `/releases/tag/<name>` segment from a GitHub release URL. */
function releaseTagFromUrl(url: string): string | undefined {
  const match = url.match(/\/releases\/tag\/([^/?#]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : undefined;
}

/** Reject release redirects that leave github.com (defense in depth for installers). */
function assertGithubReleaseHost(url: string): void {
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    throw new Error('Could not determine the latest mdgarden release from GitHub');
  }
  if (host !== 'github.com' && host !== 'www.github.com') {
    throw new Error(`Unexpected release redirect host: ${host}`);
  }
}

const UPDATE_FETCH_TIMEOUT_MS = 8000;

/** Resolve the latest GitHub release tag (no API key; follows the /releases/latest redirect). */
export async function fetchLatestVersion(fetchImpl: typeof fetch = fetch): Promise<string> {
  const res = await fetchImpl(LATEST_RELEASE_URL, {
    method: 'HEAD',
    redirect: 'follow',
    headers: { 'User-Agent': 'mdgarden-update' },
    signal: AbortSignal.timeout(UPDATE_FETCH_TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(`GitHub releases returned HTTP ${res.status}`);
  }
  assertGithubReleaseHost(res.url);
  const tag =
    releaseTagFromUrl(res.url) ??
    releaseTagFromUrl(res.headers.get('location') ?? '');
  if (!tag || !isValidReleaseTag(tag)) {
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

/** Infer install channel from the executable path (Homebrew Cellar, SEA binary, or npm). */
export function detectUpdateSource(execPath = process.execPath): UpdateSource {
  const normalized = normalizePath(execPath);
  if (normalized.includes('/Cellar/mdgarden/')) return 'homebrew';
  const base = path.basename(normalized).toLowerCase();
  if (base === 'mdgarden' || base === 'mdgarden.exe') return 'standalone';
  return 'npm';
}

/** Like `detectUpdateSource`, but resolves symlinks first (e.g. Homebrew shims). */
export function getUpdateSource(execPath = process.execPath): UpdateSource {
  return detectUpdateSource(resolveRealPath(execPath));
}

export interface UpdateDecision {
  proceed: boolean;
  latestTag: string;
  lines: string[];
}

/** Decide whether to run an update and which release tag standalone installs should target. */
export async function decideUpdate(
  execPath = process.execPath,
  options: { force?: boolean } = {},
  fetchImpl: typeof fetch = fetch,
  currentVersion = VERSION,
): Promise<UpdateDecision> {
  const source = getUpdateSource(execPath);
  const lines: string[] = [];
  let latestTag = 'latest';

  if (options.force && source !== 'standalone') {
    lines.push(`Reinstalling (--force) via ${source}...`);
    return { proceed: true, latestTag, lines };
  }

  try {
    const check = await checkForUpdate(currentVersion, fetchImpl);
    latestTag = check.latestTag;
    if (!check.updateAvailable && !options.force) {
      lines.push(`✓ Already up to date (v${check.latest})`);
      return { proceed: false, latestTag, lines };
    }
    if (!check.updateAvailable && options.force) {
      lines.push(`Already on v${check.latest} — reinstalling (--force)...`);
    } else {
      lines.push(`Update available: v${check.current} → v${check.latest}`);
    }
    return { proceed: true, latestTag, lines };
  } catch (err) {
    const message = (err as Error).message;
    if (source === 'standalone') {
      if (options.force) {
        lines.push(`Could not check GitHub releases: ${message}`);
        lines.push('Reinstalling with latest release (--force)...');
        return { proceed: true, latestTag, lines };
      }
      throw err;
    }
    lines.push(`Could not check GitHub releases: ${message}`);
    lines.push(`Proceeding with ${source} update...`);
    return { proceed: true, latestTag, lines };
  }
}

/** Build the shell/npm/brew command used to install or upgrade mdgarden. */
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

/** Spawn the update plan; detached plans (Windows SEA) return once the child has started. */
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
