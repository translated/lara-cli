import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'url';
import { resolve } from 'path';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', '**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/coverage/**',
        '**/tests/**',
        '**/*.d.ts',
        '**/*.test.ts',
        '**/vitest.config.ts',
        '**/__tests__/**',
      ],
    },
  },
  resolve: {
    alias: {
      '#utils': resolve(__dirname, './src/utils'),
      '#modules': resolve(__dirname, './src/modules'),
      '#cli': resolve(__dirname, './src/cli'),
      '#messages': resolve(__dirname, './src/messages'),
    },
  },
});
