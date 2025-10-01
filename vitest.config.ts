/// <reference types="@vitest/browser/matchers" />
import { mergeConfig } from "vite"
import { defineConfig, configDefaults } from "vitest/config"
import viteConfig from "./vite.config"

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      ...configDefaults,
      browser: {
        enabled: true,
        provider: "playwright",
        instances: [{ browser: "chromium" }],
        headless: true,
      },
      includeTaskLocation: true,
    },
    define: {
      "process.env": {},
    },
  }),
)