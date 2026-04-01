import type { DefaultTheme } from "vitepress";

export const nav: DefaultTheme.NavItem[] = [
  { text: "Home", link: "/" },
  { text: "Guide", link: "/guide/" },
  { text: "API", link: "/api/" },
];

export const sidebar: DefaultTheme.Sidebar = {
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
};

export const socialLinks: DefaultTheme.SocialLink[] = [
  { icon: "github", link: "https://github.com/sherif414/VFloat" },
];

export const footer: DefaultTheme.Footer = {
  message: "Released under the MIT License.",
  copyright: "Copyright 2025-present Shareef Hassan",
};

export const editLink: DefaultTheme.EditLink = {
  pattern: "https://github.com/sherif414/VFloat/edit/main/docs/:path",
};
