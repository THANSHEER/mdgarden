// Serve the built site locally with live reloading.

import { promises as fs, watch, type FSWatcher } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { build, type BuildOptions } from '../core/build.js';
import { loadConfig } from '../core/config.js';

const LIVE_RELOAD =
  `<script>(function(){try{var s=new EventSource('/__mdgarden_livereload');` +
  `var opened=false;` +
  `s.onopen=function(){if(opened)location.reload();opened=true};` +
  `s.onmessage=function(){location.reload()};}catch(e){}})();</script>`;

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.pdf': 'application/pdf',
  '.mp4': 'video/mp4',
};

export interface ServeOptions extends BuildOptions {
  /** Port to listen on (default 3000; tries the next few if busy). */
  port?: number;
}

export function injectReload(html: string): string {
  return html.includes('</body>')
    ? html.replace('</body>', `${LIVE_RELOAD}</body>`)
    : html + LIVE_RELOAD;
}

/**
 * Resolve a request URL to an absolute path inside outDir, or null if the
 * request would escape it. Uses path.relative + a ".." check rather than a
 * string-prefix check — a prefix check alone lets "../public-evil/x" through
 * when outDir is ".../public", since ".../public-evil".startsWith(".../public")
 * is true despite "public-evil" being a sibling directory, not a subdirectory.
 */
export function resolveServedPath(outDir: string, requestUrl: string): string | null {
  let rel = decodeURIComponent(requestUrl);
  if (rel.endsWith('/')) rel += 'index.html';
  const filePath = path.join(outDir, rel);
  const fromOutDir = path.relative(outDir, filePath);
  if (fromOutDir.startsWith('..') || path.isAbsolute(fromOutDir)) return null;
  return filePath;
}

/** Build, serve, and watch. Resolves only on a fatal listen error (otherwise runs forever). */
export async function serve(opts: ServeOptions = {}): Promise<void> {
  const cwd = opts.cwd ?? process.cwd();
  const { config, baseDir } = await loadConfig(opts.configPath, cwd);

  const contentDir = opts.contentDir
    ? path.resolve(cwd, opts.contentDir)
    : path.resolve(baseDir, config.build.contentDir);
  const outDir = opts.outDir
    ? path.resolve(cwd, opts.outDir)
    : path.resolve(baseDir, config.build.outDir);

  const rebuild = () => build({ ...opts, cwd, outDir });
  const first = await rebuild();
  console.log(`✓ Built ${first.pageCount} page(s)`);

  const clients = new Set<http.ServerResponse>();
  const reloadAll = (): void => {
    for (const client of clients) {
      if (client.destroyed || client.writableEnded) {
        clients.delete(client);
        continue;
      }
      client.write('data: reload\n\n');
    }
  };

  const server = http.createServer(async (req, res) => {
    const url = (req.url || '/').split('?')[0];

    if (url === '/__mdgarden_livereload') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      });
      res.write('retry: 1000\n\n');
      clients.add(res);
      const heartbeat = setInterval(() => {
        if (!res.destroyed && !res.writableEnded) res.write(': heartbeat\n\n');
      }, 15_000);
      req.on('close', () => {
        clearInterval(heartbeat);
        clients.delete(res);
      });
      return;
    }

    const filePath = resolveServedPath(outDir, url);
    if (!filePath) {
      res.writeHead(403).end('Forbidden');
      return;
    }

    try {
      const data = await fs.readFile(filePath);
      const ext = path.extname(filePath).toLowerCase();
      if (ext === '.html') {
        res.writeHead(200, {
          'Content-Type': MIME['.html'],
          'Cache-Control': 'no-store',
        }).end(injectReload(data.toString('utf8')));
      } else {
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' }).end(data);
      }
    } catch {
      try {
        const nf = await fs.readFile(path.join(outDir, '404.html'), 'utf8');
        res.writeHead(404, {
          'Content-Type': MIME['.html'],
          'Cache-Control': 'no-store',
        }).end(injectReload(nf));
      } catch {
        res.writeHead(404, { 'Content-Type': MIME['.html'] }).end('<h1>404</h1>');
      }
    }
  });

  const port = await listen(server, opts.port ?? 3000);
  console.log(`  ➜  http://localhost:${port}/  (live reload on)`);

  // Watch files for changes.
  let timer: NodeJS.Timeout | undefined;
  const schedule = (): void => {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      try {
        const r = await rebuild();
        console.log(`↻ rebuilt ${r.pageCount} page(s)`);
        reloadAll();
      } catch (err) {
        console.error(`✗ rebuild failed: ${(err as Error).message}`);
      }
    }, 120);
  };

  // When outDir lives inside contentDir (e.g. `-o ./notes/.site`), every
  // rebuild writes files the recursive watcher below would otherwise see as
  // a content change — triggering another rebuild, forever. Filter those out.
  const outDirRel = path.relative(contentDir, outDir);
  const outDirIsInsideContent = outDirRel !== '' && !outDirRel.startsWith('..') && !path.isAbsolute(outDirRel);
  const isOutDirEvent = (filename: string | null): boolean => {
    if (!outDirIsInsideContent || !filename) return false;
    const rel = path.normalize(filename);
    return rel === outDirRel || rel.startsWith(outDirRel + path.sep);
  };
  const onContentChange = (_event: string, filename: string | null): void => {
    if (isOutDirEvent(filename)) return;
    schedule();
  };

  const watchers: FSWatcher[] = [];
  try {
    watchers.push(watch(contentDir, { recursive: true }, onContentChange));
  } catch {
    watchers.push(watch(contentDir, onContentChange));
  }
  if (opts.configPath || baseDir) {
    const cfgFile = opts.configPath
      ? path.resolve(cwd, opts.configPath)
      : path.join(baseDir, 'mdgarden.config.json');
    try {
      watchers.push(watch(cfgFile, schedule));
    } catch {
      /* no config file to watch */
    }
  }
  const shutdown = (): void => {
    for (const w of watchers) w.close();
    for (const client of clients) client.end();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 1_000).unref();
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

/** Listen on `port`, trying the next few if it's in use. */
function listen(server: http.Server, port: number, attempts = 10): Promise<number> {
  return new Promise((resolve, reject) => {
    const tryPort = (p: number, left: number): void => {
      server.once('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE' && left > 0) tryPort(p + 1, left - 1);
        else reject(err);
      });
      server.listen(p, () => resolve(p));
    };
    tryPort(port, attempts);
  });
}
