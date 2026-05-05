import { sanitizeTargets, DEFAULT_TARGETS, type MiddlewareOptions } from './path.js';

/**
 * Pages-router style request/response shapes (NextApiRequest-like).
 * Structural - no `next` import.
 */
interface NextApiLikeRequest {
  body?: unknown;
  query?: unknown;
  headers?: unknown;
}

type NextApiHandler = (req: NextApiLikeRequest, res: unknown) => unknown | Promise<unknown>;

/**
 * Wrap a Next.js Pages-router API handler so its `req.body` and other
 * configured paths are sanitized before the handler runs.
 *
 *   export default withWall(handler, { target: ['body.prompt'] });
 */
export function withWall(handler: NextApiHandler, options: MiddlewareOptions = {}): NextApiHandler {
  const { target = DEFAULT_TARGETS, ...config } = options;
  return async (req, res) => {
    sanitizeTargets(req, target, config);
    return handler(req, res);
  };
}

/**
 * App-router style. The Web `Request` body cannot be mutated in place, so
 * this helper reads the JSON body, sanitizes it, and returns a new
 * `{ sanitizedBody }` for the caller to use.
 */
export async function sanitizeAppRouterBody(
  request: { json: () => Promise<unknown> },
  options: MiddlewareOptions = {},
): Promise<unknown> {
  const { target = ['body'], ...config } = options;
  const body = await request.json();
  const wrapper: { body: unknown } = { body };
  sanitizeTargets(
    wrapper,
    target.map((t) => (t.startsWith('body') ? t : `body.${t}`)),
    config,
  );
  return wrapper.body;
}
