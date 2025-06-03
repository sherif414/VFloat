import { defineConfig } from "vitepress";
import { containerPreview, componentPreview } from "@vitepress-demo-preview/plugin"
import { transformerTwoslash } from "@shikijs/vitepress-twoslash"
import unocss from "unocss/vite"
// https://vitepress.dev/reference/site-config
export default defineConfig({
  markdown: {
    config(md) {
      md.use(containerPreview)
      md.use(componentPreview)
    },
    codeTransformers: [transformerTwoslash()],
    languages: ["js", "ts"],
  },
  title: "V-Float",
  description: "Vue 3 port of Floating UI - a library for positioning floating elements",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    logo: "/logo.svg",
    nav: [
      { text: "Home", link: "/" },
      { text: "Guide", link: "/guide/" },
      { text: "Composables", link: "/composables/" },
      { text: "Examples", link: "/examples/" },
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
    },

    socialLinks: [{ icon: "github", link: "https://github.com/sherif414/v-float" }],

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
