import { describe, expect, it } from "vitest";
import { createSSRApp, defineComponent, h, ref } from "vue";
import { renderToString } from "vue/server-renderer";
import * as VFloat from "@/index";

describe("Feature: Server-Side Rendering (SSR) environment compatibility", () => {
  describe("Scenario: Full composable suite SSR rendering", () => {
    it("Given a component composing all public VFloat composables, When rendered to string on Node.js, Then it outputs valid HTML markup without throwing", async () => {
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
          VFloat.useEscapeKey(node);
          VFloat.useOutsideClick(node);
          VFloat.useRole(node, { role: "menu", label: "Actions" });
          VFloat.useArrow(node);
          VFloat.useClientPoint(node);
          const items = ref<Array<HTMLElement | null>>([]);
          VFloat.useRovingFocus(node, { elementsList: items });
          VFloat.useTypeahead(node, { items: ["Apple", "Banana", "Cherry"] });
          VFloat.useAriaActivedescendant(node, {
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
  });

  describe("Scenario: Deterministic rendering across SSR instances", () => {
    it("Given identical components rendered across separate SSR apps, When rendered to string, Then output HTML is strictly deterministic and identical", async () => {
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
  });

  describe("Scenario: Nested hierarchical floating nodes in SSR", () => {
    it("Given a parent-child nested floating node hierarchy, When rendered to string, Then both parent and child content render without error", async () => {
      const NestedComponent = defineComponent({
        name: "NestedComponent",
        setup() {
          const parentAnchorEl = ref<HTMLElement | null>(null);
          const parentFloatingEl = ref<HTMLElement | null>(null);
          const childAnchorEl = ref<HTMLElement | null>(null);
          const childFloatingEl = ref<HTMLElement | null>(null);

          const parentNode = VFloat.useFloatingNode({
            anchorEl: parentAnchorEl,
            floatingEl: parentFloatingEl,
          });

          const childNode = VFloat.useFloatingNode({
            anchorEl: childAnchorEl,
            floatingEl: childFloatingEl,
            parent: parentNode,
          });

          VFloat.usePosition(parentNode);
          VFloat.usePosition(childNode);
          VFloat.useEscapeKey(parentNode);
          VFloat.useOutsideClick(parentNode);
          VFloat.useEscapeKey(childNode);
          VFloat.useOutsideClick(childNode);

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
});
