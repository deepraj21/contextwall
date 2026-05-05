import { promptwall } from '../core/promptwall.js';
import { schemawall } from '../core/schemawall.js';
import type { WallConfig } from '../types.js';

interface PromptArgs {
  prompt?: string;
  messages?: Array<{ role: string; content: unknown }>;
  [key: string]: unknown;
}

/**
 * Sanitize the `prompt`/`messages` fields on Vercel AI SDK call arguments
 * before forwarding them to `generateText` / `streamText`.
 *
 *   const clean = wrapPrompt({ prompt: '...' });
 *   await generateText({ model, ...clean });
 */
export function wrapPrompt<T extends PromptArgs>(args: T, options: WallConfig = {}): T {
  const out: PromptArgs = { ...args };
  if (typeof out.prompt === 'string') {
    out.prompt = promptwall(out.prompt, options);
  }
  if (Array.isArray(out.messages)) {
    out.messages = schemawall(out.messages, options);
  }
  return out as T;
}

/**
 * Convenience for callers who only want to sanitize `messages`.
 */
export function wrapMessages<M>(messages: M, options: WallConfig = {}): M {
  return schemawall(messages, options);
}
