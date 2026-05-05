import { schemawall } from '../core/schemawall.js';
import type { WallConfig } from '../types.js';

/**
 * Minimal duck-typed slice of the OpenAI SDK. Structural - no `openai`
 * import.
 */
interface OpenAILike {
  chat: {
    completions: {
      create: (args: unknown) => unknown;
    };
  };
}

/**
 * Wrap an OpenAI client so `chat.completions.create` sanitizes the
 * `messages` payload (and any other top-level string fields) before the
 * request goes out.
 *
 *   const safe = wrapOpenAI(client);
 *   safe.chat.completions.create({ model, messages });
 */
export function wrapOpenAI<T extends OpenAILike>(client: T, options: WallConfig = {}): T {
  const original = client.chat.completions.create.bind(client.chat.completions);
  const wrapped: OpenAILike = {
    ...client,
    chat: {
      ...client.chat,
      completions: {
        ...client.chat.completions,
        create: (args: unknown) => {
          const cleaned = schemawall(args, options);
          return original(cleaned);
        },
      },
    },
  };
  return wrapped as T;
}
