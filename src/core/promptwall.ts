import type { PromptWallOptions, WallContext } from '../types.js';
import { runWall } from './engine.js';

/**
 * Sanitize a prompt string.
 *
 * Default strategy is `placeholder` and returns a plain string. When
 * `strategy: 'tokenize'` is supplied, the result is `{ text, context }` so
 * that `dewall` can later restore the original values.
 */
export function promptwall(text: string, options: PromptWallOptions & { strategy: 'tokenize' }): {
  text: string;
  context: WallContext;
};
export function promptwall(text: string, options?: PromptWallOptions): string;
export function promptwall(
  text: string,
  options: PromptWallOptions = {},
): string | { text: string; context: WallContext } {
  const result = runWall(text, options);
  if (options.strategy === 'tokenize') {
    return {
      text: result.text,
      context: result.context ?? { tokenMap: new Map(), createdAt: Date.now() },
    };
  }
  return result.text;
}
