/// <reference path="../../../env.d.ts" />

import "vitepress/dist/client/theme-default/styles/components/vp-code.css";
import "./styles/home.css";
import { useData } from "vitepress";
import DefaultTheme from "vitepress/theme";
import { h, defineComponent } from "vue";
import { VPTheme } from "@vue/theme";
import type { Theme } from "vitepress";

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
        } as any,
      );
  },
});

/** VitePress theme entry for the VFloat docs site. */
export default {
  ...VPTheme,
  Layout,
} satisfies Theme;
