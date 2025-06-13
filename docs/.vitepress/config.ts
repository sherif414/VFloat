import { defineConfig } from "vitepress";
import { demoMdPlugin } from 'vitepress-plugin-demo'
import { transformerTwoslash } from "@shikijs/vitepress-twoslash"
import unocss from "unocss/vite"
// https://vitepress.dev/reference/site-config
export default defineConfig({
  head: [
    ['meta', { name: 'algolia-site-verification', content: '3A8199582DC4CB2E' }]
  ],
  markdown: {
    config(md) {
      md.use(demoMdPlugin)
    },
    codeTransformers: [transformerTwoslash()],
    languages: ["js", "ts"],
  },
  title: "V-Float",
  description: "A library for positioning floating elements",
  themeConfig: {
    algolia: {
      appId: 'YOUR_ALGOLIA_APP_ID',
      apiKey: 'YOUR_ALGOLIA_API_KEY',
      indexName: 'YOUR_ALGOLIA_INDEX_NAME',
    },
    nav: [
      { text: "Home", link: "/" },
      { text: "Guide", link: "/guide/" },
      { text: "Composables", link: "/composables/" },
      { text: "Examples", link: "/examples/" },
      { text: "API", link: "/api/" },
    ],

    sidebar: {
      "/guide/": [
        {
          text: "Introduction",
          collapsed: false,
          items: [
            { text: "Getting Started", link: "/guide/" },
            { text: "Installation", link: "/guide/installation" },
            { text: "Core Concepts", link: "/guide/concepts" },
          ],
        },
        {
          text: "Advanced",
          collapsed: false,
          items: [
            { text: "Middleware", link: "/guide/middleware" },
            { text: "Virtual Elements", link: "/guide/virtual-elements" },
          ],
        },
      ],
      "/composables/": [
        {
          text: "Core",
          items: [
            { text: "Overview", link: "/composables/" },
            { text: "useFloating", link: "/composables/use-floating" },
            { text: "useFloatingTree", link: "/composables/use-floating-tree" },
          ],
        },
        {
          text: "Interactions",
          items: [
            { text: "useHover", link: "/composables/use-hover" },
            { text: "useClick", link: "/composables/use-click" },
            { text: "useDismiss", link: "/composables/use-dismiss" },
            { text: "useClientPoint", link: "/composables/use-client-point" },
          ],
        },
        {
          text: "Middleware",
          items: [
            { text: "offset", link: "/composables/middleware/offset" },
            { text: "flip", link: "/composables/middleware/flip" },
            { text: "shift", link: "/composables/middleware/shift" },
            { text: "size", link: "/composables/middleware/size" },
          ],
        },
      ],
      "/examples/": [
        {
          text: "Examples",
          items: [{ text: "Overview", link: "/examples/" }],
        },
      ],
      "/api/": [
        {
          text: "Core API",
          items: [
            { text: "Overview", link: "/api/" },
            { text: "useFloating", link: "/api/use-floating" },
            { text: "useFloatingTree", link: "/api/use-floating-tree" },
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
  vite: {
    plugins: [unocss()],
  },
})
