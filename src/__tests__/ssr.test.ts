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

        const node = VFloat.useFloatingNode({
          anchorEl,
          floatingEl,
          arrowEl,
          open,
        });

        const position = VFloat.usePosition(node, {
          placement: "bottom-start",
          strategy: "fixed",
        });

        VFloat.useClick(node);
        VFloat.useHover(node);
        VFloat.useFocus(node);
        VFloat.useFocusTrap(node, { modal: true });
        VFloat.useDismiss(node);
        VFloat.useRole(node, { role: "menu", label: "Actions" });
        VFloat.useArrow(node);
        VFloat.useClientPoint(node);
        VFloat.useCollection();
        const items = ref<Array<HTMLElement | null>>([]);
        VFloat.useRovingFocus(node, { elementsList: items });
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

        const node = VFloat.useFloatingNode({ anchorEl, floatingEl, open });
        VFloat.useRole(node, { role: "dialog", modal: true });

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

  it("handles nested floating nodes during SSR without crashing", async () => {
    const NestedComponent = defineComponent({
      name: "NestedComponent",
      setup() {
        const parentAnchorEl = ref<HTMLElement | null>(null);
        const parentFloatingEl = ref<HTMLElement | null>(null);
        const childAnchorEl = ref<HTMLElement | null>(null);
        const childFloatingEl = ref<HTMLElement | null>(null);

        const tree = VFloat.useFloatingTree();

        const parentNode = VFloat.useFloatingNode({
          anchorEl: parentAnchorEl,
          floatingEl: parentFloatingEl,
        });

        const childNode = VFloat.useFloatingNode({
          anchorEl: childAnchorEl,
          floatingEl: childFloatingEl,
        });

        tree.addNode(parentNode);
        tree.addNode(childNode, parentNode.id);

        VFloat.usePosition(parentNode);
        VFloat.usePosition(childNode);
        VFloat.useDismiss(parentNode, { tree });
        VFloat.useDismiss(childNode, { tree });

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
