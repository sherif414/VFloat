import { URL, fileURLToPath } from "node:url"
import vue from "@vitejs/plugin-vue"
import { defineConfig } from "vite"
import dts from "vite-plugin-dts"
// import tailwind from "@tailwindcss/vite"
import unocss from "unocss/vite"

export default defineConfig({
  plugins: [
    vue(),
    unocss(),
    dts({ tsconfigPath: "./tsconfig.build.json", outDir: "dist", entryRoot: "src" }),
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
