import { wrapPrompt } from '../src/integrations/vercel-ai.js';

const args = {
  model: 'gpt-4o-mini',
  prompt: 'Use sk_live_abcdef0123 and email john@example.com',
};

const safeArgs = wrapPrompt(args);
console.log(safeArgs);

// Use with real SDK call:
// const result = await generateText(safeArgs);
