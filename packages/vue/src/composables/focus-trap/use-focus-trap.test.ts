import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-vue";
import {
  defineComponent,
  effectScope,
  h,
  nextTick,
  onMounted,
  ref,
  shallowRef,
  useTemplateRef,
} from "vue";
import {
  type FloatingNode,
  type UseFocusTrapOptions,
  type UseFocusTrapReturn,
  useFloatingNode,
  useFocusTrap,
} from "@/composables";
import { getTestEl } from "@/test-utils";

const cleanupElements: HTMLElement[] = [];

function createOutsideButton(id = "outside"): HTMLButtonElement {
  // Created on demand with the same timing as the legacy suite: buttons that
  // tests move focus to must be appended after open, otherwise modal
  // isolation marks them inert and focus() becomes a no-op.
  const outsideEl = document.createElement("button");
  outsideEl.id = id;
  outsideEl.textContent = id;
  document.body.appendChild(outsideEl);
  cleanupElements.push(outsideEl);
  return outsideEl;
}

function createTestComponent(options: UseFocusTrapOptions = {}, initialOpen = false) {
  const openRef = ref(initialOpen);
  let node!: FloatingNode;
  let result!: UseFocusTrapReturn;

  const Component = defineComponent(() => {
    const anchorTemplateEl = useTemplateRef<HTMLButtonElement>("anchor");
    const floatingTemplateEl = useTemplateRef<HTMLDivElement>("floating");
    // Writable mirrors so tests can detach refs mid-flight. Synced on mount.
    const anchorRef = shallowRef<HTMLButtonElement | null>(null);
    const floatingRef = shallowRef<HTMLDivElement | null>(null);

    node = useFloatingNode({
      anchorEl: anchorRef,
      floatingEl: floatingRef,
      open: openRef,
    });
    result = useFocusTrap(node, options);

    onMounted(() => {
      anchorRef.value = anchorTemplateEl.value;
      floatingRef.value = floatingTemplateEl.value;
    });

    return () =>
      h("div", { class: "test-wrapper" }, [
        h("button", { ref: "anchor", "data-testid": "anchor", type: "button" }, "Anchor"),
        h("div", { id: "floating", ref: "floating", "data-testid": "floating", tabindex: -1 }),
      ]);
  });

  return {
    Component,
    getNode: () => node,
    getResult: () => result,
    openRef,
  };
}

function createTreeComponent() {
  const parentOpen = ref(true);
  const childOpen = ref(true);
  let result!: UseFocusTrapReturn;

  const Component = defineComponent(() => {
    const parentAnchorEl = useTemplateRef<HTMLButtonElement>("parent-anchor");
    const parentFloatingEl = useTemplateRef<HTMLDivElement>("parent-floating");
    const childAnchorEl = useTemplateRef<HTMLButtonElement>("child-anchor");
    const childFloatingEl = useTemplateRef<HTMLDivElement>("child-floating");

    const parentNode = useFloatingNode({
      anchorEl: parentAnchorEl,
      floatingEl: parentFloatingEl,
      open: parentOpen,
    });
    useFloatingNode({
      anchorEl: childAnchorEl,
      floatingEl: childFloatingEl,
      open: childOpen,
      parent: parentNode,
    });
    result = useFocusTrap(parentNode, { modal: true });

    return () =>
      h("div", { class: "test-wrapper" }, [
        h("button", { ref: "parent-anchor", "data-testid": "parent-anchor", type: "button" }, [
          "Parent anchor",
        ]),
        h("div", { ref: "parent-floating", "data-testid": "parent-floating", tabindex: -1 }, [
          "Parent panel",
          h("button", { "data-testid": "parent-inside", type: "button" }, "Parent inside"),
          h("button", { ref: "child-anchor", "data-testid": "child-anchor", type: "button" }, [
            "Child anchor",
          ]),
        ]),
        h("div", { ref: "child-floating", "data-testid": "child-floating", tabindex: -1 }, [
          "Child panel",
          h("button", { "data-testid": "child-inside", type: "button" }, "Child inside"),
        ]),
        h("button", { "data-testid": "outside", type: "button" }, "Outside"),
      ]);
  });

  return { Component, getResult: () => result, parentOpen, childOpen };
}

function createTwoTrapsComponent() {
  const openA = ref(false);
  const openB = ref(false);
  let resultA!: UseFocusTrapReturn;
  let resultB!: UseFocusTrapReturn;

  const Component = defineComponent(() => {
    const anchorA = useTemplateRef<HTMLButtonElement>("anchor-a");
    const floatingA = useTemplateRef<HTMLDivElement>("floating-a");
    const anchorB = useTemplateRef<HTMLButtonElement>("anchor-b");
    const floatingB = useTemplateRef<HTMLDivElement>("floating-b");

    const nodeA = useFloatingNode({ anchorEl: anchorA, floatingEl: floatingA, open: openA });
    const nodeB = useFloatingNode({ anchorEl: anchorB, floatingEl: floatingB, open: openB });
    resultA = useFocusTrap(nodeA, { modal: true });
    resultB = useFocusTrap(nodeB, { modal: true });

    return () =>
      h("div", { class: "test-wrapper" }, [
        h("button", { ref: "anchor-a", "data-testid": "anchor-a", type: "button" }, "Anchor A"),
        h("div", { ref: "floating-a", "data-testid": "floating-a", tabindex: -1 }, "Panel A"),
        h("button", { ref: "anchor-b", "data-testid": "anchor-b", type: "button" }, "Anchor B"),
        h("div", { ref: "floating-b", "data-testid": "floating-b", tabindex: -1 }, "Panel B"),
      ]);
  });

  return {
    Component,
    openA,
    openB,
    getResultA: () => resultA,
    getResultB: () => resultB,
  };
}

function appendButton(container: HTMLElement, id: string, text = id): HTMLButtonElement {
  const button = document.createElement("button");
  button.id = id;
  button.textContent = text;
  container.appendChild(button);
  return button;
}

async function flushFocus() {
  await nextTick();
  await vi.runAllTimersAsync();
  await nextTick();
}

interface TrapFixture {
  anchorEl: HTMLButtonElement;
  floatingEl: HTMLDivElement;
  node: FloatingNode;
  openRef: ReturnType<typeof ref<boolean>>;
  result: UseFocusTrapReturn;
}

async function renderTrap(
  options: UseFocusTrapOptions = {},
  initialOpen = false,
): Promise<TrapFixture> {
  const fixture = createTestComponent(options, initialOpen);
  await render(fixture.Component);
  vi.useFakeTimers();
  await nextTick();
  return {
    anchorEl: getTestEl("anchor") as HTMLButtonElement,
    floatingEl: getTestEl("floating") as HTMLDivElement,
    node: fixture.getNode(),
    openRef: fixture.openRef,
    result: fixture.getResult(),
  };
}

async function renderTreeTrap() {
  const fixture = createTreeComponent();
  const view = await render(fixture.Component);
  vi.useFakeTimers();
  await nextTick();
  return {
    parentFloatingEl: getTestEl("parent-floating", view.container),
    childFloatingEl: getTestEl("child-floating", view.container),
    result: fixture.getResult(),
    parentOpen: fixture.parentOpen,
    childOpen: fixture.childOpen,
  };
}

async function openTrap(ctx: TrapFixture) {
  ctx.node.open.value = true;
  await flushFocus();
}

describe("Feature: useFocusTrap", () => {
  afterEach(() => {
    for (const el of cleanupElements) {
      el.remove();
    }
    cleanupElements.length = 0;
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe("Scenario: Focus containment and initial focus orchestration", () => {
    it("Given a custom ref target, When the floating node opens, Then focus moves to the specified target", async () => {
      const targetRef = ref<HTMLElement | null>(null);
      const ctx = await renderTrap({ initialFocus: targetRef });
      const target = appendButton(ctx.floatingEl, "target");
      targetRef.value = target;

      await openTrap(ctx);
      await expect.element(target).toHaveFocus();
    });

    it("Given multiple tabbable elements, When opened without explicit target, Then focus moves to the first tabbable element by default", async () => {
      const ctx = await renderTrap();
      const first = appendButton(ctx.floatingEl, "first");
      appendButton(ctx.floatingEl, "second");

      await openTrap(ctx);
      await expect.element(first).toHaveFocus();
    });

    it("Given no tabbable children exist, When opened, Then focus falls back to the floating element itself", async () => {
      const ctx = await renderTrap();

      await openTrap(ctx);
      await expect.element(ctx.floatingEl).toHaveFocus();
    });

    it("Given a modal focus trap, When tabbing forward and backward, Then focus wraps within boundary elements", async () => {
      const ctx = await renderTrap({ modal: true });
      const first = appendButton(ctx.floatingEl, "first");
      const middle = appendButton(ctx.floatingEl, "middle");
      const last = appendButton(ctx.floatingEl, "last");

      await openTrap(ctx);
      await expect.element(first).toHaveFocus();

      middle.focus();
      await expect.element(middle).toHaveFocus();

      last.focus();
      await expect.element(last).toHaveFocus();

      // Tab on last element wraps to first
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", cancelable: true }));
      await expect.element(first).toHaveFocus();

      // Shift+Tab on first element wraps to last
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Tab", shiftKey: true, cancelable: true }),
      );
      await expect.element(last).toHaveFocus();
    });

    it("Given an initialFocus getter function, When opened, Then focus moves to the element returned by the function", async () => {
      const ctx = await renderTrap({
        initialFocus: () => document.querySelector<HTMLElement>("#fn-target"),
      });
      const target = appendButton(ctx.floatingEl, "fn-target");

      await openTrap(ctx);
      await expect.element(target).toHaveFocus();
    });

    it("Given initialFocus is set to false, When opened, Then previous focus remains undisturbed", async () => {
      const previousFocus = createOutsideButton("prev");
      previousFocus.focus();
      const ctx = await renderTrap({ initialFocus: false, modal: false });
      appendButton(ctx.floatingEl, "btn");

      await openTrap(ctx);
      await expect.element(previousFocus).toHaveFocus();
    });

    it("Given initialFocus is passed as a direct HTMLElement reference, When opened, Then focus moves directly to that element", async () => {
      const customTarget = document.createElement("button");
      customTarget.id = "ref-target";
      cleanupElements.push(customTarget);
      const ctx = await renderTrap({ initialFocus: customTarget });
      ctx.floatingEl.appendChild(customTarget);

      await openTrap(ctx);
      await expect.element(customTarget).toHaveFocus();
    });
  });

  describe("Scenario: DOM cleanliness and boundary wrapping", () => {
    it("Given an active modal focus trap, When inspected, Then no artificial focus-guard sentinel nodes are injected into DOM", async () => {
      const ctx = await renderTrap({ modal: true });
      await openTrap(ctx);

      const guards = document.querySelectorAll("[data-vfloat-focus-guard]");
      expect(guards.length).toBe(0);
    });

    it("Given edge tabbable elements, When Tab or Shift+Tab keydown events occur at document level, Then focus wraps to opposite boundaries", async () => {
      const ctx = await renderTrap({ modal: true });
      const first = appendButton(ctx.floatingEl, "first");
      const last = appendButton(ctx.floatingEl, "last");

      await openTrap(ctx);
      await expect.element(first).toHaveFocus();

      // Shift+Tab on first wraps to last
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Tab", shiftKey: true, cancelable: true }),
      );
      await expect.element(last).toHaveFocus();

      // Tab on last wraps to first
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", cancelable: true }));
      await expect.element(first).toHaveFocus();
    });
  });

  describe("Scenario: Return focus coordination", () => {
    it("Given returnFocus is enabled, When floating node closes, Then focus returns to the anchor trigger element", async () => {
      const previousFocus = createOutsideButton("prev");
      const ctx = await renderTrap({ returnFocus: true });
      previousFocus.focus();
      appendButton(ctx.floatingEl, "btn");

      await openTrap(ctx);
      await expect.element(ctx.anchorEl).not.toHaveFocus();

      ctx.node.open.value = false;
      await flushFocus();

      await expect.element(ctx.anchorEl).toHaveFocus();
    });

    it("Given anchor element is removed from DOM, When floating node closes, Then focus falls back to previously active element", async () => {
      const previousFocus = createOutsideButton("prev");
      const ctx = await renderTrap({ returnFocus: true });
      previousFocus.focus();
      ctx.anchorEl.remove();
      ctx.node.refs.anchorEl.value = null;
      appendButton(ctx.floatingEl, "btn");

      await openTrap(ctx);
      await expect.element(previousFocus).not.toHaveFocus();

      ctx.node.open.value = false;
      await flushFocus();

      await expect.element(previousFocus).toHaveFocus();
    });

    it("Given a custom returnFocus element reference, When floating node closes, Then focus returns to the custom element", async () => {
      const customEl = createOutsideButton("custom-return");
      const ctx = await renderTrap({ returnFocus: customEl });
      appendButton(ctx.floatingEl, "btn");

      await openTrap(ctx);
      ctx.node.open.value = false;
      await flushFocus();

      await expect.element(customEl).toHaveFocus();
    });

    it("Given returnFocus is disabled, When floating node closes, Then previously active focus is not restored", async () => {
      const previousFocus = createOutsideButton("prev");
      const ctx = await renderTrap({ returnFocus: false });
      previousFocus.focus();
      appendButton(ctx.floatingEl, "btn");

      await openTrap(ctx);
      ctx.node.open.value = false;
      await flushFocus();

      await expect.element(previousFocus).not.toHaveFocus();
    });

    it("Given focus naturally moves to an outside element while open, When floating node closes, Then focus is not hijacked back to anchor", async () => {
      const ctx = await renderTrap({ returnFocus: true });
      appendButton(ctx.floatingEl, "btn");

      await openTrap(ctx);

      // Created after open so modal isolation does not mark it inert.
      // Simulate focus moving outside naturally (e.g., via Tab or manual focus)
      const outsideFocus = createOutsideButton("natural-outside");
      outsideFocus.focus();

      // Close the floating element
      ctx.node.open.value = false;
      await flushFocus();

      // Focus should remain on the outside element, not restored to anchor
      await expect.element(outsideFocus).toHaveFocus();
    });

    it("Given an outside pointerdown interaction is detected during closure, When floating node closes, Then return focus is suppressed", async () => {
      const previousFocus = createOutsideButton("prev");
      const ctx = await renderTrap({ returnFocus: true });
      previousFocus.focus();
      appendButton(ctx.floatingEl, "btn");

      await openTrap(ctx);

      const outsideButton = createOutsideButton("outside-button");

      // Simulate pointerdown on the outside button
      outsideButton.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

      // Suppose the outside component or useEscapeKey/useOutsideClick closes the floating element synchronously
      ctx.node.open.value = false;
      await flushFocus();

      // Focus should NOT be pulled back to `prev` because of the outside pointerdown interaction
      await expect.element(previousFocus).not.toHaveFocus();
    });
  });

  describe("Scenario: Non-modal dismissal and outside focus filtering", () => {
    it("Given closeOnFocusOut is enabled, When document focusin occurs on an outside element, Then floating node closes", async () => {
      const outsideEl = createOutsideButton();
      const ctx = await renderTrap({ modal: false, closeOnFocusOut: true });
      appendButton(ctx.floatingEl, "btn");

      await openTrap(ctx);
      expect(ctx.node.open.value).toBe(true);

      outsideEl.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
      await flushFocus();

      expect(ctx.node.open.value).toBe(false);
    });

    it("Given a non-modal trap, When pointerdown occurs outside, Then trap leaves dismissal to dedicated outside-click composable", async () => {
      const outsideEl = createOutsideButton();
      const ctx = await renderTrap({ modal: false, closeOnFocusOut: true });
      appendButton(ctx.floatingEl, "btn");

      await openTrap(ctx);
      expect(ctx.node.open.value).toBe(true);

      outsideEl.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      await flushFocus();

      expect(ctx.node.open.value).toBe(true);
    });

    it("Given an ignoreFocusOut predicate, When focus moves to an ignored target, Then floating node remains open", async () => {
      const ignoredEl = createOutsideButton("ignored");
      const outsideEl = createOutsideButton("outside");

      const ctx = await renderTrap({
        modal: false,
        closeOnFocusOut: true,
        ignoreFocusOut: (target) => target === ignoredEl,
      });
      appendButton(ctx.floatingEl, "btn");

      await openTrap(ctx);

      ignoredEl.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
      await flushFocus();
      expect(ctx.node.open.value).toBe(true);

      outsideEl.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
      await flushFocus();
      expect(ctx.node.open.value).toBe(false);
    });
  });

  describe("Scenario: Background isolation and inert stacking", () => {
    it("Given a modal focus trap opens, When inspected, Then outside background elements receive inert isolation and recover on close", async () => {
      const outsideEl = createOutsideButton();
      const ctx = await renderTrap({ modal: true });
      appendButton(ctx.floatingEl, "btn");

      await openTrap(ctx);

      const hasIsolation =
        outsideEl.getAttribute("aria-hidden") === "true" ||
        outsideEl.hasAttribute("inert") ||
        (outsideEl as any).inert === true;
      expect(hasIsolation).toBe(true);

      ctx.node.open.value = false;
      await flushFocus();

      expect(outsideEl.hasAttribute("aria-hidden")).toBe(false);
      expect(outsideEl.hasAttribute("inert")).toBe(false);
    });
  });

  describe("Scenario: Nested floating nodes and parent-child containment", () => {
    it("Given nested parent and child floating nodes, When focus moves into child panel, Then parent node remains open without premature closure", async () => {
      const ctx = await renderTreeTrap();

      appendButton(ctx.parentFloatingEl, "parent-btn");
      const childBtn = appendButton(ctx.childFloatingEl, "child-btn");

      await flushFocus();
      expect(ctx.result.isActive.value).toBe(true);

      // Focus inside child floating element must not close parent
      childBtn.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
      await flushFocus();

      expect(ctx.parentOpen.value).toBe(true);
    });
  });

  describe("Scenario: Lifecycle and manual controls", () => {
    it("Given manual trap controls, When deactivate is invoked, Then floating node open state transitions to false", async () => {
      const ctx = await renderTrap({}, true);
      appendButton(ctx.floatingEl, "btn");

      await flushFocus();
      expect(ctx.result.isActive.value).toBe(true);

      ctx.result.deactivate();
      await flushFocus();

      expect(ctx.node.open.value).toBe(false);
    });

    it("Given floating element ref is initially null, When element is mounted asynchronously, Then trap activates without closing open state prematurely", async () => {
      const ctx = await renderTrap();
      ctx.node.refs.floatingEl.value = null;

      ctx.node.open.value = true;
      await flushFocus();

      expect(ctx.node.open.value).toBe(true);
      expect(ctx.result.isActive.value).toBe(false);

      // Now mount the floating element
      ctx.node.refs.floatingEl.value = ctx.floatingEl;
      await flushFocus();

      expect(ctx.result.isActive.value).toBe(true);
    });
  });

  describe("Scenario: Containment regressions and edge cases", () => {
    it("Given focus escaped outside programmatically, When Tab keydown is dispatched, Then focus wraps back inside the trap", async () => {
      const ctx = await renderTrap();
      const btn = appendButton(ctx.floatingEl, "btn");
      const outsideEl = createOutsideButton();
      await openTrap(ctx);

      // Programmatic escape: no focusout ever fires from the panel.
      outsideEl.focus();
      await flushFocus();

      outsideEl.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true }));
      await flushFocus();

      await expect.element(btn).toHaveFocus();
    });

    it("Given focus lands outside programmatically, When focusin fires, Then focus is pulled back inside floating element", async () => {
      const ctx = await renderTrap();
      const btn = appendButton(ctx.floatingEl, "btn");
      const outsideEl = createOutsideButton();
      await openTrap(ctx);

      outsideEl.focus();
      outsideEl.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
      await flushFocus();

      await expect.element(btn).toHaveFocus();
    });

    it("Given floating panel lacked a tabindex, When trap closes, Then temporary fallback tabindex is completely removed", async () => {
      const ctx = await renderTrap();
      // Panel starts without tabindex and has no tabbable children.
      ctx.floatingEl.removeAttribute("tabindex");
      await openTrap(ctx);

      expect(ctx.floatingEl.getAttribute("tabindex")).toBe("-1");

      ctx.node.open.value = false;
      await flushFocus();

      expect(ctx.floatingEl.hasAttribute("tabindex")).toBe(false);
    });

    it("Given focus moved synchronously before trap activation, When closed, Then focus returns to opener captured at invocation", async () => {
      const ctx = await renderTrap();
      const middle = createOutsideButton("middle");
      await nextTick();

      ctx.anchorEl.focus();
      ctx.node.open.value = true;
      // Sync focus move between open=true and nextTick must not hijack return focus.
      middle.focus();
      await flushFocus();

      ctx.node.open.value = false;
      await flushFocus();

      await expect.element(ctx.anchorEl).toHaveFocus();
    });

    it("Given two independent stacked modals, When first modal closes, Then shared background remains inert until all modals close", async () => {
      const fixture = createTwoTrapsComponent();
      await render(fixture.Component);
      vi.useFakeTimers();
      await nextTick();

      const outsideEl = createOutsideButton();

      fixture.openA.value = true;
      await flushFocus();
      fixture.openB.value = true;
      await flushFocus();

      expect(outsideEl.hasAttribute("inert")).toBe(true);
      expect(fixture.getResultA().isActive.value).toBe(true);
      expect(fixture.getResultB().isActive.value).toBe(true);

      // Closing A first must not un-inert the background while B is open.
      fixture.openA.value = false;
      await flushFocus();
      expect(outsideEl.hasAttribute("inert")).toBe(true);

      fixture.openB.value = false;
      await flushFocus();
      expect(outsideEl.hasAttribute("inert")).toBe(false);
    });

    it("Given outside pointerdown followed by immediate inside re-focus, When subsequent outside focus occurs, Then containment is still enforced", async () => {
      const ctx = await renderTrap();
      const btn = appendButton(ctx.floatingEl, "btn");
      const outsideEl = createOutsideButton();
      await openTrap(ctx);

      document.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      // Keyboard user Tabs back inside within the 100ms suppression window.
      btn.focus();
      btn.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
      await flushFocus();

      await expect.element(btn).toHaveFocus();

      // A subsequent outside focus jump is still corrected, not ignored.
      outsideEl.focus();
      outsideEl.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
      await flushFocus();

      await expect.element(btn).toHaveFocus();
    });
  });

  describe("Scenario: Cross-realm iframe support", () => {
    it("Given a floating node inside an iframe document, When opened, Then focus is trapped inside iframe without top-realm sentinels", async () => {
      const iframe = document.createElement("iframe");
      document.body.appendChild(iframe);
      cleanupElements.push(iframe);

      const iframeDoc = iframe.contentDocument!;
      const anchorEl = iframeDoc.createElement("button");
      anchorEl.id = "iframe-anchor";
      iframeDoc.body.appendChild(anchorEl);

      const floatingEl = iframeDoc.createElement("div");
      floatingEl.id = "iframe-floating";
      iframeDoc.body.appendChild(floatingEl);

      const button = iframeDoc.createElement("button");
      button.id = "iframe-btn";
      floatingEl.appendChild(button);

      const open = ref(false);

      const node: FloatingNode = useFloatingNode({
        anchorEl: ref(anchorEl),
        floatingEl: ref(floatingEl),
        open,
      });

      const scope = effectScope();

      scope.run(() => {
        useFocusTrap(node, { modal: true });
      });

      vi.useFakeTimers();
      open.value = true;
      await flushFocus();

      // Cross-realm check: Vitest's `expect.element(button)` fails cross-realm instanceof HTMLElement check,
      // so inspect the iframe realm activeElement directly.
      expect(iframeDoc.activeElement).toBe(button);
      expect(iframeDoc.querySelectorAll("[data-vfloat-focus-guard]").length).toBe(0);

      scope.stop();
    });
  });
});
