import { promptwall } from '../core/promptwall.js';
import { schemawall } from '../core/schemawall.js';
import type { WallConfig } from '../types.js';

/**
 * Minimal Runnable shape (LangChain duck type). Structural - no `langchain`
 * import.
 */
interface RunnableLike<I, O> {
  invoke: (input: I) => Promise<O> | O;
}

/**
 * A `Runnable`-shaped wrapper that sanitizes its input before delegating.
 *
 *   const wall = new WallRunnable();
 *   const chain = wall.pipe(model);   // or compose manually
 */
export class WallRunnable<I> implements RunnableLike<I, I> {
  private readonly options: WallConfig;

  constructor(options: WallConfig = {}) {
    this.options = options;
  }

  invoke(input: I): I {
    if (typeof input === 'string') {
      return promptwall(input, this.options) as unknown as I;
    }
    return schemawall(input, this.options);
  }
}

/**
 * Wrap any Runnable so its input is sanitized before being passed in.
 */
export function wrapRunnable<I, O>(
  runnable: RunnableLike<I, O>,
  options: WallConfig = {},
): RunnableLike<I, O> {
  return {
    invoke: (input: I) => {
      const cleaned =
        typeof input === 'string'
          ? (promptwall(input, options) as unknown as I)
          : schemawall(input, options);
      return runnable.invoke(cleaned);
    },
  };
}
