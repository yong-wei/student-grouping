/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { loggerPlugin } from './vite-plugin-logger';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), loggerPlugin()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    passWithNoTests: false,
    forbidOnly: true,
    reporters: 'default',
    coverage: {
      enabled: true,
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: [
        'src/utils/excelParser.ts',
        'src/utils/groupingAlgorithm.ts',
        'src/utils/learningStyleUtils.ts',
        'src/store/**/*.{ts,tsx}',
      ],
      exclude: ['src/test/**/*'],
      thresholds: {
        statements: 45,
        branches: 40,
        functions: 45,
        lines: 45,
      },
    },
  },
});
