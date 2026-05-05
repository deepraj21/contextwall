import type { DetectionEvent, WallConfig } from '../types.js';
import { runWall } from './engine.js';

export interface LogWallOptions extends WallConfig {
  logger?: (event: DetectionEvent) => void;
}

/**
 * Sanitize and emit a structured log entry for every detection event.
 *
 * The logger defaults to a no-op so this function never leaks secrets to
 * stdout/stderr unless the caller explicitly wires it up.
 */
export function logwall(text: string, options: LogWallOptions = {}): string {
  const { logger, ...rest } = options;
  const merged: WallConfig = {
    ...rest,
    onDetect: (ev) => {
      if (logger) logger(ev);
      if (rest.onDetect) rest.onDetect(ev);
    },
  };
  return runWall(text, merged).text;
}
