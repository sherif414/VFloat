import DefaultTheme from "vitepress/theme";
import type { Theme } from "vitepress";
import DemoPreview from "./components/demos/DemoPreview.vue"
import * as Demos from "../../demos";
import Layout from "./components/Layout.vue";

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component("demo-container", DemoPreview);

    // Register all demo components globally
    for (const [name, component] of Object.entries(Demos)) {
      app.component(name, component);
    }
  },
  Layout,
} satisfies Theme;
