import { sanitizeTargets, DEFAULT_TARGETS, type MiddlewareOptions } from './path.js';

/**
 * Minimal Hono context shape. Structural type only - no `hono` import.
 */
interface HonoLikeContext {
  req: {
    json?: () => Promise<unknown>;
    query?: () => Record<string, unknown>;
    header?: () => Record<string, unknown>;
  };
  set?: (key: string, value: unknown) => void;
}

export type HonoWallMiddleware = (
  c: HonoLikeContext,
  next: () => Promise<void>,
) => Promise<void>;

/**
 * Hono-compatible middleware. Reads the JSON body, sanitizes selected
 * paths, and stores the cleaned object on the context under
 * `c.set('sanitizedBody', ...)`. Downstream handlers should read from
 * there instead of calling `c.req.json()` again.
 */
export function honoWallMiddleware(options: MiddlewareOptions = {}): HonoWallMiddleware {
  const { target = DEFAULT_TARGETS, ...config } = options;
  return async (c, next) => {
    if (typeof c.req.json === 'function') {
      try {
        const body = await c.req.json();
        const wrapper: { body: unknown } = { body };
        sanitizeTargets(
          wrapper,
          target.map((t) => (t.startsWith('body.') ? t : `body.${t}`)),
          config,
        );
        if (c.set) c.set('sanitizedBody', wrapper.body);
      } catch {
        // body may not be JSON; ignore
      }
    }
    await next();
  };
}
