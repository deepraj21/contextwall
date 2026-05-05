import { describe, expect, it } from 'vitest';
import { detectPii } from '../src/detectors/pii.js';

describe('pii detector group', () => {
  it('detects all grouped pii detectors', () => {
    const input = 'john@example.com +1-415-555-0123 ssn 123-45-6789 card 4111 1111 1111 1111';
    const types = detectPii(input).map((m) => m.type);
    expect(types).toContain('pii_email');
    expect(types).toContain('pii_phone');
    expect(types).toContain('pii_ssn');
    expect(types).toContain('pii_credit_card');
  });

  it('returns empty when no pii present', () => {
    expect(detectPii('plain sentence only')).toEqual([]);
  });
});
