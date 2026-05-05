import type { WallConfig, WallContext } from '../types.js';
import { runWall } from './engine.js';

/**
 * Sanitize an array of prompts. Each entry is processed independently so
 * detections in one prompt cannot leak into another.
 *
 * For `strategy: 'tokenize'`, returns `{ texts, contexts }` parallel arrays.
 */
export function batchwall(
  prompts: string[],
  options: WallConfig & { strategy: 'tokenize' },
): { texts: string[]; contexts: WallContext[] };
export function batchwall(prompts: string[], options?: WallConfig): string[];
export function batchwall(
  prompts: string[],
  options: WallConfig = {},
): string[] | { texts: string[]; contexts: WallContext[] } {
  if (options.strategy === 'tokenize') {
    const texts: string[] = [];
    const contexts: WallContext[] = [];
    for (const p of prompts) {
      const r = runWall(p, options);
      texts.push(r.text);
      contexts.push(r.context ?? { tokenMap: new Map(), createdAt: Date.now() });
    }
    return { texts, contexts };
  }

  const out: string[] = [];
  for (const p of prompts) out.push(runWall(p, options).text);
  return out;
}
