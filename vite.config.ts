import { fileURLToPath, URL } from "node:url"
import vue from "@vitejs/plugin-vue"
import unocss from "unocss/vite"
import { defineConfig } from "vite-plus"
import dts from "vite-plugin-dts"
import vueDevtools from "vite-plugin-vue-devtools"

export default defineConfig({
  staged: {
    "*": "vp check --fix"
  },
  lint: {"options":{"typeAware":true,"typeCheck":true}},
  plugins: [
    vue(),
    unocss(),
    dts({ tsconfigPath: "./tsconfig.build.json", outDir: "dist", entryRoot: "src" }),
    vueDevtools(),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  build: {
    lib: {
      entry: fileURLToPath(new URL("./src/index.ts", import.meta.url)),
      name: "VFloat",
      fileName: (format) => `v-float.${format}.js`,
    },
    rollupOptions: {
      external: ["vue"],
      output: {
        exports: "named",
        globals: {
          vue: "Vue",
        },
      },
    },
  },
})
