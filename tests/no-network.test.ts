import { describe, expect, it, vi, beforeAll, afterAll } from 'vitest';

/**
 * Guard test: importing and running ContextWall must NOT touch the network.
 * We stub `fetch` and the Node `http`/`https` modules and assert nothing
 * was called during a representative use of the public API.
 */

describe('no-network invariant', () => {
  const fetchSpy = vi.fn();
  let originalFetch: typeof globalThis.fetch | undefined;

  beforeAll(() => {
    originalFetch = globalThis.fetch;
    Object.defineProperty(globalThis, 'fetch', { value: fetchSpy, writable: true });
  });

  afterAll(() => {
    if (originalFetch) {
      Object.defineProperty(globalThis, 'fetch', { value: originalFetch, writable: true });
    }
  });

  it('does not call fetch from any public API', async () => {
    const cw = await import('../src/index.js');
    cw.promptwall('Use sk_live_abcdef0123 right now');
    cw.auditwall('email john@example.com here');
    cw.batchwall(['sk_live_aaaaaaaaaa', 'me@example.com']);
    cw.schemawall({ a: { b: 'sk_live_abcdef0123' } });
    cw.logwall('sk_live_abcdef0123', { logger: () => {} });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('source files do not import http/https/dns', async () => {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const root = path.resolve(process.cwd(), 'src');
    const queue: string[] = [root];
    const offending: string[] = [];
    while (queue.length > 0) {
      const dir = queue.pop();
      if (!dir) continue;
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const e of entries) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) queue.push(full);
        else if (e.isFile() && e.name.endsWith('.ts')) {
          const src = await fs.readFile(full, 'utf8');
          if (
            /from ['"]node:(?:http|https|dns)['"]/.test(src) ||
            /from ['"](?:http|https|dns)['"]/.test(src) ||
            /\bfetch\s*\(/.test(src)
          ) {
            offending.push(full);
          }
        }
      }
    }
    expect(offending).toEqual([]);
  });
});
