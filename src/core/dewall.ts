import type { WallContext } from '../types.js';

/**
 * Restore tokenized values back into LLM output. Iterates the context's
 * token map, replacing all occurrences of each token with the original
 * value. No-op when the map is empty.
 *
 * Idempotent and pure: never mutates the input string or the context.
 */
export function dewall(text: string, context: WallContext): string {
  if (!context || context.tokenMap.size === 0) return text;

  const tokens = Array.from(context.tokenMap.keys()).sort((a, b) => b.length - a.length);

  let out = text;
  for (const token of tokens) {
    const original = context.tokenMap.get(token);
    if (original === undefined) continue;
    out = out.split(token).join(original);
  }
  return out;
}
