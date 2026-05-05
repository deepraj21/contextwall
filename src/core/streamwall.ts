import type { WallConfig } from '../types.js';
import { runWall } from './engine.js';

export interface StreamWallOptions extends WallConfig {
  /**
   * Number of trailing characters to hold back from each chunk so secrets
   * straddling chunk boundaries are not split. Default 256.
   */
  lookbehind?: number;
}

/**
 * Web Streams Transform that sanitizes string chunks. Works in both Node 18+
 * and modern browsers since Web Streams are now universal.
 *
 * The transform buffers up to `lookbehind` characters of trailing input so
 * secrets that span chunk boundaries are not missed.
 */
export function streamwall(options: StreamWallOptions = {}): TransformStream<string, string> {
  const lookbehind = options.lookbehind ?? 256;
  let buffer = '';
  const splitRegex = /\s|[.,;:!?()[\]{}"'`]/;

  return new TransformStream<string, string>({
    transform(chunk, controller) {
      buffer += chunk;
      if (buffer.length <= lookbehind) return;

      const safeCutStart = Math.max(0, buffer.length - lookbehind);
      let cut = -1;
      for (let i = safeCutStart; i >= 0; i--) {
        if (splitRegex.test(buffer.charAt(i))) {
          cut = i + 1;
          break;
        }
      }
      if (cut <= 0) return;

      const flushable = buffer.slice(0, cut);
      buffer = buffer.slice(cut);
      const sanitized = runWall(flushable, options).text;
      controller.enqueue(sanitized);
    },
    flush(controller) {
      if (buffer.length === 0) return;
      const sanitized = runWall(buffer, options).text;
      controller.enqueue(sanitized);
      buffer = '';
    },
  });
}
