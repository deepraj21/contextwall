import { describe, expect, it } from 'vitest';
import { auditwall } from '../src/index.js';

describe('auditwall', () => {
  it('returns detections without modifying original', () => {
    const text = 'Use sk_live_abcdef0123 with email me@example.com';
    const report = auditwall(text);
    expect(report.original).toBe(text);
    expect(report.detections.length).toBe(2);
  });

  it('produces a sanitized preview', () => {
    const r = auditwall('sk_live_abcdef0123');
    expect(r.sanitized).toContain('[API_KEY]');
  });

  it('riskScore reflects severity weights', () => {
    const r = auditwall('sk_live_abcdef0123 me@example.com');
    expect(r.riskScore).toBeGreaterThanOrEqual(40);
    expect(r.riskScore).toBeLessThanOrEqual(100);
  });

  it('riskScore is 0 for clean text', () => {
    expect(auditwall('hello world').riskScore).toBe(0);
  });

  it('riskScore caps at 100', () => {
    const lots = Array.from({ length: 30 }, (_, i) => `sk_live_${'a'.repeat(8)}${i}`).join(' ');
    expect(auditwall(lots).riskScore).toBe(100);
  });

  it('reports detectorsCalled', () => {
    const r = auditwall('hello');
    expect(r.detectorsCalled.length).toBeGreaterThan(0);
    expect(r.detectorsCalled).not.toContain('high_entropy');
  });

  it('includes high_entropy in detectorsCalled when strict', () => {
    const r = auditwall('hello', { strict: true });
    expect(r.detectorsCalled).toContain('high_entropy');
  });
});
