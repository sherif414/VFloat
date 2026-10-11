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
      meta: [
        { property: "og:image", content: "https://vfloat.pages.dev/og-image.png" },
        { property: "og:image:width", content: "2400" },
        { property: "og:image:height", content: "1260" },
        { property: "og:image:type", content: "image/png" },
        { property: "og:image:alt", content: "VFloat - Headless floating UI primitives for Vue 3" },
        { name: "twitter:image", content: "https://vfloat.pages.dev/og-image.png" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
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
