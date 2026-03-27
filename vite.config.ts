import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite-plus";
import { playwright } from "vite-plus/test/browser-playwright";
import vueDevtools from "vite-plugin-vue-devtools";

export default defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  lint: { options: { typeAware: true, typeCheck: true } },
  pack: {
    dts: {
      tsgo: true,
      tsconfig: "tsconfig.build.json",
    },
    exports: true,
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
  plugins: [
    vue(),
    tailwindcss(),
    // dts({ tsconfigPath: "./tsconfig.build.json", outDir: "dist", entryRoot: "src" }),
    vueDevtools(),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  // build: {
  //   lib: {
  //     entry: fileURLToPath(new URL("./src/index.ts", import.meta.url)),
  //     name: "VFloat",
  //     fileName: (format) => `v-float.${format}.js`,
  //   },
  //   rollupOptions: {
  //     external: ["vue"],
  //     output: {
  //       exports: "named",
  //       globals: {
  //         vue: "Vue",
  //       },
  //     },
  //   },
  // },
});
