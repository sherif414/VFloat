import { describe, expect, it } from "vitest";
import { createSSRApp, defineComponent, h, ref } from "vue";
import { renderToString } from "vue/server-renderer";
import * as VFloat from "@/index";

describe("SSR Compatibility (Node Environment)", () => {
  it("renders all public composables in SSR without throwing", async () => {
    const TestComponent = defineComponent({
      name: "SSRTestComponent",
      setup() {
        const anchorEl = ref<HTMLElement | null>(null);
        const floatingEl = ref<HTMLElement | null>(null);
        const arrowEl = ref<HTMLElement | null>(null);
        const open = ref(false);

        const context = VFloat.useFloatingContext({
          anchorEl,
          floatingEl,
          arrowEl,
          open,
        });

        const position = VFloat.usePosition(context, {
          placement: "bottom-start",
          strategy: "fixed",
        });

        VFloat.useClick(context);
        VFloat.useHover(context);
        VFloat.useFocus(context);
        VFloat.useFocusManager(context, { modal: true });
        VFloat.useEscapeKey(context);
        VFloat.useOutsideClick(context);
        VFloat.useRole(context, { role: "menu", label: "Actions" });
        VFloat.useArrow(context);
        VFloat.useClientPoint(context);
        VFloat.useCollection();
        const items = ref<Array<HTMLElement | null>>([]);
        VFloat.useRovingFocus({ containerEl: floatingEl, elementsList: items });
        VFloat.useAriaActivedescendant({
          targetEl: anchorEl,
          containerEl: floatingEl,
          elementsList: items,
        });

        return () =>
          h("div", { class: "container" }, [
            h("button", { ref: anchorEl, id: "anchor-btn" }, "Open Menu"),
            h(
              "div",
              {
                ref: floatingEl,
                id: "floating-menu",
                style: position.styles.value,
              },
              [h("span", { ref: arrowEl, class: "arrow" }), h("p", "Menu content")],
            ),
          ]);
      },
    });

    const app = createSSRApp(TestComponent);
    const html = await renderToString(app);

    expect(html).toContain('class="container"');
    expect(html).toContain('id="anchor-btn"');
    expect(html).toContain('id="floating-menu"');
    expect(html).toContain("Menu content");
    expect(html).toContain('style="position:fixed;left:0;top:0;"');
  });

  it("produces deterministic ARIA attributes and IDs across separate SSR renders", async () => {
    const RoleComponent = defineComponent({
      name: "RoleComponent",
      setup() {
        const anchorEl = ref<HTMLElement | null>(null);
        const floatingEl = ref<HTMLElement | null>(null);
        const open = ref(false);

        const context = VFloat.useFloatingContext({ anchorEl, floatingEl, open });
        VFloat.useRole(context, { role: "dialog", modal: true });

        return () =>
          h("div", [
            h("button", { ref: anchorEl }, "Toggle"),
            h("div", { ref: floatingEl }, "Dialog"),
          ]);
      },
    });

    const html1 = await renderToString(createSSRApp(RoleComponent));
    const html2 = await renderToString(createSSRApp(RoleComponent));

    // Both instances rendered from separate createSSRApp calls should produce identical markup
    expect(html1).toBe(html2);
  });

  it("handles nested floating contexts during SSR without crashing", async () => {
    const NestedComponent = defineComponent({
      name: "NestedComponent",
      setup() {
        const parentAnchorEl = ref<HTMLElement | null>(null);
        const parentFloatingEl = ref<HTMLElement | null>(null);
        const childAnchorEl = ref<HTMLElement | null>(null);
        const childFloatingEl = ref<HTMLElement | null>(null);

        const parentContext = VFloat.useFloatingContext({
          anchorEl: parentAnchorEl,
          floatingEl: parentFloatingEl,
        });

        const childContext = VFloat.useFloatingContext({
          anchorEl: childAnchorEl,
          floatingEl: childFloatingEl,
          parentContext,
        });

        VFloat.usePosition(parentContext);
        VFloat.usePosition(childContext);
        VFloat.useOutsideClick(parentContext);
        VFloat.useOutsideClick(childContext);

        return () =>
          h("div", [
            h("button", { ref: parentAnchorEl }, "Parent Anchor"),
            h("div", { ref: parentFloatingEl }, [
              h("button", { ref: childAnchorEl }, "Child Anchor"),
              h("div", { ref: childFloatingEl }, "Child Content"),
            ]),
          ]);
      },
    });

    const app = createSSRApp(NestedComponent);
    const html = await renderToString(app);

    expect(html).toContain("Parent Anchor");
    expect(html).toContain("Child Content");
  });
});
