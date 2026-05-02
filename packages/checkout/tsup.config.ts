import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    clean: true,
    outDir: 'dist',
    external: ['@cocartheadless/sdk'],
  },
  {
    entry: { react: 'src/react/index.ts' },
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    outDir: 'dist',
    external: ['@cocartheadless/sdk', 'react', 'react-dom'],
    esbuildOptions(opts) {
      opts.jsx = 'automatic';
    },
  },
]);
