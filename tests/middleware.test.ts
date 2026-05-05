import { describe, expect, it, vi } from 'vitest';
import {
  wallMiddleware,
  honoWallMiddleware,
  withWall,
  sanitizeAppRouterBody,
  sanitizeTargets,
} from '../src/middleware/index.js';

describe('Express wallMiddleware', () => {
  it('sanitizes body.prompt', async () => {
    const req = { body: { prompt: 'use sk_live_abcdef0123' } };
    const next = vi.fn();
    wallMiddleware({ target: ['body.prompt'] })(req, {}, next);
    expect(req.body.prompt).toContain('[API_KEY]');
    expect(next).toHaveBeenCalledWith();
  });

  it('leaves untargeted fields alone', () => {
    const req = {
      body: { prompt: 'sk_live_abcdef0123', other: 'sk_live_aaaaaaaaaa' },
    };
    wallMiddleware({ target: ['body.prompt'] })(req, {}, vi.fn());
    expect(req.body.other).toBe('sk_live_aaaaaaaaaa');
  });

  it('handles missing fields gracefully', () => {
    const req = { body: undefined };
    const next = vi.fn();
    wallMiddleware({ target: ['body.prompt'] })(req, {}, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('sanitizes nested message arrays', () => {
    const req = {
      body: {
        messages: [
          { role: 'user', content: 'sk_live_abcdef0123' },
          { role: 'assistant', content: 'plain' },
        ],
      },
    };
    wallMiddleware({ target: ['body.messages'] })(req, {}, vi.fn());
    expect(req.body.messages[0]?.content).toContain('[API_KEY]');
    expect(req.body.messages[1]?.content).toBe('plain');
  });
});

describe('Hono middleware', () => {
  it('sanitizes JSON body and stores under sanitizedBody', async () => {
    const stored: Record<string, unknown> = {};
    const ctx = {
      req: {
        json: async () => ({ prompt: 'sk_live_abcdef0123' }),
      },
      set: (k: string, v: unknown) => {
        stored[k] = v;
      },
    };
    const mw = honoWallMiddleware({ target: ['prompt'] });
    await mw(ctx, async () => {});
    expect(stored.sanitizedBody).toEqual({ prompt: expect.stringContaining('[API_KEY]') });
  });
});

describe('Next.js withWall', () => {
  it('sanitizes req.body before invoking handler', async () => {
    const handler = vi.fn(async (req: { body: { prompt: string } }) => req.body.prompt);
    const wrapped = withWall(handler, { target: ['body.prompt'] });
    const req = { body: { prompt: 'sk_live_abcdef0123' } };
    const result = await wrapped(req, {});
    expect(result).toContain('[API_KEY]');
  });

  it('sanitizeAppRouterBody returns a clean body', async () => {
    const request = { json: async () => ({ prompt: 'sk_live_abcdef0123' }) };
    const out = (await sanitizeAppRouterBody(request, { target: ['prompt'] })) as {
      prompt: string;
    };
    expect(out.prompt).toContain('[API_KEY]');
  });
});

describe('sanitizeTargets', () => {
  it('returns silently on missing nested path', () => {
    const root: Record<string, unknown> = {};
    sanitizeTargets(root, ['body.prompt'], {});
    expect(root).toEqual({});
  });
});
