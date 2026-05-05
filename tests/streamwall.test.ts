import { describe, expect, it } from 'vitest';
import { streamwall } from '../src/index.js';
import { streamwallNode } from '../src/middleware/index.js';

async function pipeThroughWebStream(chunks: string[]): Promise<string> {
  const ts = streamwall({ lookbehind: 16 });
  const writer = ts.writable.getWriter();
  const reader = ts.readable.getReader();
  const collected: string[] = [];

  const reading = (async () => {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) collected.push(value);
    }
  })();

  for (const c of chunks) await writer.write(c);
  await writer.close();
  await reading;
  return collected.join('');
}

describe('streamwall (Web Streams)', () => {
  it('sanitizes a single-chunk input', async () => {
    const out = await pipeThroughWebStream(['Use sk_live_abcdef0123 today']);
    expect(out).toContain('[API_KEY]');
    expect(out).not.toContain('sk_live_abcdef0123');
  });

  it('handles secrets that span chunk boundaries', async () => {
    const out = await pipeThroughWebStream(['prefix sk_live_', 'abcdef0123 suffix']);
    expect(out).not.toContain('sk_live_abcdef0123');
    expect(out).toContain('[API_KEY]');
  });

  it('passes through plain text untouched', async () => {
    const out = await pipeThroughWebStream(['hello ', 'world']);
    expect(out).toBe('hello world');
  });
});

async function pipeThroughNodeStream(chunks: string[]): Promise<string> {
  const ts = streamwallNode({ lookbehind: 16 });
  const collected: string[] = [];
  ts.on('data', (chunk: Buffer | string) => {
    collected.push(typeof chunk === 'string' ? chunk : chunk.toString('utf8'));
  });
  for (const c of chunks) ts.write(c);
  ts.end();
  await new Promise((resolve) => ts.on('end', resolve));
  return collected.join('');
}

describe('streamwall (Node Transform)', () => {
  it('sanitizes a single-chunk input', async () => {
    const out = await pipeThroughNodeStream(['Use sk_live_abcdef0123 today']);
    expect(out).toContain('[API_KEY]');
  });

  it('handles secrets that span chunk boundaries', async () => {
    const out = await pipeThroughNodeStream(['prefix sk_live_', 'abcdef0123 suffix']);
    expect(out).toContain('[API_KEY]');
    expect(out).not.toContain('sk_live_abcdef0123');
  });
});
