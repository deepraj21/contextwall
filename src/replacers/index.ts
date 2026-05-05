import type { Replacer, ReplacementStrategy } from '../types.js';
import { placeholderReplacer } from './placeholder.js';
import { semanticReplacer } from './semantic.js';
import { tokenizerReplacer } from './tokenizer.js';

const REGISTRY: Record<ReplacementStrategy, Replacer> = {
  placeholder: placeholderReplacer,
  semantic: semanticReplacer,
  tokenize: tokenizerReplacer,
};

export function getReplacer(strategy: ReplacementStrategy): Replacer {
  return REGISTRY[strategy];
}

export { placeholderReplacer, semanticReplacer, tokenizerReplacer };
