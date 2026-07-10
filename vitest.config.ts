import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/**/*.test.{ts,tsx}'],
    setupFiles: ['./tests/_stubs/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(here, 'src'),
      'server-only': path.resolve(here, 'tests/_stubs/server-only.ts'),
    },
  },
});