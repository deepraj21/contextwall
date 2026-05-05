import { describe, expect, it } from 'vitest';
import { batchwall, dewall } from '../src/index.js';

describe('batchwall', () => {
  it('sanitizes an array of prompts', () => {
    const out = batchwall([
      'Key: sk_live_abcdef0123',
      'Call john@example.com',
      'plain string',
    ]);
    expect(out[0]).toContain('[API_KEY]');
    expect(out[1]).toContain('[EMAIL]');
    expect(out[2]).toBe('plain string');
  });

  it('returns parallel texts and contexts when tokenizing', () => {
    const r = batchwall(['sk_live_abcdef0123', 'me@example.com'], { strategy: 'tokenize' });
    expect(r.texts.length).toBe(2);
    expect(r.contexts.length).toBe(2);
    const ctx0 = r.contexts[0];
    const ctx1 = r.contexts[1];
    expect(ctx0).toBeDefined();
    expect(ctx1).toBeDefined();
    if (!ctx0 || !ctx1) throw new Error('expected tokenizer contexts');
    expect(dewall(r.texts[0] ?? '', ctx0)).toBe('sk_live_abcdef0123');
    expect(dewall(r.texts[1] ?? '', ctx1)).toBe('me@example.com');
  });
});
