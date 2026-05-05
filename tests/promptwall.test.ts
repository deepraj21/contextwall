import { describe, expect, it, vi } from 'vitest';
import { promptwall, dewall } from '../src/index.js';

describe('promptwall', () => {
  it('replaces api keys with placeholder by default', () => {
    const out = promptwall('Use api key sk_live_abcdef0123 for billing');
    expect(out).toContain('[API_KEY]');
    expect(out).not.toContain('sk_live_abcdef0123');
  });

  it('does not mutate the input string', () => {
    const input = 'My token is sk_live_abcdef0123';
    const original = input;
    promptwall(input);
    expect(input).toBe(original);
  });

  it('is idempotent on already-sanitized text', () => {
    const out1 = promptwall('Send email to john@example.com');
    const out2 = promptwall(out1);
    expect(out2).toBe(out1);
  });

  it('semantic strategy returns RFC-safe fakes', () => {
    const out = promptwall('email me at real.user@acme.com', { strategy: 'semantic' });
    expect(out).toContain('user@example.com');
    expect(out).not.toContain('real.user@acme.com');
  });

  it('semantic strategy uses RFC 5737 IPv4 fake', () => {
    const out = promptwall('connect to 192.168.99.42 quickly', { strategy: 'semantic' });
    expect(out).toContain('203.0.113.1');
  });

  it('tokenize strategy returns text + context', () => {
    const result = promptwall('key sk_live_abcdef0123 inside', { strategy: 'tokenize' });
    expect(result.text).not.toContain('sk_live_abcdef0123');
    expect(result.context.tokenMap.size).toBe(1);
    const tokens = Array.from(result.context.tokenMap.keys());
    expect(tokens[0]).toMatch(/^\[API_KEYS::[a-f0-9]{8}\]$/);
  });

  it('roundtrips with dewall', () => {
    const r = promptwall('sk_live_abcdef0123 needs review', { strategy: 'tokenize' });
    const restored = dewall(r.text, r.context);
    expect(restored).toBe('sk_live_abcdef0123 needs review');
  });

  it('invokes onDetect for each match', () => {
    const fn = vi.fn();
    promptwall('sk_live_abcdef0123 and john@example.com', { onDetect: fn });
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('runs custom rules and uses custom replace string', () => {
    const out = promptwall('Employee EMP-001234 logged in', {
      customRules: [
        { name: 'EMPLOYEE_ID', pattern: /EMP-\d{6}/g, severity: 'medium', replace: '[EMPLOYEE]' },
      ],
    });
    expect(out).toBe('Employee [EMPLOYEE] logged in');
  });

  it('runs custom rules with replace function', () => {
    const out = promptwall('order ORD-12345 ready', {
      customRules: [
        {
          name: 'ORDER_ID',
          pattern: /ORD-\d+/g,
          severity: 'low',
          replace: (m) => `[REDACTED:${m.length}]`,
        },
      ],
    });
    expect(out).toBe('order [REDACTED:9] ready');
  });

  it('respects explicit detectors list', () => {
    const out = promptwall('sk_live_abcdef0123 and john@example.com', {
      detectors: ['pii_email'],
    });
    expect(out).toContain('sk_live_abcdef0123');
    expect(out).toContain('[EMAIL]');
  });

  it('returns input unchanged when no detections', () => {
    const out = promptwall('just plain words here');
    expect(out).toBe('just plain words here');
  });
});
