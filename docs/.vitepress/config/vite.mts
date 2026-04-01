import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";

export const vite = {
  plugins: tailwindcss() as never,
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("../../../src", import.meta.url)),
    },
  },
  build: {
    sourcemap: true,
    minify: false,
  },
  ssr: {
    noExternal: ["v-float"],
  },
};
