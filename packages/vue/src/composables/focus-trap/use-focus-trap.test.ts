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
import { clearTrackedElements, getTestEl, trackElement } from "@/test-utils";

function createOutsideButton(id = "outside"): HTMLButtonElement {
  // Created on demand with the same timing as the legacy suite: buttons that
  // tests move focus to must be appended after open, otherwise modal
  // isolation marks them inert and focus() becomes a no-op.
  const outsideEl = trackElement(document.createElement("button"));
  outsideEl.id = id;
  outsideEl.textContent = id;
  document.body.appendChild(outsideEl);
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

describe("useFocusTrap", () => {
  afterEach(() => {
    // Drains iframe fixtures, the only non-render DOM left in this file.
    clearTrackedElements();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe("focus containment", () => {
    it("focuses initial focus element if specified as ref", async () => {
      const targetRef = ref<HTMLElement | null>(null);
      const ctx = await renderTrap({ initialFocus: targetRef });
      const target = appendButton(ctx.floatingEl, "target");
      targetRef.value = target;

      await openTrap(ctx);
      expect(document.activeElement).toBe(target);
    });

    it("focuses first tabbable element by default", async () => {
      const ctx = await renderTrap();
      const first = appendButton(ctx.floatingEl, "first");
      appendButton(ctx.floatingEl, "second");

      await openTrap(ctx);
      expect(document.activeElement).toBe(first);
    });

    it("falls back to floating element when no tabbable elements exist", async () => {
      const ctx = await renderTrap();

      await openTrap(ctx);
      expect(document.activeElement).toBe(ctx.floatingEl);
    });

    it("traps focus within floating element during forward and backward Tab cycles", async () => {
      const ctx = await renderTrap({ modal: true });
      const first = appendButton(ctx.floatingEl, "first");
      const middle = appendButton(ctx.floatingEl, "middle");
      const last = appendButton(ctx.floatingEl, "last");

      await openTrap(ctx);
      expect(document.activeElement).toBe(first);

      middle.focus();
      expect(document.activeElement).toBe(middle);

      last.focus();
      expect(document.activeElement).toBe(last);

      // Simulating tab boundary wrap-around via focus guards
      const startGuard = document.querySelector<HTMLElement>('[data-vfloat-focus-guard="start"]');
      const endGuard = document.querySelector<HTMLElement>('[data-vfloat-focus-guard="end"]');

      expect(startGuard).toBeTruthy();
      expect(endGuard).toBeTruthy();

      startGuard!.focus();
      await flushFocus();
      expect(document.activeElement).toBe(last);

      endGuard!.focus();
      await flushFocus();
      expect(document.activeElement).toBe(first);
    });

    it("accepts a function for initialFocus", async () => {
      const ctx = await renderTrap({
        initialFocus: () => document.querySelector<HTMLElement>("#fn-target"),
      });
      const target = appendButton(ctx.floatingEl, "fn-target");

      await openTrap(ctx);
      expect(document.activeElement).toBe(target);
    });

    it("handles initialFocus: false (does not focus on open)", async () => {
      const previousFocus = createOutsideButton("prev");
      previousFocus.focus();
      const ctx = await renderTrap({ initialFocus: false, modal: false });
      appendButton(ctx.floatingEl, "btn");

      await openTrap(ctx);
      expect(document.activeElement).toBe(previousFocus);
    });

    it("handles initialFocus as HTMLElement ref directly", async () => {
      const customTarget = trackElement(document.createElement("button"));
      customTarget.id = "ref-target";
      const ctx = await renderTrap({ initialFocus: customTarget });
      ctx.floatingEl.appendChild(customTarget);

      await openTrap(ctx);
      expect(document.activeElement).toBe(customTarget);
    });
  });

  describe("focus guards", () => {
    it("inserts start and end focus guards with guards: true", async () => {
      const ctx = await renderTrap({ guards: true });

      await openTrap(ctx);

      const startGuard = document.querySelector('[data-vfloat-focus-guard="start"]');
      const endGuard = document.querySelector('[data-vfloat-focus-guard="end"]');

      expect(startGuard).toBeTruthy();
      expect(endGuard).toBeTruthy();
      expect(startGuard?.getAttribute("tabindex")).toBe("0");
      expect(endGuard?.getAttribute("tabindex")).toBe("0");
      expect(startGuard?.getAttribute("aria-hidden")).toBe("true");
      expect(endGuard?.getAttribute("aria-hidden")).toBe("true");
    });

    it("omits focus guards when guards: false", async () => {
      const ctx = await renderTrap({ guards: false });

      await openTrap(ctx);

      const startGuard = document.querySelector('[data-vfloat-focus-guard="start"]');
      const endGuard = document.querySelector('[data-vfloat-focus-guard="end"]');

      expect(startGuard).toBeNull();
      expect(endGuard).toBeNull();
    });

    it("wraps focus between start and end guards correctly", async () => {
      const ctx = await renderTrap({ guards: true, modal: true });
      const first = appendButton(ctx.floatingEl, "first");
      const last = appendButton(ctx.floatingEl, "last");

      await openTrap(ctx);

      const startGuard = document.querySelector<HTMLElement>('[data-vfloat-focus-guard="start"]')!;
      const endGuard = document.querySelector<HTMLElement>('[data-vfloat-focus-guard="end"]')!;

      startGuard.focus();
      await flushFocus();
      expect(document.activeElement).toBe(last);

      endGuard.focus();
      await flushFocus();
      expect(document.activeElement).toBe(first);
    });
  });

  describe("return focus", () => {
    it("returns focus to the anchor trigger element on close", async () => {
      const previousFocus = createOutsideButton("prev");
      const ctx = await renderTrap({ returnFocus: true });
      previousFocus.focus();
      appendButton(ctx.floatingEl, "btn");

      await openTrap(ctx);
      expect(document.activeElement).not.toBe(ctx.anchorEl);

      ctx.node.open.value = false;
      await flushFocus();

      expect(document.activeElement).toBe(ctx.anchorEl);
    });

    it("falls back to previously active element when anchor is unavailable", async () => {
      const previousFocus = createOutsideButton("prev");
      const ctx = await renderTrap({ returnFocus: true });
      previousFocus.focus();
      ctx.anchorEl.remove();
      ctx.node.refs.anchorEl.value = null;
      appendButton(ctx.floatingEl, "btn");

      await openTrap(ctx);
      expect(document.activeElement).not.toBe(previousFocus);

      ctx.node.open.value = false;
      await flushFocus();

      expect(document.activeElement).toBe(previousFocus);
    });

    it("supports returning focus to a custom element ref", async () => {
      const customEl = createOutsideButton("custom-return");
      const ctx = await renderTrap({ returnFocus: customEl });
      appendButton(ctx.floatingEl, "btn");

      await openTrap(ctx);
      ctx.node.open.value = false;
      await flushFocus();

      expect(document.activeElement).toBe(customEl);
    });

    it("does not return focus when returnFocus is false", async () => {
      const previousFocus = createOutsideButton("prev");
      const ctx = await renderTrap({ returnFocus: false });
      previousFocus.focus();
      appendButton(ctx.floatingEl, "btn");

      await openTrap(ctx);
      ctx.node.open.value = false;
      await flushFocus();

      expect(document.activeElement).not.toBe(previousFocus);
    });

    it("does not hijack focus when focus naturally moves to an outside element", async () => {
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
      expect(document.activeElement).toBe(outsideFocus);
    });

    it("does not hijack focus when an outside pointerdown interaction is detected", async () => {
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
      expect(document.activeElement).not.toBe(previousFocus);
    });
  });

  describe("non-modal & dismissal behavior", () => {
    it("closes on document focusin when closeOnFocusOut is true", async () => {
      const outsideEl = createOutsideButton();
      const ctx = await renderTrap({ modal: false, closeOnFocusOut: true });
      appendButton(ctx.floatingEl, "btn");

      await openTrap(ctx);
      expect(ctx.node.open.value).toBe(true);

      outsideEl.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
      await flushFocus();

      expect(ctx.node.open.value).toBe(false);
    });

    it("does not close on outside pointerdown (delegated to useOutsideClick)", async () => {
      const outsideEl = createOutsideButton();
      const ctx = await renderTrap({ modal: false, closeOnFocusOut: true });
      appendButton(ctx.floatingEl, "btn");

      await openTrap(ctx);
      expect(ctx.node.open.value).toBe(true);

      outsideEl.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      await flushFocus();

      expect(ctx.node.open.value).toBe(true);
    });

    it("respects ignoreFocusOut predicate", async () => {
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

    it("closes on Tab when closeOnTab is true", async () => {
      const ctx = await renderTrap({ modal: false, closeOnTab: true });
      appendButton(ctx.floatingEl, "btn");

      await openTrap(ctx);

      ctx.floatingEl.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true }),
      );
      await flushFocus();

      expect(ctx.node.open.value).toBe(false);
    });
  });

  describe("background isolation", () => {
    it("isolates outside content with aria-hidden or inert and restores on close", async () => {
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

  describe("nested floating nodes", () => {
    it("coordinates parent and child nodes without premature closing", async () => {
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

  describe("lifecycle & manual controls", () => {
    it("supports manual activate and deactivate methods", async () => {
      const ctx = await renderTrap({}, true);
      appendButton(ctx.floatingEl, "btn");

      await flushFocus();
      expect(ctx.result.isActive.value).toBe(true);

      ctx.result.deactivate();
      await flushFocus();

      expect(ctx.node.open.value).toBe(false);
    });

    it("handles missing floating element gracefully without closing open state prematurely", async () => {
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

  describe("containment regressions", () => {
    it("wraps Tab at the document level even when focus escaped to an outside element", async () => {
      const ctx = await renderTrap();
      appendButton(ctx.floatingEl, "btn");
      const outsideEl = createOutsideButton();
      await openTrap(ctx);

      // Programmatic escape: no focusout ever fires from the panel.
      outsideEl.focus();
      await flushFocus();

      outsideEl.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true }));
      await flushFocus();

      expect(document.activeElement?.id).toBe("btn");
    });

    it("pulls focus back inside when focus lands outside programmatically", async () => {
      const ctx = await renderTrap();
      appendButton(ctx.floatingEl, "btn");
      const outsideEl = createOutsideButton();
      await openTrap(ctx);

      outsideEl.focus();
      outsideEl.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
      await flushFocus();

      expect(document.activeElement?.id).toBe("btn");
    });

    it("removes the temporary fallback tabindex from the panel after close", async () => {
      const ctx = await renderTrap();
      // Panel starts without tabindex and has no tabbable children.
      ctx.floatingEl.removeAttribute("tabindex");
      await openTrap(ctx);

      expect(ctx.floatingEl.getAttribute("tabindex")).toBe("-1");

      ctx.node.open.value = false;
      await flushFocus();

      expect(ctx.floatingEl.hasAttribute("tabindex")).toBe(false);
    });

    it("restores focus to the opener captured synchronously, even if focus moved before activation", async () => {
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

      expect(document.activeElement).toBe(ctx.anchorEl);
    });

    it("stacks two independent modals and keeps the shared background inert after the first closes", async () => {
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

    it("re-focusing inside after an outside pointerdown is not swallowed by the pointer window", async () => {
      const ctx = await renderTrap();
      const btn = appendButton(ctx.floatingEl, "btn");
      const outsideEl = createOutsideButton();
      await openTrap(ctx);

      document.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      // Keyboard user Tabs back inside within the 100ms suppression window.
      btn.focus();
      btn.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
      await flushFocus();

      expect(document.activeElement).toBe(btn);

      // A subsequent outside focus jump is still corrected, not ignored.
      outsideEl.focus();
      outsideEl.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
      await flushFocus();

      expect(document.activeElement?.id).toBe("btn");
    });
  });

  describe("cross-realm iframe support", () => {
    it("manages focus and guards inside an iframe document", async () => {
      const iframe = trackElement(document.createElement("iframe"));
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentDocument!;
      const anchorEl = trackElement(iframeDoc.createElement("button"));
      anchorEl.id = "iframe-anchor";
      iframeDoc.body.appendChild(anchorEl);

      const floatingEl = trackElement(iframeDoc.createElement("div"));
      floatingEl.id = "iframe-floating";
      iframeDoc.body.appendChild(floatingEl);

      const button = trackElement(iframeDoc.createElement("button"));
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
        useFocusTrap(node, { modal: true, guards: true });
      });

      vi.useFakeTimers();
      open.value = true;
      await flushFocus();

      const startGuard = iframeDoc.querySelector('[data-vfloat-focus-guard="start"]');
      const endGuard = iframeDoc.querySelector('[data-vfloat-focus-guard="end"]');

      expect(startGuard).toBeTruthy();
      expect(endGuard).toBeTruthy();
      expect(iframeDoc.activeElement).toBe(button);

      scope.stop();
    });
  });
});
