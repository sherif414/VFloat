import type { DefaultTheme } from "vitepress";
import { editLink, footer, nav, sidebar, socialLinks } from "./navigation.mts";

export const themeConfig = {
  logo: "/vfloat-mark.svg",
  search: {
    provider: "local",
  },
  nav,
  sidebar,
  socialLinks,
  footer,
  editLink,
} satisfies DefaultTheme.Config;
