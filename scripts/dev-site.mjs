// Repository development supervisor.
//
// Vault/config changes are handled by the CLI's own live-reload watcher.
// Package source/theme changes require rebuilding dist/ and restarting that
// CLI process; this supervisor performs that restart automatically.

import { spawn } from 'node:child_process';
import { existsSync, readdirSync, statSync, watch } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const cliArgs = process.argv.slice(2);
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const rootWatchFiles = new Set([
  'esbuild.config.mjs',
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'tsconfig.build.json',
]);

if (cliArgs.length === 0) {
  console.error(
    'Usage: node scripts/dev-site.mjs <content-dir> -o <output-dir> [CLI options]',
  );
  process.exit(1);
}

let server;
let restartTimer;
let restarting = false;
let restartQueued = false;
let shuttingDown = false;
let watchers = [];

function run(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd: root, stdio: 'inherit' });
    child.once('exit', (code) => resolve(code ?? 1));
    child.once('error', () => resolve(1));
  });
}

async function buildPackage() {
  return run(npm, ['run', 'build', '--silent']);
}

function startServer() {
  server = spawn(
    process.execPath,
    [path.join(root, 'dist/cli.js'), 'serve', ...cliArgs],
    { cwd: root, stdio: 'inherit' },
  );
  server.once('exit', (code) => {
    if (!shuttingDown && !restarting && code !== 0) {
      console.error(`Development server exited with code ${code ?? 1}.`);
      process.exitCode = code ?? 1;
    }
  });
}

function stopServer() {
  return new Promise((resolve) => {
    if (!server || server.exitCode !== null) {
      resolve();
      return;
    }
    const current = server;
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    current.once('exit', finish);
    if (!current.killed) current.kill();
    setTimeout(() => {
      if (current.exitCode === null) current.kill('SIGKILL');
      finish();
    }, 2_000).unref();
  });
}

function scheduleRestart() {
  clearTimeout(restartTimer);
  restartTimer = setTimeout(() => {
    restartQueued = true;
    void restartServer();
  }, 150);
}

async function restartServer() {
  if (restarting || shuttingDown) return;
  restarting = true;
  while (restartQueued && !shuttingDown) {
    restartQueued = false;
    console.log('\n↻ package source changed; rebuilding development server…');
    const code = await buildPackage();
    if (code !== 0) {
      console.error('✗ package rebuild failed; keeping the previous server running');
      continue;
    }
    await stopServer();
    if (!shuttingDown) startServer();
  }
  restarting = false;
}

function directoriesUnder(dir) {
  const dirs = [dir];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) dirs.push(...directoriesUnder(path.join(dir, entry.name)));
  }
  return dirs;
}

function watchDirectory(dir) {
  try {
    watchers.push(watch(dir, { recursive: true }, scheduleRestart));
  } catch {
    for (const childDir of directoriesUnder(dir)) {
      watchers.push(watch(childDir, scheduleRestart));
    }
  }
}

function installWatchers() {
  for (const dir of ['src', 'themes']) {
    const absolute = path.join(root, dir);
    if (existsSync(absolute) && statSync(absolute).isDirectory()) watchDirectory(absolute);
  }
  watchers.push(
    watch(root, (_event, filename) => {
      if (filename && rootWatchFiles.has(filename.toString())) scheduleRestart();
    }),
  );
}

async function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  clearTimeout(restartTimer);
  for (const watcher of watchers) watcher.close();
  watchers = [];
  await stopServer();
}

process.once('SIGINT', () => {
  void shutdown().then(() => process.exit(0));
});
process.once('SIGTERM', () => {
  void shutdown().then(() => process.exit(0));
});
process.once('SIGHUP', () => {
  void shutdown().then(() => process.exit(0));
});
process.once('exit', () => {
  if (server && server.exitCode === null && !server.killed) server.kill();
});

const initialCode = await buildPackage();
if (initialCode !== 0) process.exit(initialCode);
startServer();
installWatchers();
