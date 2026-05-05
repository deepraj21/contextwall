import { describe, expect, it } from 'vitest';
import { promptwall, dewall } from '../src/index.js';

describe('dewall', () => {
  it('restores all tokenized values', () => {
    const r = promptwall('one sk_live_aaaaaaaaaa and email me@example.com', {
      strategy: 'tokenize',
    });
    expect(r.context.tokenMap.size).toBe(2);
    expect(dewall(r.text, r.context)).toBe('one sk_live_aaaaaaaaaa and email me@example.com');
  });

  it('is a no-op when context is empty', () => {
    const r = promptwall('plain words', { strategy: 'tokenize' });
    expect(r.context.tokenMap.size).toBe(0);
    expect(dewall(r.text, r.context)).toBe('plain words');
  });

  it('restores the same value across LLM rephrasing', () => {
    const r = promptwall('use sk_live_aaaaaaaaaa today', { strategy: 'tokenize' });
    const tokens = Array.from(r.context.tokenMap.keys());
    const llm = `Sure, I will use ${tokens[0]} for that.`;
    const restored = dewall(llm, r.context);
    expect(restored).toBe('Sure, I will use sk_live_aaaaaaaaaa for that.');
  });

  it('handles partial restoration when some tokens absent from output', () => {
    const r = promptwall('sk_live_aaaaaaaaaa and me@example.com', { strategy: 'tokenize' });
    const tokens = Array.from(r.context.tokenMap.keys());
    const partial = `Here is the email back: ${tokens[1]}`;
    const restored = dewall(partial, r.context);
    expect(restored).toContain('me@example.com');
  });
});
