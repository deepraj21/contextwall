import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { policywall, WallPolicyError } from '../src/index.js';

describe('policywall', () => {
  it('throws WallPolicyError on block', () => {
    expect(() =>
      policywall('key sk_live_abcdef0123', { api_keys: 'block', default: 'redact' }),
    ).toThrowError(WallPolicyError);
  });

  it('error includes the offending detections', () => {
    try {
      policywall('key sk_live_abcdef0123', { api_keys: 'block', default: 'redact' });
      expect.fail('should have thrown');
    } catch (e) {
      const err = e as WallPolicyError;
      expect(err.detections.length).toBe(1);
      expect(err.detections[0]?.type).toBe('api_keys');
    }
  });

  it('redacts when policy is redact', () => {
    const out = policywall('email me@example.com', {
      pii_email: 'redact',
      default: 'redact',
    });
    expect(out).toContain('[EMAIL]');
  });

  describe('warn', () => {
    let warn: ReturnType<typeof vi.spyOn>;
    beforeEach(() => {
      warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    });
    afterEach(() => {
      warn.mockRestore();
    });

    it('warns and leaves value in place', () => {
      const out = policywall('email me@example.com', {
        pii_email: 'warn',
        default: 'redact',
      });
      expect(out).toContain('me@example.com');
      expect(warn).toHaveBeenCalled();
    });
  });

  it('uses default action when type-specific policy missing', () => {
    const out = policywall('email me@example.com', { default: 'redact' });
    expect(out).toContain('[EMAIL]');
  });
});
