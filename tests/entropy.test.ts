import { describe, expect, it } from 'vitest';
import { promptwall } from '../src/index.js';
import { detectHighEntropy, shannonEntropy } from '../src/detectors/entropy.js';

describe('entropy detector', () => {
  it('computes Shannon entropy', () => {
    expect(shannonEntropy('aaaa')).toBe(0);
    expect(shannonEntropy('')).toBe(0);
    expect(shannonEntropy('abcd')).toBeGreaterThan(1.9);
  });

  it('flags high-entropy hex/base64-ish strings', () => {
    const matches = detectHighEntropy(
      'token=Z3Vlc3M9MTIzNDU2Nzg5MGFiY2RlZmdoaWprbG1u',
    );
    expect(matches.length).toBeGreaterThan(0);
  });

  it('does not flag English prose', () => {
    const matches = detectHighEntropy('The quick brown fox jumps over the lazy dog');
    expect(matches.length).toBe(0);
  });

  it('high_entropy is OFF by default in non-strict mode', () => {
    const random = 'X9aGq2VkPmL7tNcF8eRyZBwJsT4uHd0';
    const out = promptwall(`token=${random}`);
    expect(out).toContain(random);
  });

  it('high_entropy ON in strict mode', () => {
    const random = 'X9aGq2VkPmL7tNcF8eRyZBwJsT4uHd0';
    const out = promptwall(`token=${random}`, { strict: true });
    expect(out).not.toContain(random);
    expect(out).toContain('[SECRET]');
  });

  it('high_entropy runs when explicitly listed', () => {
    const random = 'X9aGq2VkPmL7tNcF8eRyZBwJsT4uHd0';
    const out = promptwall(`token=${random}`, { detectors: ['high_entropy'] });
    expect(out).not.toContain(random);
  });
});
