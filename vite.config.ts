import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import dts from "vite-plugin-dts";

export default defineConfig({
  plugins: [
    vue(),
    dts({
      include: ["src/**/*.ts", "src/**/*.vue"],
      beforeWriteFile: (filePath, content) => {
        return {
          filePath,
          content,
        };
      },
    }),
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
    minify: "terser",
    sourcemap: true,
    cssCodeSplit: true,
    rollupOptions: {
      external: ["vue", "@floating-ui/dom"],
      output: {
        exports: "named",
        globals: {
          vue: "Vue",
          "@floating-ui/dom": "FloatingUIDom",
        },
      },
    },
  },
});
