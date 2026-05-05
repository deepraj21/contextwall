import type { WallConfig, WallContext } from '../types.js';
import { runWall } from './engine.js';

/**
 * Factory that returns a pre-configured sanitizer.
 *
 * The returned function inherits the closed-over config but accepts
 * per-call overrides. Use this to define team-wide standardized walls.
 */
export interface ConfiguredWall {
  (text: string): string | { text: string; context: WallContext };
  (text: string, override: WallConfig): string | { text: string; context: WallContext };
}

export function createwall(config: WallConfig = {}): ConfiguredWall {
  function call(
    text: string,
    override?: WallConfig,
  ): string | { text: string; context: WallContext } {
    const merged: WallConfig = { ...config, ...(override ?? {}) };
    const result = runWall(text, merged);
    if (merged.strategy === 'tokenize') {
      return {
        text: result.text,
        context: result.context ?? { tokenMap: new Map(), createdAt: Date.now() },
      };
    }
    return result.text;
  }
  return call as ConfiguredWall;
}
