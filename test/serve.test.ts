import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { injectReload, resolveServedPath } from '../src/cli/serve.js';

const outDir = path.join('/var', 'site', 'public');

describe('resolveServedPath (dev-server path traversal guard)', () => {
  it('resolves a normal request to a path inside outDir', () => {
    expect(resolveServedPath(outDir, '/notes/foo/')).toBe(path.join(outDir, 'notes/foo/index.html'));
    expect(resolveServedPath(outDir, '/styles.css')).toBe(path.join(outDir, 'styles.css'));
  });

  it('rejects classic ".." traversal out of outDir', () => {
    expect(resolveServedPath(outDir, '/../../../etc/passwd')).toBeNull();
  });

  it('rejects a sibling directory that merely shares outDir as a string prefix', () => {
    // ".../public-evil" starts with ".../public" as a string, but is not inside it —
    // a naive `filePath.startsWith(outDir)` check would wrongly allow this through.
    expect(resolveServedPath(outDir, '/../public-evil/secret.txt')).toBeNull();
  });

  it('rejects a URL-encoded traversal sequence', () => {
    expect(resolveServedPath(outDir, '/%2e%2e/%2e%2e/etc/passwd')).toBeNull();
  });
});

describe('live reload client', () => {
  it('reloads on rebuild messages and after a server restart reconnect', () => {
    const html = injectReload('<html><body><main>Page</main></body></html>');
    expect(html).toContain("new EventSource('/__mdgarden_livereload')");
    expect(html).toContain('s.onmessage=function(){location.reload()}');
    expect(html).toContain('s.onopen=function(){if(opened)location.reload();opened=true}');
    expect(html.indexOf('new EventSource')).toBeLessThan(html.indexOf('</body>'));
  });
});
