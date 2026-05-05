import type { IncomingMessage, ServerResponse } from 'node:http';
import { wallMiddleware } from '../src/middleware/index.js';

const middleware = wallMiddleware({
  target: ['body.prompt', 'body.messages'],
});

const req = {
  body: { prompt: 'sk_live_abcdef0123', messages: [{ content: 'john@example.com' }] },
} as unknown as IncomingMessage & { body: unknown };

const res = {} as ServerResponse;

middleware(
  req as unknown as { body?: unknown; query?: unknown; headers?: unknown },
  res,
  (err?: unknown) => {
    if (err) {
      console.error(err);
      return;
    }
    console.log('sanitized request:', (req as unknown as { body: unknown }).body);
  },
);
