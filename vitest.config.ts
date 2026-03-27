import { defineConfig } from "vitest/config"
import { fileURLToPath, URL } from "node:url"
import { playwright } from "@vitest/browser-playwright"

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    browser: {
      enabled: true,
      headless: true,
      screenshotFailures: false,
      provider: playwright(),
      instances: [{ browser: "chromium" }],
    },
    silent: "passed-only",
    includeTaskLocation: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/types.ts",
        "src/index.ts",
        "src/composables/middlewares/arrow.ts",
        "src/composables/positioning/use-arrow.ts",
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        statements: 80,
        branches: 70,
      },
    },
  },
})
