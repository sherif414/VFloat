import { fileURLToPath, URL } from "node:url";
import type { Config as VueThemeConfig } from "@vue/theme";
import vueThemeConfig from "@vue/theme/config";
import { defineConfigWithTheme, type HeadConfig, type MarkdownOptions } from "vitepress";
import { demoMdPlugin } from "vitepress-plugin-demo";

const vueThemeDeps = ["@vue/theme", "@vueuse/core", "body-scroll-lock", "v-float"];

export default defineConfigWithTheme({
  ...vueThemeConfig,

  // ============================================================================
  // SITE METADATA
  // ============================================================================
  title: "VFloat",
  description: "A library for positioning floating elements",
  ignoreDeadLinks: true,
  base: "/",

  // ============================================================================
  // DOCUMENT HEAD
  // ============================================================================
  head: [
    ["link", { rel: "icon", type: "image/svg+xml", href: "/vfloat-mark.svg" }],
    ["link", { rel: "icon", type: "image/png", sizes: "1024x1024", href: "/vfloat-mark.png" }],
  ] satisfies HeadConfig[],

  // ============================================================================
  // VITE BEHAVIOR
  // ============================================================================
  vite: {
    ...vueThemeConfig.vite,
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("../../src", import.meta.url)),
      },
    },
    build: {
      sourcemap: true,
      minify: false,
    },
    ssr: {
      ...vueThemeConfig.vite?.ssr,
      noExternal: vueThemeDeps,
    },
    optimizeDeps: {
      ...vueThemeConfig.vite?.optimizeDeps,
      exclude: vueThemeDeps,
    },
  },

  // ============================================================================
  // MARKDOWN PIPELINE
  // ============================================================================
  markdown: {
    ...vueThemeConfig.markdown,
    config(md) {
      md.use(demoMdPlugin);
    },
  } satisfies MarkdownOptions,

  // ============================================================================
  // THEME UI
  // ============================================================================
  themeConfig: {
    // ------------------------------------------------------------------------
    // MAIN NAVIGATION
    // ------------------------------------------------------------------------
    nav: [
      { text: "Guide", link: "/guide/" },
      { text: "API", link: "/api/" },
    ],

    // ------------------------------------------------------------------------
    // SIDEBAR GROUPS
    // ------------------------------------------------------------------------
    sidebar: {
      "/guide/": [
        {
          text: "Getting Started",
          items: [
            { text: "Overview", link: "/guide/" },
            { text: "First Tooltip", link: "/guide/first-tooltip" },
            { text: "First Popover", link: "/guide/first-popover" },
            { text: "Control Open State", link: "/guide/control-open-state" },
          ],
        },
        {
          text: "Guides",
          items: [
            { text: "Build Accessible Tooltips", link: "/guide/build-accessible-tooltips" },
            { text: "Build Popovers and Dropdowns", link: "/guide/build-popovers-and-dropdowns" },
            { text: "Keep Content in View", link: "/guide/keep-content-in-view" },
            { text: "Use Virtual Anchors", link: "/guide/use-virtual-anchors" },
            { text: "Keyboard Navigation", link: "/guide/keyboard-navigation" },
            { text: "Build Nested Menus", link: "/guide/build-nested-menus" },
            { text: "Build Dialogs and Modals", link: "/guide/build-dialogs-and-modals" },
          ],
        },
        {
          text: "Concepts",
          items: [
            { text: "Floating Context", link: "/guide/floating-context" },
            { text: "Placement and Positioning", link: "/guide/placement-and-positioning" },
            { text: "Middleware Pipeline", link: "/guide/middleware-pipeline" },
            { text: "Interaction Model", link: "/guide/interaction-model" },
            { text: "Focus Models", link: "/guide/focus-models" },
          ],
        },
        {
          text: "Design Notes",
          items: [
            { text: "Choosing the Right Pattern", link: "/guide/choosing-the-right-pattern" },
            { text: "Controlled vs Uncontrolled", link: "/guide/controlled-vs-uncontrolled" },
            { text: "VFloat and Floating UI", link: "/guide/vfloat-and-floating-ui" },
            { text: "Tree Coordination Explained", link: "/guide/tree-coordination-explained" },
          ],
        },
        {
          text: "Deep Dives",
          items: [
            { text: "Safe Polygon Gotchas", link: "/guide/safe-polygon-gotchas" },
            { text: "Middleware Ordering Gotchas", link: "/guide/middleware-ordering-gotchas" },
            { text: "Virtual Anchor Gotchas", link: "/guide/virtual-anchor-gotchas" },
            { text: "List Navigation Gotchas", link: "/guide/list-navigation-gotchas" },
            { text: "Tree Debugging", link: "/guide/tree-debugging" },
          ],
        },
      ],
      "/api/": [
        {
          text: "Reference",
          items: [{ text: "Overview", link: "/api/" }],
        },
        {
          text: "Positioning",
          items: [
            { text: "useFloating", link: "/api/use-floating" },
            { text: "useArrow", link: "/api/use-arrow" },
            { text: "useClientPoint", link: "/api/use-client-point" },
          ],
        },
        {
          text: "Interactions",
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
          text: "Tree Coordination",
          items: [
            { text: "useFloatingTree", link: "/api/use-floating-tree" },
            { text: "useFloatingTreeNode", link: "/api/use-floating-tree-node" },
          ],
        },
        {
          text: "Middleware",
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

    // ------------------------------------------------------------------------
    // SOCIAL AND FOOTER LINKS
    // ------------------------------------------------------------------------
    socialLinks: [{ icon: "github", link: "https://github.com/sherif414/VFloat" }],
  } satisfies VueThemeConfig,
});
