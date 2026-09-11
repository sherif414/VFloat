import { defineConfig } from "vitepress";

const SITE_ORIGIN = "https://vfloat.pages.dev";
const SITE_TITLE = "VFloat";
const SITE_DESCRIPTION = "A headless, primitive floating library for Vue 3";
const SOCIAL_IMAGE = `${SITE_ORIGIN}/vfloat-mark.png`;

// Mirrors how the built site is actually served: `guide/index.md` is at
// `/guide/`, and every other page drops both `.md` and the trailing slash.
function pageUrl(relativePath: string): string {
  const path = relativePath.replace(/\.md$/, "");
  if (path === "index") return `${SITE_ORIGIN}/`;
  if (path.endsWith("/index")) return `${SITE_ORIGIN}/${path.slice(0, -"index".length)}`;
  return `${SITE_ORIGIN}/${path}`;
}

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,

  // Site-wide social card tags. Per-page title/description/url are added in
  // transformPageData below.
  head: [
    ["meta", { property: "og:type", content: "website" }],
    ["meta", { property: "og:site_name", content: SITE_TITLE }],
    ["meta", { property: "og:image", content: SOCIAL_IMAGE }],
    ["meta", { property: "og:image:width", content: "1024" }],
    ["meta", { property: "og:image:height", content: "1024" }],
    ["meta", { property: "og:image:alt", content: SITE_TITLE }],
    ["meta", { name: "twitter:card", content: "summary" }],
  ],

  transformPageData(pageData) {
    const title = pageData.frontmatter.title ?? pageData.title ?? SITE_TITLE;
    const description =
      pageData.frontmatter.description ?? pageData.description ?? SITE_DESCRIPTION;

    pageData.frontmatter.head ??= [];
    pageData.frontmatter.head.push(
      ["meta", { property: "og:title", content: title }],
      ["meta", { property: "og:description", content: description }],
      ["meta", { property: "og:url", content: pageUrl(pageData.relativePath) }],
    );
  },

  themeConfig: {
    // ------------------------------------------------------------------------
    // TOP NAVIGATION BAR
    // ------------------------------------------------------------------------
    nav: [
      { text: "Guide", link: "/guide/" },
      { text: "API Reference", link: "/api/" },
    ],

    // ------------------------------------------------------------------------
    // MULTI-SIDEBAR DEFINITION
    // ------------------------------------------------------------------------
    sidebar: {
      // 1. Guides Section Sidebar
      "/guide/": [
        {
          text: "Getting Started",
          items: [
            { text: "Overview", link: "/guide/" },
            { text: "Why VFloat & Floating UI", link: "/guide/vfloat-and-floating-ui" },
            { text: "Choosing the Right Pattern", link: "/guide/choosing-the-right-pattern" },
            { text: "First Tooltip", link: "/guide/first-tooltip" },
            { text: "First Popover", link: "/guide/first-popover" },
          ],
        },
        {
          text: "Core Concepts",
          items: [
            { text: "Floating Context", link: "/guide/floating-context" },
            { text: "Placement & Positioning", link: "/guide/placement-and-positioning" },
            { text: "Interaction Model", link: "/guide/interaction-model" },
            { text: "Tree Coordination Explained", link: "/guide/tree-coordination-explained" },
          ],
        },
        {
          text: "Components & Patterns",
          items: [
            { text: "Build Accessible Tooltips", link: "/guide/build-accessible-tooltips" },
            { text: "Build Popovers & Dropdowns", link: "/guide/build-popovers-and-dropdowns" },
            { text: "Build Dialogs & Modals", link: "/guide/build-dialogs-and-modals" },
            { text: "Build Nested Menus", link: "/guide/build-nested-menus" },
          ],
        },
        {
          text: "Positioning & Middleware",
          items: [
            { text: "Keep Content in View", link: "/guide/keep-content-in-view" },
            { text: "Use Virtual Anchors", link: "/guide/use-virtual-anchors" },
            { text: "Middleware Pipeline", link: "/guide/middleware-pipeline" },
          ],
        },
        {
          text: "Focus & Accessibility",
          items: [
            { text: "Control Open State", link: "/guide/control-open-state" },
            { text: "Focus Models", link: "/guide/focus-models" },
            { text: "Keyboard Navigation", link: "/guide/keyboard-navigation" },
          ],
        },
        {
          text: "Advanced & Architecture",
          items: [
            { text: "Controlled vs Uncontrolled", link: "/guide/controlled-vs-uncontrolled" },
            { text: "Safe Polygon Gotchas", link: "/guide/safe-polygon-gotchas" },
            { text: "Virtual Anchor Gotchas", link: "/guide/virtual-anchor-gotchas" },
            { text: "Middleware Ordering Gotchas", link: "/guide/middleware-ordering-gotchas" },
            { text: "List Navigation Gotchas", link: "/guide/list-navigation-gotchas" },
          ],
        },
      ],

      // 2. API Reference Sidebar
      "/api/": [
        {
          text: "Reference",
          items: [{ text: "Overview", link: "/api/" }],
        },
        {
          text: "Core",
          items: [
            { text: "useFloatingNode", link: "/api/use-floating-node" },
            { text: "useFloatingTree", link: "/api/use-floating-tree" },
          ],
        },
        {
          text: "Positioning",
          items: [
            { text: "usePosition", link: "/api/use-position" },
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
            { text: "useDismiss", link: "/api/use-dismiss" },
            { text: "useRole", link: "/api/use-role" },
          ],
        },
        {
          text: "Keyboard Navigation",
          items: [
            { text: "useRovingFocus", link: "/api/use-roving-focus" },
            { text: "useAriaActivedescendant", link: "/api/use-aria-activedescendant" },
            { text: "useTypeahead", link: "/api/use-typeahead" },
          ],
        },
        {
          text: "Middleware",
          items: [
            { text: "offset", link: "/api/offset" },
            { text: "flip", link: "/api/flip" },
            { text: "shift", link: "/api/shift" },
            { text: "autoPlacement", link: "/api/autoplacement" },
            { text: "size", link: "/api/size" },
            { text: "inline", link: "/api/inline" },
            { text: "arrow", link: "/api/arrow" },
            { text: "hide", link: "/api/hide" },
          ],
        },
      ],
    },

    // ------------------------------------------------------------------------
    // SOCIAL AND FOOTER LINKS
    // ------------------------------------------------------------------------
    socialLinks: [{ icon: "github", link: "https://github.com/sherif414/VFloat" }],
  },
});
