import { defineConfig } from "vitepress"
import { demoMdPlugin } from "vitepress-plugin-demo"

export default defineConfig({
  head: [],
  vite: {
    build: {
      sourcemap: true,
      minify: false,
    },
    ssr: {
      noExternal: ["v-float"],
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
          text: "Start Here",
          items: [{ text: "Start Here", link: "/guide/" }],
        },
        {
          text: "How It Works",
          items: [{ text: "How It Works", link: "/guide/how-it-works" }],
        },
        {
          text: "Recipes",
          items: [
            { text: "Interactions", link: "/guide/interactions" },
            { text: "Middleware", link: "/guide/middleware" },
            { text: "Keyboard List Navigation", link: "/guide/list-navigation" },
            { text: "Virtual Elements", link: "/guide/virtual-elements" },
            { text: "Safe Polygon", link: "/guide/safe-polygon" },
          ],
        },
        {
          text: "Migration",
          items: [{ text: "Grouped Context", link: "/guide/migration-grouped-context" }],
        },
      ],
      "/api/": [
        {
          text: "Reference",
          collapsed: false,
          items: [{ text: "Overview", link: "/api/" }],
        },
        {
          text: "Positioning",
          collapsed: false,
          items: [
            { text: "useFloating", link: "/api/use-floating" },
            { text: "useArrow", link: "/api/use-arrow" },
            { text: "useClientPoint", link: "/api/use-client-point" },
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
