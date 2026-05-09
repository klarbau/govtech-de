import path from 'node:path';
import { defineConfig } from 'vitest/config';

/**
 * Vitest-Konfiguration nur für Unit-Tests unter `tests/unit/**`.
 * E2E + a11y laufen weiterhin über Playwright (`tests/e2e`, `tests/a11y`).
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
    reporters: 'default',
  },
});
