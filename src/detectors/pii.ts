import type { DetectionMatch, DetectorName } from '../types.js';
import { detectByPattern } from './patterns.js';

/**
 * PII detector group. Each PII detector is implemented as a pattern in
 * `patterns.ts`; this module groups them for convenience.
 */
export const PII_DETECTORS: DetectorName[] = [
  'pii_email',
  'pii_phone',
  'pii_ssn',
  'pii_credit_card',
];

export function detectPii(text: string): DetectionMatch[] {
  const out: DetectionMatch[] = [];
  for (const id of PII_DETECTORS) out.push(...detectByPattern(text, id));
  return out;
}
