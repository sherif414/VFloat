import { h, defineComponent } from "vue";
import { VPTheme } from "@vue/theme";
import type { Theme } from "vitepress";

const renderLayout = h as any;

const Layout = defineComponent({
  name: "VFloatVueDocsLayout",
  setup(_, { slots }) {
    return () =>
      renderLayout(VPTheme.Layout, null, {
        ...slots,
        "navbar-title": () => [
          h("img", {
            class: "logo",
            src: "/vfloat-mark.svg",
            alt: "",
          }),
          h("span", { class: "text" }, "VFloat"),
        ],
      } as any);
  },
});

/** VitePress theme entry for the VFloat docs site. */
export default {
  ...VPTheme,
  Layout,
} satisfies Theme;
