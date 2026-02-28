import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    clean: true,
    outDir: 'dist',
  },
  {
    entry: {
      'adapters/astro': 'src/adapters/astro.ts',
      'adapters/nextjs': 'src/adapters/nextjs.ts',
    },
    format: ['esm'],
    dts: true,
    sourcemap: true,
    outDir: 'dist',
    external: ['@cocart/sdk'],
  },
]);
