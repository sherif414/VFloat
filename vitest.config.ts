/// <reference types="@vitest/browser/matchers" />
import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    browser: {
      enabled: true,
      provider: "playwright",
      instances: [{ browser: "chromium" }],
      headless: true,
    },
    includeTaskLocation: true,
  },
})
