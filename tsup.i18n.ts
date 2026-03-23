import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    'i18n/en-us': 'src/i18n/locales/en-us.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  outDir: 'dist',
  external: ['@cocart/sdk'],
});
