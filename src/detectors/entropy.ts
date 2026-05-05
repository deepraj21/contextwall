import type { DetectionMatch } from '../types.js';

/**
 * Compute Shannon entropy in bits per character.
 */
export function shannonEntropy(s: string): number {
  if (s.length === 0) return 0;
  const freq = new Map<string, number>();
  for (const ch of s) freq.set(ch, (freq.get(ch) ?? 0) + 1);
  let h = 0;
  for (const c of freq.values()) {
    const p = c / s.length;
    h -= p * Math.log2(p);
  }
  return h;
}

const TOKEN_REGEX = /[A-Za-z0-9_+/=-]+/g;
const MIN_TOKEN_LEN = 16;
const MIN_ENTROPY = 4.5;

/**
 * Scan text for high-entropy tokens. Opt-in (only runs when strict=true or when
 * `high_entropy` is explicitly listed in the detectors array).
 */
export function detectHighEntropy(text: string): DetectionMatch[] {
  const out: DetectionMatch[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(TOKEN_REGEX.source, TOKEN_REGEX.flags);
  while ((m = re.exec(text)) !== null) {
    const value = m[0];
    if (value.length < MIN_TOKEN_LEN) continue;
    const h = shannonEntropy(value);
    if (h <= MIN_ENTROPY) continue;
    out.push({
      type: 'high_entropy',
      value,
      start: m.index,
      end: m.index + value.length,
      severity: 'medium',
    });
  }
  return out;
}
