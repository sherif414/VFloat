import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vitest/config";
import dts from "vite-plugin-dts";
import vueDevtools from "vite-plugin-vue-devtools";
import { playwright } from "@vitest/browser-playwright";

const isDebugging =
  process.execArgv.some((arg) => arg.includes("--inspect")) ||
  Boolean(process.env.VSCODE_INSPECTOR_OPTIONS) ||
  Boolean(process.env.INSPECT);

export default defineConfig({
  test: {
    browser: {
      enabled: true,
      headless: true,
      screenshotFailures: false,
      provider: playwright({
        launchOptions: {
          // Open CDP port for VS Code Chrome debugger
          args: isDebugging ? ["--remote-debugging-port=9222"] : [],
        },
      }),
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
  plugins: [
    vue(),
    tailwindcss(),
    dts({ tsconfigPath: "./tsconfig.build.json", outDirs: "dist", bundleTypes: true }),
    !process.env.VITEST && vueDevtools(),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "v-float": fileURLToPath(new URL("./src/index.ts", import.meta.url)),
    },
  },
  build: {
    lib: {
      entry: fileURLToPath(new URL("./src/index.ts", import.meta.url)),
      name: "VFloat",
      fileName: () => "index.mjs",
      formats: ["es"],
    },
    rollupOptions: {
      external: ["vue", "@floating-ui/dom"],
      output: {
        exports: "named",
      },
    },
  },
});
