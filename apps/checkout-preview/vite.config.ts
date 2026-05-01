import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@cocartheadless/checkout': resolve(__dirname, '../../packages/checkout/src/index.ts'),
      '@cocartheadless/sdk': resolve(__dirname, '../../src/index.ts'),
    },
  },
  server: {
    port: 5174,
    open: true,
  },
  build: {
    outDir: 'dist',
    target: 'es2022',
  },
});
