import { defineConfig } from "vitepress";

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "V-Float",
  description:
    "Vue 3 port of Floating UI - a library for positioning floating elements",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    logo: "/logo.svg",
    nav: [
      { text: "Home", link: "/" },
      { text: "Guide", link: "/guide/" },
      { text: "Components", link: "/components/" },
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
          text: "Basic Usage",
          collapsed: false,
          items: [
            { text: "Positioning", link: "/guide/positioning" },
            { text: "Interactions", link: "/guide/interactions" },
            { text: "Middleware", link: "/guide/middleware" },
          ],
        },
      ],
      "/components/": [
        {
          text: "Components",
          items: [
            { text: "Overview", link: "/components/" },
            { text: "FloatingArrow", link: "/components/floating-arrow" },
            { text: "FloatingPortal", link: "/components/floating-portal" },
            { text: "FloatingOverlay", link: "/components/floating-overlay" },
            {
              text: "FloatingFocusManager",
              link: "/components/floating-focus-manager",
            },
            { text: "FloatingList", link: "/components/floating-list" },
            {
              text: "FloatingListItem",
              link: "/components/floating-list-item",
            },
          ],
        },
      ],
      "/composables/": [
        {
          text: "Core",
          items: [
            { text: "Overview", link: "/composables/" },
            { text: "useFloating", link: "/composables/use-floating" },
            { text: "useMergeRefs", link: "/composables/use-merge-refs" },
          ],
        },
        {
          text: "Interactions",
          items: [
            { text: "useInteractions", link: "/composables/use-interactions" },
            { text: "useHover", link: "/composables/use-hover" },
            { text: "useFocus", link: "/composables/use-focus" },
            { text: "useClick", link: "/composables/use-click" },
            { text: "useDismiss", link: "/composables/use-dismiss" },
            { text: "useRole", link: "/composables/use-role" },
            {
              text: "useListNavigation",
              link: "/composables/use-list-navigation",
            },
            { text: "useTypeahead", link: "/composables/use-typeahead" },
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
          items: [
            { text: "Overview", link: "/examples/" },
            { text: "Tooltip", link: "/examples/tooltip" },
            { text: "Dropdown", link: "/examples/dropdown" },
            { text: "Popover", link: "/examples/popover" },
            { text: "Menu", link: "/examples/menu" },
            { text: "Modal", link: "/examples/modal" },
          ],
        },
      ],
    },

    socialLinks: [
      { icon: "github", link: "https://github.com/yourusername/v-float" },
    ],

    footer: {
      message: "Released under the MIT License.",
      copyright: "Copyright © 2023-present V-Float Contributors",
    },
  },
  ignoreDeadLinks: true,
  base : "/v-float/",
});
