import "../../../env.d.ts";

import "./styles/vars.css";
import "./styles/home.css";
import type { Theme } from "vitepress";
import DefaultTheme from "vitepress/theme";
import { useData } from "vitepress";
import { defineComponent, h } from "vue";
import DemoContainer from "./components/demo-container.vue";
import HomeInstall from "./components/home-install.vue";
import HomeShowcase from "./components/home-showcase.vue";
import PackageSizeTable from "./components/package-size-table.vue";

const renderLayout = h as any;

const Layout = defineComponent({
  name: "VFloatDocsLayout",
  setup(_, { slots }) {
    const { frontmatter } = useData();

    return () =>
      renderLayout(DefaultTheme.Layout, null, {
        ...slots,
        "nav-bar-title-before": () =>
          h("img", {
            class: "vf-mark",
            src: "/vfloat-mark.svg",
            alt: "",
            width: 24,
            height: 24,
          }),
        "navbar-title": () => h("span", { class: "text" }, "VFloat"),
        ...(frontmatter.value.layout === "home"
          ? {
              "home-hero-actions-after": () => h(HomeInstall),
              "home-hero-after": () =>
                h("div", { class: "home-showcase-section" }, [h(HomeShowcase)]),
            }
          : {}),
      } as any);
  },
});

/** VitePress theme entry for the VFloat docs site. Extends the stock default theme with the VFloat skin. */
export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app }) {
    app.component("demo-container", DemoContainer);
    app.component("home-showcase", HomeShowcase);
    app.component("HomeShowcase", HomeShowcase);
    app.component("package-size-table", PackageSizeTable);
    app.component("PackageSizeTable", PackageSizeTable);
  },
} satisfies Theme;
