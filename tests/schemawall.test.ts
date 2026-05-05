import { describe, expect, it } from 'vitest';
import { schemawall, dewall } from '../src/index.js';

describe('schemawall', () => {
  it('walks nested chat messages and sanitizes content', () => {
    const messages = [
      { role: 'system', content: 'Use key sk_live_abcdef0123' },
      { role: 'user', content: 'My email is john@example.com' },
    ];
    const cleaned = schemawall(messages);
    expect(cleaned[0]?.content).toContain('[API_KEY]');
    expect(cleaned[1]?.content).toContain('[EMAIL]');
  });

  it('does not mutate the input object', () => {
    const messages = [{ content: 'sk_live_abcdef0123' }];
    const before = JSON.stringify(messages);
    schemawall(messages);
    expect(JSON.stringify(messages)).toBe(before);
  });

  it('preserves Date and RegExp by reference', () => {
    const d = new Date();
    const r = /abc/g;
    const cleaned = schemawall({ d, r, name: 'sk_live_abcdef0123' }) as {
      d: Date;
      r: RegExp;
      name: string;
    };
    expect(cleaned.d).toBe(d);
    expect(cleaned.r).toBe(r);
    expect(cleaned.name).toContain('[API_KEY]');
  });

  it('handles cycles without crashing', () => {
    const node: Record<string, unknown> = { content: 'sk_live_abcdef0123' };
    node.self = node;
    const out = schemawall(node) as Record<string, unknown>;
    expect(typeof out.content).toBe('string');
    expect(out.content).toContain('[API_KEY]');
  });

  it('shares a single context across the tree when tokenizing', () => {
    const messages = [
      { content: 'sk_live_abcdef0123' },
      { content: 'jane@example.com' },
    ];
    const result = schemawall(messages, { strategy: 'tokenize' });
    expect(result.context.tokenMap.size).toBe(2);
    const out0 = (result.value[0] as { content: string }).content;
    const out1 = (result.value[1] as { content: string }).content;
    expect(dewall(out0, result.context)).toBe('sk_live_abcdef0123');
    expect(dewall(out1, result.context)).toBe('jane@example.com');
  });

  it('returns primitive non-strings unchanged', () => {
    const out = schemawall({ n: 42, b: true, x: null }) as Record<string, unknown>;
    expect(out.n).toBe(42);
    expect(out.b).toBe(true);
    expect(out.x).toBeNull();
  });
});
