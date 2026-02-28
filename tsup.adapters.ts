import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    'adapters/astro': 'src/adapters/astro.ts',
    'adapters/nextjs': 'src/adapters/nextjs.ts',
  },
  format: ['esm'],
  dts: true,
  sourcemap: true,
  outDir: 'dist',
  external: ['@cocart/sdk'],
});
