import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vitepress";
import { demoMdPlugin } from "vitepress-plugin-demo";

export default defineConfig({
  head: [
    ["link", { rel: "icon", type: "image/svg+xml", href: "/vfloat-mark.svg" }],
    ["link", { rel: "icon", type: "image/png", sizes: "1024x1024", href: "/vfloat-mark.png" }],
  ],
  vite: {
    plugins: tailwindcss() as never,
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
      md.use(demoMdPlugin);
    },
  },
  title: "V-Float",
  description: "A library for positioning floating elements",
  themeConfig: {
    logo: "/vfloat-mark.svg",
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
});
