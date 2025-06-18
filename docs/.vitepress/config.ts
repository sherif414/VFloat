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
            { text: "Interactions", link: "/guide/interactions" },
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
      "/api/": [
        {
          text: "Core",
          items: [
            { text: "Overview", link: "/api/" },
            { text: "useFloating", link: "/api/use-floating" },
            { text: "useFloatingTree", link: "/api/use-floating-tree" },
            { text: "useArrow", link: "/api/use-arrow" },
          ],
        },
        {
          text: "Interactions",
          items: [
            { text: "useClick", link: "/api/use-click" },
            { text: "useHover", link: "/api/use-hover" },
            { text: "useDismiss", link: "/api/use-dismiss" },
            { text: "useFocus", link: "/api/use-focus" },
            { text: "useClientPoint", link: "/api/use-client-point" },
          ],
        },
        {
          text: "Middleware",
          items: [
            { text: "offset", link: "/api/offset" },
            { text: "flip", link: "/api/flip" },
            { text: "shift", link: "/api/shift" },
            { text: "size", link: "/api/size" },
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
