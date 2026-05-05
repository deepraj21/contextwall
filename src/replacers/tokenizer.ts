import type { DetectionMatch, Replacer, WallContext } from '../types.js';

/**
 * Generate a short random id. Prefers `crypto.randomUUID()` (Node 18+ and
 * modern browsers); falls back to a Math.random-based id only as a last
 * resort. The fallback is fine here because tokens are not security
 * primitives - they only need to be locally unique within a single sanitize
 * call.
 */
function shortId(): string {
  try {
    const g: unknown = globalThis;
    const c = (g as { crypto?: { randomUUID?: () => string } }).crypto;
    if (c?.randomUUID) {
      return c.randomUUID().replace(/-/g, '').slice(0, 8);
    }
  } catch {
    // fall through
  }
  let s = '';
  for (let i = 0; i < 8; i++) {
    s += Math.floor(Math.random() * 16).toString(16);
  }
  return s;
}

function tokenLabel(type: string): string {
  return type.toUpperCase();
}

export const tokenizerReplacer: Replacer = {
  strategy: 'tokenize',
  replace: (m: DetectionMatch, context?: WallContext): string => {
    const id = shortId();
    const token = `[${tokenLabel(String(m.type))}::${id}]`;
    if (context) context.tokenMap.set(token, m.value);
    return token;
  },
};
