import type { WallConfig } from '../types.js';
import { schemawall } from '../core/schemawall.js';
import { runWall } from '../core/engine.js';

/**
 * Resolve a dotted path on an object. Returns `[parent, key]` so the caller
 * can write to the leaf in-place. Returns `null` when any segment is
 * missing.
 */
function resolveLeaf(
  root: unknown,
  path: string,
): { parent: Record<string, unknown>; key: string } | null {
  const parts = path.split('.');
  let current: unknown = root;
  for (let i = 0; i < parts.length - 1; i++) {
    const seg = parts[i];
    if (seg === undefined) return null;
    if (current === null || typeof current !== 'object') return null;
    current = (current as Record<string, unknown>)[seg];
  }
  const last = parts[parts.length - 1];
  if (last === undefined) return null;
  if (current === null || typeof current !== 'object') return null;
  return { parent: current as Record<string, unknown>, key: last };
}

/**
 * Sanitize the values addressed by `targets` on `root`. Mutates the leaf
 * fields only - siblings and non-targeted paths are untouched.
 */
export function sanitizeTargets(root: unknown, targets: string[], options: WallConfig): void {
  for (const target of targets) {
    const leaf = resolveLeaf(root, target);
    if (!leaf) continue;
    const value = leaf.parent[leaf.key];
    if (typeof value === 'string') {
      leaf.parent[leaf.key] = runWall(value, options).text;
    } else if (Array.isArray(value) || (value !== null && typeof value === 'object')) {
      leaf.parent[leaf.key] = schemawall(value, options);
    }
  }
}

export interface MiddlewareOptions extends WallConfig {
  /** Dotted paths into the request to sanitize (e.g. `body.prompt`). */
  target?: string[];
}

export const DEFAULT_TARGETS = ['body.prompt', 'body.messages', 'body.input', 'query.prompt'];
