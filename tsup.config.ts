import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'middleware/index': 'src/middleware/index.ts',
    'integrations/vercel-ai': 'src/integrations/vercel-ai.ts',
    'integrations/langchain': 'src/integrations/langchain.ts',
    'integrations/openai': 'src/integrations/openai.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  target: 'es2022',
  outExtension({ format }) {
    return {
      js: format === 'cjs' ? '.cjs' : '.mjs',
    };
  },
});
