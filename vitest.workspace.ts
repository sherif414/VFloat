/// <reference types="@vitest/browser/matchers" />
import { defineWorkspace } from "vitest/config"

export default defineWorkspace([
  // If you want to keep running your existing tests in Node.js, uncomment the next line.
  // 'vite.config.ts',
  {
    extends: "vite.config.ts",
    test: {
      browser: {
        enabled: true,
        provider: "preview",
        instances: [{ browser: "chrome" }],
      },
    },
  },
])
