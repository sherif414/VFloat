import "../../../env.d.ts";

import "./styles/home.css";
import { VPTheme } from "@vue/theme";
import type { Theme } from "vitepress";
import { useData } from "vitepress";
import DefaultTheme from "vitepress/theme";
import { defineComponent, h } from "vue";
import DemoContainer from "./components/demo-container.vue";
import HomeShowcase from "./components/home-showcase.vue";
import PackageSizeTable from "./components/package-size-table.vue";

const renderLayout = h as any;

const Layout = defineComponent({
  name: "VFloatVueDocsLayout",
  setup(_, { slots }) {
    const { frontmatter } = useData();

    return () =>
      renderLayout(
        frontmatter.value.layout === "home" ? DefaultTheme.Layout : VPTheme.Layout,
        null,
        {
          ...slots,
          "navbar-title": () => h("span", { class: "text" }, "VFloat"),
          ...(frontmatter.value.layout === "home"
            ? {
                "home-hero-after": () =>
                  h("div", { class: "home-showcase-section" }, [h(HomeShowcase)]),
              }
            : {}),
        } as any,
      );
  },
});

/** VitePress theme entry for the VFloat docs site. */
export default {
  ...VPTheme,
  Layout,
  enhanceApp({ app }) {
    app.component("demo-container", DemoContainer);
    app.component("home-showcase", HomeShowcase);
    app.component("HomeShowcase", HomeShowcase);
    app.component("package-size-table", PackageSizeTable);
    app.component("PackageSizeTable", PackageSizeTable);
  },
} satisfies Theme;
