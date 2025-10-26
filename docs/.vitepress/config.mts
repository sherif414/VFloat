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
          text: "Introduction",
          items: [
            { text: "Getting Started", link: "/guide/" },
            { text: "Core Concepts", link: "/guide/concepts" },
            {
              text: "Floating Tree",
              collapsed: false,
              items: [
                { text: "Introduction", link: "/guide/floating-tree/introduction" },
                { text: "Getting Started", link: "/guide/floating-tree/getting-started" },
                { text: "Cookbook & Advanced Recipes", link: "/guide/floating-tree/cookbook" },
                { text: "API Reference", link: "/guide/floating-tree/api-reference" },
              ],
            },
            { text: "Interactions", link: "/guide/interactions" },
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
          collapsed: true,
          items: [
            { text: "Overview", link: "/api/" },
            { text: "useFloating", link: "/api/use-floating" },
            { text: "useFloatingTree", link: "/api/use-floating-tree" },
            { text: "useArrow", link: "/api/use-arrow" },
          ],
        },
        {
          text: "Interactions",
          collapsed: true,
          items: [
            { text: "useClick", link: "/api/use-click" },
            { text: "useHover", link: "/api/use-hover" },
            { text: "useFocus", link: "/api/use-focus" },
            { text: "useClientPoint", link: "/api/use-client-point" },
            { text: "useEscapeKey", link: "/api/use-escape-key" },
          ],
        },
        {
          text: "Middleware",
          collapsed: true,
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
