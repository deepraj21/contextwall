import type { WallConfig, WallContext } from '../types.js';
import { runWall } from './engine.js';

type Json =
  | string
  | number
  | boolean
  | null
  | undefined
  | Json[]
  | { [key: string]: Json }
  | Date
  | RegExp
  | Map<unknown, unknown>
  | Set<unknown>;

function isPlainObject(v: unknown): v is Record<string, Json> {
  if (v === null || typeof v !== 'object') return false;
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
}

/**
 * Recursively sanitize all string values inside a plain object/array.
 *
 * Preserves `Date`, `RegExp`, `Map`, `Set`, class instances - they are
 * returned by reference. Cycle-safe.
 *
 * For `strategy: 'tokenize'`, the same `WallContext` is shared across every
 * string in the structure so `dewall` can restore the entire tree.
 */
export function schemawall<T>(input: T, options?: WallConfig): T;
export function schemawall<T>(
  input: T,
  options: WallConfig & { strategy: 'tokenize' },
): { value: T; context: WallContext };
export function schemawall<T>(
  input: T,
  options: WallConfig = {},
): T | { value: T; context: WallContext } {
  const tokenizing = options.strategy === 'tokenize';
  const sharedContext: WallContext | undefined = tokenizing
    ? { tokenMap: new Map(), createdAt: Date.now() }
    : undefined;

  const seen = new WeakMap<object, unknown>();

  function walk(node: unknown): unknown {
    if (typeof node === 'string') {
      if (tokenizing && sharedContext) {
        const r = runWall(node, options);
        if (r.context) {
          for (const [k, v] of r.context.tokenMap) sharedContext.tokenMap.set(k, v);
        }
        return r.text;
      }
      return runWall(node, options).text;
    }

    if (node === null || typeof node !== 'object') return node;

    if (node instanceof Date || node instanceof RegExp) return node;
    if (node instanceof Map || node instanceof Set) return node;

    const cached = seen.get(node);
    if (cached !== undefined) return cached;

    if (Array.isArray(node)) {
      const arr: unknown[] = [];
      seen.set(node, arr);
      for (const item of node) arr.push(walk(item));
      return arr;
    }

    if (isPlainObject(node)) {
      const obj: Record<string, unknown> = {};
      seen.set(node, obj);
      for (const k of Object.keys(node)) obj[k] = walk(node[k]);
      return obj;
    }

    return node;
  }

  const out = walk(input) as T;
  if (tokenizing && sharedContext) return { value: out, context: sharedContext };
  return out;
}
