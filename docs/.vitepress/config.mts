import { defineConfig } from "vitepress"
import { fileURLToPath } from "node:url"
import { resolve } from "node:path"
import { demoMdPlugin } from "vitepress-plugin-demo"

const vueThemeNodeModules = resolve(
  fileURLToPath(new URL("../..", import.meta.url)),
  "node_modules",
  "@vue",
  "theme",
  "node_modules",
)

export default defineConfig({
  head: [],
  scrollOffset: ["header", ".VPLocalNav"],
  vite: {
    resolve: {
      alias: {
        "@vueuse/core": resolve(vueThemeNodeModules, "@vueuse/core", "index.mjs"),
        "@vueuse/shared": resolve(vueThemeNodeModules, "@vueuse/shared", "index.mjs"),
      },
    },
    optimizeDeps: {
      exclude: ["@vue/theme", "@vueuse/core", "body-scroll-lock"],
    },
    build: {
      sourcemap: true,
      minify: false,
    },
    ssr: {
      noExternal: ["@vue/theme", "@vueuse/core", "body-scroll-lock", "v-float"],
    },
  },
  markdown: {
    config(md) {
      md.use(demoMdPlugin)
    },
    languages: ["js", "ts"],
  },
  title: "V-Float",
  description: "A library for positioning floating elements",
  themeConfig: {
    search: {
      provider: "local",
    },
    nav: [
      { text: "Home", link: "/" },
      { text: "Guide", link: "/guide/" },
      { text: "API", link: "/api/" },
    ],

    sidebar: {
      "/guide/": [
        {
          text: "Introduction",
          items: [
            { text: "Getting Started", link: "/guide/" },
            { text: "Core Concepts", link: "/guide/concepts" },
            { text: "Interactions", link: "/guide/interactions" },
            { text: "Keyboard List Navigation", link: "/guide/list-navigation" },
          ],
        },
        {
          text: "Advanced",
          items: [
            { text: "Middleware", link: "/guide/middleware" },
            { text: "Virtual Elements", link: "/guide/virtual-elements" },
            { text: "Safe Polygon", link: "/guide/safe-polygon" },
          ],
        },
      ],
      "/api/": [
        {
          text: "Core",
          collapsed: false,
          items: [
            { text: "Overview", link: "/api/" },
            { text: "useFloating", link: "/api/use-floating" },
            { text: "useArrow", link: "/api/use-arrow" },
          ],
        },
        {
          text: "Interactions",
          collapsed: false,
          items: [
            { text: "useClick", link: "/api/use-click" },
            { text: "useHover", link: "/api/use-hover" },
            { text: "useFocus", link: "/api/use-focus" },
            { text: "useFocusTrap", link: "/api/use-focus-trap" },
            { text: "useClientPoint", link: "/api/use-client-point" },
            { text: "useEscapeKey", link: "/api/use-escape-key" },
            { text: "useListNavigation", link: "/api/use-list-navigation" },
          ],
        },
        {
          text: "Middleware",
          collapsed: false,
          items: [
            { text: "offset", link: "/api/offset" },
            { text: "flip", link: "/api/flip" },
            { text: "shift", link: "/api/shift" },
            { text: "size", link: "/api/size" },
            { text: "autoPlacement", link: "/api/autoplacement" },
            { text: "hide", link: "/api/hide" },
            { text: "arrow", link: "/api/arrow" },
          ],
        },
      ],
    },

    socialLinks: [{ icon: "github", link: "https://github.com/sherif414/VFloat" }],

    footer: {
      message: "Released under the MIT License.",
      copyright: "Copyright 2025-present Shareef Hassan",
    },

    editLink: {
      pattern: "https://github.com/sherif414/VFloat/edit/main/docs/:path",
    },
  },
  ignoreDeadLinks: true,
  base: "/",
})
