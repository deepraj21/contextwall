import { describe, expect, it, vi } from 'vitest';
import { wrapPrompt, wrapMessages } from '../src/integrations/vercel-ai.js';
import { WallRunnable, wrapRunnable } from '../src/integrations/langchain.js';
import { wrapOpenAI } from '../src/integrations/openai.js';

describe('vercel-ai integration', () => {
  it('sanitizes args.prompt', () => {
    const out = wrapPrompt({ prompt: 'sk_live_abcdef0123', model: 'm' });
    expect(out.prompt).toContain('[API_KEY]');
    expect(out.model).toBe('m');
  });

  it('sanitizes args.messages', () => {
    const out = wrapPrompt({
      messages: [{ role: 'user', content: 'me@example.com' }],
    });
    expect(out.messages?.[0]?.content).toContain('[EMAIL]');
  });

  it('wrapMessages handles plain arrays', () => {
    const out = wrapMessages([{ content: 'sk_live_abcdef0123' }]);
    expect(out[0]?.content).toContain('[API_KEY]');
  });
});

describe('langchain integration', () => {
  it('WallRunnable invoke sanitizes string input', () => {
    const wall = new WallRunnable();
    expect(wall.invoke('sk_live_abcdef0123')).toContain('[API_KEY]');
  });

  it('WallRunnable invoke sanitizes object input', () => {
    const wall = new WallRunnable();
    const out = wall.invoke({ msg: 'me@example.com' }) as { msg: string };
    expect(out.msg).toContain('[EMAIL]');
  });

  it('wrapRunnable forwards cleaned input', () => {
    const inner = { invoke: vi.fn((s: string) => s) };
    const wrapped = wrapRunnable(inner);
    wrapped.invoke('sk_live_abcdef0123');
    const arg = inner.invoke.mock.calls[0]?.[0] as string;
    expect(arg).toContain('[API_KEY]');
  });
});

describe('openai integration', () => {
  it('sanitizes messages before create()', () => {
    const create = vi.fn();
    const client = { chat: { completions: { create } } };
    const safe = wrapOpenAI(client);
    safe.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'sk_live_abcdef0123' }],
    });
    const arg = create.mock.calls[0]?.[0] as {
      messages: Array<{ content: string }>;
    };
    expect(arg.messages[0]?.content).toContain('[API_KEY]');
  });
});
