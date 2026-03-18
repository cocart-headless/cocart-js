import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    'adapters/astro':    'src/adapters/astro/index.ts',
    'adapters/nextjs':   'src/adapters/nextjs/index.ts',
    'adapters/deno':     'src/adapters/deno/index.ts',
    'adapters/nuxt':     'src/adapters/nuxt/index.ts',
    'adapters/remix':    'src/adapters/remix/index.ts',
    'adapters/svelte':   'src/adapters/svelte/index.ts',
    'adapters/elysiajs': 'src/adapters/elysiajs/index.ts',
    'adapters/fastify':  'src/adapters/fastify/index.ts',
    'adapters/hono':     'src/adapters/hono/index.ts',
    'adapters/vite':     'src/adapters/vite/index.ts',
  },
  format: ['esm'],
  dts: true,
  sourcemap: true,
  outDir: 'dist',
  external: ['@cocart/sdk'],
});
