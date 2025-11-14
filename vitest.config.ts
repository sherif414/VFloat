/// <reference types="@vitest/browser/providers/playwright" />

import { defineConfig } from "vitest/config"
import { fileURLToPath, URL } from "node:url"

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    browser: {
      enabled: true,
      provider: "playwright",
      instances: [{ browser: "chromium" }],
      headless: true,
    },
    silent: 'passed-only',
    includeTaskLocation: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/types.ts',
        'src/index.ts',
        'src/composables/middlewares/arrow.ts',
        'src/composables/positioning/use-arrow.ts',
      ],
      thresholds: {
        lines: 0.8,
        functions: 0.8,
        statements: 0.8,
        branches: 0.7,
      },
    },
  },
})
