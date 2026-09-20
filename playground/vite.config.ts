import { fileURLToPath, URL } from "node:url";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "v-float": fileURLToPath(new URL("../packages/vue/src/index.ts", import.meta.url)),
      "@": fileURLToPath(new URL("../packages/vue/src", import.meta.url)),
    },
  },
  server: {
    port: 5174,
  },
});
