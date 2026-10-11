import { fileURLToPath } from "node:url";
import { defineNuxtConfig } from "nuxt/config";

export default defineNuxtConfig({
  extends: ["docus"],

  ui: {
    theme: {
      colors: ["primary", "secondary", "tertiary", "success", "info", "warning", "error"],
    },
  },

  app: {
    head: {
      link: [{ rel: "icon", type: "image/svg+xml", href: "/favicon.svg" }],
    },
  },

  site: {
    name: "VFloat",
    url: "https://vfloat.pages.dev",
  },

  ogImage: {
    enabled: false,
  },

  alias: {
    "@": fileURLToPath(new URL("../packages/vue/src", import.meta.url)),
    "v-float": fileURLToPath(new URL("../packages/vue/src/index.ts", import.meta.url)),
  },

  vite: {
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("../packages/vue/src", import.meta.url)),
        "v-float": fileURLToPath(new URL("../packages/vue/src/index.ts", import.meta.url)),
      },
    },
  },

  nitro: {
    prerender: {
      crawlLinks: true,
      routes: ["/"],
    },
  },

  routeRules: {
    "/guide": {
      redirect: { to: "/guide/getting-started/introduction", statusCode: 301 },
    },
  },
});
