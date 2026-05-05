import type { CustomRule, DetectionMatch, DetectorName } from '../types.js';
import { detectByPattern, PATTERN_DETECTOR_IDS } from './patterns.js';
import { detectHighEntropy } from './entropy.js';
import { runCustomRules } from './custom.js';

/**
 * The full list of built-in detectors.
 */
export const ALL_DETECTORS: DetectorName[] = [
  'private_key',
  'jwt',
  'connection_string',
  'api_keys',
  'bearer_tokens',
  'pii_email',
  'pii_phone',
  'pii_ssn',
  'pii_credit_card',
  'ip_address',
  'env_variable',
  'high_entropy',
];

/**
 * Default detector set.
 *
 * In non-strict mode, `high_entropy` is excluded (opt-in only - high false
 * positive risk).
 */
export function defaultDetectorSet(strict: boolean): DetectorName[] {
  return strict ? [...ALL_DETECTORS] : ALL_DETECTORS.filter((d) => d !== 'high_entropy');
}

function detectOne(text: string, name: DetectorName, strict: boolean): DetectionMatch[] {
  if (name === 'high_entropy') {
    if (!strict) return [];
    return detectHighEntropy(text);
  }
  if (PATTERN_DETECTOR_IDS.includes(name)) return detectByPattern(text, name);
  return [];
}

/**
 * Run all selected detectors against `text` and return raw matches.
 *
 * `strict` is forwarded so that an explicitly-requested `high_entropy`
 * detection still runs without strict mode being globally on - we honor any
 * explicit listing.
 */
export function runDetectors(
  text: string,
  detectors: DetectorName[],
  customRules: CustomRule[],
  strict: boolean,
): DetectionMatch[] {
  const out: DetectionMatch[] = [];
  for (const name of detectors) {
    if (name === 'high_entropy') {
      const explicit = detectors.includes('high_entropy');
      const shouldRun = strict || explicit;
      if (shouldRun) out.push(...detectHighEntropy(text));
      continue;
    }
    out.push(...detectOne(text, name, strict));
  }
  if (customRules.length > 0) out.push(...runCustomRules(text, customRules));
  return out;
}

export { detectByPattern, detectHighEntropy, runCustomRules };
