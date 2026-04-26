import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['iife'],
  globalName: 'CoCartSDK',
  footer: {
    js: 'if(typeof CoCartSDK!=="undefined"){Object.assign(typeof window!=="undefined"?window:globalThis,CoCartSDK);}',
  },
  outDir: 'dist',
  minify: true,
  sourcemap: true,
  outExtension: () => ({ js: '.global.js' }),
});
