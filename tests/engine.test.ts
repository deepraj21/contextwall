import { describe, expect, it } from 'vitest';
import { resolveOverlaps, computeRiskScore } from '../src/core/engine.js';

describe('resolveOverlaps', () => {
  it('keeps a single match unchanged', () => {
    const m = { type: 'a', value: 'x', start: 0, end: 1, severity: 'low' as const };
    expect(resolveOverlaps([m])).toEqual([m]);
  });

  it('drops nested overlaps preferring the longest', () => {
    const long = { type: 'a', value: 'longvalue', start: 0, end: 9, severity: 'medium' as const };
    const short = { type: 'b', value: 'long', start: 0, end: 4, severity: 'medium' as const };
    const kept = resolveOverlaps([short, long]);
    expect(kept).toEqual([long]);
  });

  it('breaks length ties by severity', () => {
    const lo = { type: 'a', value: 'abcd', start: 0, end: 4, severity: 'low' as const };
    const hi = { type: 'b', value: 'abcd', start: 0, end: 4, severity: 'critical' as const };
    const kept = resolveOverlaps([lo, hi]);
    expect(kept[0]?.severity).toBe('critical');
  });

  it('keeps non-overlapping matches', () => {
    const a = { type: 'a', value: 'x', start: 0, end: 1, severity: 'low' as const };
    const b = { type: 'b', value: 'y', start: 2, end: 3, severity: 'low' as const };
    expect(resolveOverlaps([a, b]).length).toBe(2);
  });
});

describe('computeRiskScore', () => {
  it('is 0 with no detections', () => {
    expect(computeRiskScore([])).toBe(0);
  });

  it('sums severity weights', () => {
    const score = computeRiskScore([
      { type: 't', value: 'v', start: 0, end: 1, severity: 'critical' },
      { type: 't', value: 'v', start: 1, end: 2, severity: 'medium' },
    ]);
    expect(score).toBe(40);
  });
});
