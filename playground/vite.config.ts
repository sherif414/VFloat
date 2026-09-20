import { fileURLToPath, URL } from "node:url";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";
import vueDevTools from "vite-plugin-vue-devtools";

export default defineConfig({
  plugins: [vue(), vueDevTools()],
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
