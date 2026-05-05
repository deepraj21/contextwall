import { describe, expect, it } from 'vitest';
import { createwall, dewall } from '../src/index.js';

describe('createwall', () => {
  it('returns a function with closed-over config', () => {
    const wall = createwall({ strategy: 'placeholder' });
    const out = wall('email me@example.com');
    expect(out).toContain('[EMAIL]');
  });

  it('inherits custom rules', () => {
    const wall = createwall({
      customRules: [
        { name: 'EMP_ID', pattern: /EMP-\d{6}/g, severity: 'medium', replace: '[EMP]' },
      ],
    });
    expect(wall('id EMP-001234')).toBe('id [EMP]');
  });

  it('returns text+context when configured to tokenize', () => {
    const wall = createwall({ strategy: 'tokenize' });
    const result = wall('sk_live_abcdef0123');
    if (typeof result === 'string') {
      throw new Error('expected tokenize object');
    }
    expect(result.context.tokenMap.size).toBe(1);
    expect(dewall(result.text, result.context)).toBe('sk_live_abcdef0123');
  });
});
