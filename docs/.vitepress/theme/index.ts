import "../../../env.js";
import DefaultTheme from "vitepress/theme";
import type { Theme } from "vitepress";
import Layout from "./components/Layout.vue";
import "../../../tailwind.css";
import "./code.css";
import "./docs-shell.css";

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {},
  Layout,
} satisfies Theme;
