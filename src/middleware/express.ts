import { sanitizeTargets, DEFAULT_TARGETS, type MiddlewareOptions } from './path.js';

/**
 * Minimal Express request shape. We use a structural type so the package
 * has no runtime dependency on `express`.
 */
interface ExpressLikeRequest {
  body?: unknown;
  query?: unknown;
  headers?: unknown;
}

type NextFn = (err?: unknown) => void;

export type ExpressWallMiddleware = (
  req: ExpressLikeRequest,
  res: unknown,
  next: NextFn,
) => void;

/**
 * Express-compatible middleware that sanitizes selected request fields
 * before downstream handlers run.
 *
 *   app.use('/api/chat', wallMiddleware({ target: ['body.prompt'] }))
 */
export function wallMiddleware(options: MiddlewareOptions = {}): ExpressWallMiddleware {
  const { target = DEFAULT_TARGETS, ...config } = options;
  return (req, _res, next) => {
    try {
      sanitizeTargets(req, target, config);
      next();
    } catch (err) {
      next(err);
    }
  };
}
