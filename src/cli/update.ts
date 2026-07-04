import { spawn } from 'node:child_process';
import path from 'node:path';

const INSTALL_SH_URL = 'https://raw.githubusercontent.com/THANSHEER/mdgarden/main/scripts/install.sh';
const INSTALL_PS1_URL = 'https://raw.githubusercontent.com/THANSHEER/mdgarden/main/scripts/install.ps1';

export type UpdateSource = 'homebrew' | 'standalone' | 'npm';

export interface UpdatePlan {
  source: UpdateSource;
  command: string;
  args: string[];
  env?: NodeJS.ProcessEnv;
  detached?: boolean;
  note: string;
}

function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}

function escapePowerShellSingleQuoted(value: string): string {
  return value.replace(/'/g, "''");
}

export function detectUpdateSource(execPath = process.execPath): UpdateSource {
  const normalized = normalizePath(execPath);
  if (normalized.includes('/Cellar/mdgarden/')) return 'homebrew';
  if (path.basename(normalized).toLowerCase() === 'mdgarden' || path.basename(normalized).toLowerCase() === 'mdgarden.exe') {
    return 'standalone';
  }
  return 'npm';
}

export function buildUpdatePlan(execPath = process.execPath, platform = process.platform): UpdatePlan {
  const source = detectUpdateSource(execPath);
  const installDir = path.dirname(execPath);

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
        '$env:MDGARDEN_VERSION = "latest"',
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
        MDGARDEN_VERSION: 'latest',
      },
      note: 'Standalone installs update by re-running the bundled installer script.',
    };
  }

  return {
    source,
    command: 'npm',
    args: ['install', '-g', 'mdgarden@latest'],
    note: 'npm-global installs update with `npm install -g mdgarden@latest`.',
  };
}

export async function runUpdatePlan(plan: UpdatePlan): Promise<void> {
  if (plan.detached) {
    await new Promise<void>((resolve, reject) => {
      const child = spawn(plan.command, plan.args, {
        detached: true,
        stdio: 'ignore',
        env: plan.env,
      });
      child.once('error', reject);
      child.once('spawn', () => {
        child.unref();
        resolve();
      });
    });
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const child = spawn(plan.command, plan.args, {
      env: plan.env,
      stdio: 'inherit',
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${plan.command} exited with code ${code ?? 'unknown'}`));
    });
  });
}
