import { Transform, type TransformCallback } from 'node:stream';
import type { WallConfig } from '../types.js';
import { runWall } from '../core/engine.js';

export interface NodeStreamWallOptions extends WallConfig {
  /** Trailing chars buffered to handle secrets that span chunk boundaries. */
  lookbehind?: number;
}

/**
 * Node-classic `Transform` stream variant. Use this when piping into
 * legacy Node streams. For browser/universal code, prefer `streamwall`
 * (Web Streams) from the main entry.
 */
export function streamwallNode(options: NodeStreamWallOptions = {}): Transform {
  const lookbehind = options.lookbehind ?? 256;
  let buffer = '';
  const splitRegex = /\s|[.,;:!?()[\]{}"'`]/;

  return new Transform({
    decodeStrings: false,
    encoding: 'utf8',
    transform(chunk: Buffer | string, _enc, cb: TransformCallback) {
      buffer += typeof chunk === 'string' ? chunk : chunk.toString('utf8');
      if (buffer.length <= lookbehind) {
        cb();
        return;
      }

      const safeCutStart = Math.max(0, buffer.length - lookbehind);
      let cut = -1;
      for (let i = safeCutStart; i >= 0; i--) {
        if (splitRegex.test(buffer.charAt(i))) {
          cut = i + 1;
          break;
        }
      }
      if (cut <= 0) {
        cb();
        return;
      }

      const flushable = buffer.slice(0, cut);
      buffer = buffer.slice(cut);
      const sanitized = runWall(flushable, options).text;
      cb(null, sanitized);
    },
    flush(cb: TransformCallback) {
      if (buffer.length === 0) {
        cb();
        return;
      }
      const sanitized = runWall(buffer, options).text;
      buffer = '';
      cb(null, sanitized);
    },
  });
}
