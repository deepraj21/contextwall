import type { DetectionMatch, DetectorName, Severity } from '../types.js';

interface PatternEntry {
  id: DetectorName;
  severity: Severity;
  regex: RegExp;
  validator?: (value: string) => boolean;
}

/**
 * Validate a string of digits with the Luhn algorithm.
 */
export function isLuhnValid(input: string): boolean {
  const digits = input.replace(/\D/g, '');
  if (digits.length < 12 || digits.length > 19) return false;
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    const ch = digits.charAt(i);
    let n = Number(ch);
    if (Number.isNaN(n)) return false;
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

/**
 * Validate IPv4 address by octet range (0-255).
 */
export function isValidIpv4(input: string): boolean {
  const parts = input.split('.');
  if (parts.length !== 4) return false;
  for (const p of parts) {
    if (!/^\d{1,3}$/.test(p)) return false;
    const n = Number(p);
    if (Number.isNaN(n) || n < 0 || n > 255) return false;
    if (p.length > 1 && p.startsWith('0')) return false;
  }
  return true;
}

/**
 * Validate JWT shape: 3 base64url segments separated by dots, header decodes
 * to JSON with a `typ` or `alg` field.
 */
export function isJwtShape(input: string): boolean {
  const parts = input.split('.');
  if (parts.length !== 3) return false;
  const [h, p, s] = parts;
  if (!h || !p || !s) return false;
  if (!/^[A-Za-z0-9_-]+$/.test(h)) return false;
  if (!/^[A-Za-z0-9_-]+$/.test(p)) return false;
  if (!/^[A-Za-z0-9_-]+$/.test(s)) return false;
  try {
    const padded = h.replace(/-/g, '+').replace(/_/g, '/');
    const decoded =
      typeof atob === 'function'
        ? atob(padded + '='.repeat((4 - (padded.length % 4)) % 4))
        : Buffer.from(padded, 'base64').toString('utf8');
    const obj = JSON.parse(decoded) as Record<string, unknown>;
    return typeof obj === 'object' && obj !== null && ('alg' in obj || 'typ' in obj);
  } catch {
    return false;
  }
}

const PATTERNS: PatternEntry[] = [
  {
    id: 'private_key',
    severity: 'critical',
    regex:
      /-----BEGIN (?:RSA |DSA |EC |OPENSSH |PGP |ENCRYPTED )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |DSA |EC |OPENSSH |PGP |ENCRYPTED )?PRIVATE KEY-----/g,
  },

  {
    id: 'jwt',
    severity: 'high',
    regex: /eyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}/g,
    validator: isJwtShape,
  },

  {
    id: 'connection_string',
    severity: 'critical',
    regex: /\b(?:mongodb(?:\+srv)?|postgres(?:ql)?|mysql|redis|amqp|amqps):\/\/[^\s"'<>]+/gi,
  },

  {
    id: 'api_keys',
    severity: 'critical',
    regex:
      /\b(?:sk|rsk|pk)_(?:live|test|prod)_[A-Za-z0-9]{8,}|\bAKIA[0-9A-Z]{16}\b|\bASIA[0-9A-Z]{16}\b|\bAIza[0-9A-Za-z_-]{35}\b|\bya29\.[0-9A-Za-z_-]+\b|\bhf_[A-Za-z0-9]{20,}\b|\bghp_[A-Za-z0-9]{36}\b|\bgho_[A-Za-z0-9]{36}\b|\bglpat-[A-Za-z0-9_-]{20}\b|\bxox[abpr]-[A-Za-z0-9-]{10,}\b/g,
  },

  {
    id: 'bearer_tokens',
    severity: 'high',
    regex: /\bBearer\s+[A-Za-z0-9._~+/=-]{16,}/g,
  },

  {
    id: 'pii_email',
    severity: 'medium',
    regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,24}\b/g,
  },

  {
    id: 'pii_phone',
    severity: 'medium',
    regex:
      /(?:\+?\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b|\+\d{1,3}[\s.-]?\d{1,4}[\s.-]?\d{1,4}[\s.-]?\d{1,9}/g,
  },

  {
    id: 'pii_ssn',
    severity: 'high',
    regex: /\b(?!000|666|9\d{2})\d{3}-(?!00)\d{2}-(?!0000)\d{4}\b/g,
  },

  {
    id: 'pii_credit_card',
    severity: 'critical',
    regex: /\b(?:\d[ -]?){13,19}\b/g,
    validator: isLuhnValid,
  },

  {
    id: 'ip_address',
    severity: 'low',
    regex:
      /\b(?:\d{1,3}\.){3}\d{1,3}\b|(?<![A-Za-z0-9:])(?:(?:[A-Fa-f0-9]{1,4}:){7}[A-Fa-f0-9]{1,4}|(?:[A-Fa-f0-9]{1,4}:){1,7}:|(?:[A-Fa-f0-9]{1,4}:){1,6}:[A-Fa-f0-9]{1,4}|::1)(?![A-Za-z0-9:])/g,
    validator: (v) => (v.includes('.') ? isValidIpv4(v) : true),
  },

  {
    id: 'env_variable',
    severity: 'high',
    regex:
      /\bprocess\.env\.[A-Z_][A-Z0-9_]*\s*=\s*["'][^"'\n]+["']|\b[A-Z_][A-Z0-9_]{2,}=["'][^"'\n]+["']/g,
  },
];

/**
 * Run a single built-in pattern detector by id.
 */
export function detectByPattern(text: string, id: DetectorName): DetectionMatch[] {
  const entry = PATTERNS.find((p) => p.id === id);
  if (!entry) return [];

  const re = new RegExp(entry.regex.source, entry.regex.flags);
  const out: DetectionMatch[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const value = m[0];
    if (m.index === re.lastIndex) re.lastIndex++;
    if (entry.validator && !entry.validator(value)) continue;
    out.push({
      type: entry.id,
      value,
      start: m.index,
      end: m.index + value.length,
      severity: entry.severity,
    });
  }
  return out;
}

export const PATTERN_DETECTOR_IDS: DetectorName[] = PATTERNS.map((p) => p.id);
