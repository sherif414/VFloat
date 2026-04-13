import "../../../env.js";
import DefaultTheme from "vitepress/theme";
import type { Theme } from "vitepress";
import Layout from "./layouts/RootLayout.vue";
import "../../../tailwind.css";
import "./styles/theme.css";
import "./styles/vitepress-bridge.css";
import "./styles/home-page.css";

/** VitePress theme entry for the VFloat docs site. */
export default {
  extends: DefaultTheme,
  enhanceApp() {},
  Layout,
} satisfies Theme;
