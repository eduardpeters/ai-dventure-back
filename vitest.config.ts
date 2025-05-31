import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

export default defineConfig(({ mode }) => ({
  test: {
    env: loadEnv(mode, process.cwd(), ''),
    alias: {
      '@/': new URL('./src/', import.meta.url).pathname,
    },
  },
}));
