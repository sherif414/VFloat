import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-vue";
import { page } from "vitest/browser";
import {
  defineComponent,
  h,
  nextTick,
  onMounted,
  ref,
  type Ref,
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

interface ButtonConfig {
  id: string;
  text?: string;
  tabindex?: number;
}

interface FixtureConfig {
  defaultOpen?: boolean;
  buttons?: Array<string | ButtonConfig>;
  withOutside?: boolean;
  outsideId?: string;
  withIgnored?: boolean;
  floatingTabindex?: number;
}

function createTestComponent(
  options:
    | UseFocusTrapOptions
    | ((handles: {
        getRawButtonEl: (id: string) => HTMLButtonElement;
      }) => UseFocusTrapOptions) = {},
  initialOpen = false,
  config: FixtureConfig = {},
) {
  const openRef = ref(initialOpen);
  const buttonsRef = ref<Array<string | ButtonConfig>>(config.buttons ?? []);
  const showOutside = ref(config.withOutside ?? false);
  let node!: FloatingNode;
  let result!: UseFocusTrapReturn;

  const Component = defineComponent(() => {
    const anchorTemplateEl = useTemplateRef<HTMLButtonElement>("anchor");
    const floatingTemplateEl = useTemplateRef<HTMLDivElement>("floating");
    const anchorRef = shallowRef<HTMLButtonElement | null>(null);
    const floatingRef = shallowRef<HTMLDivElement | null>(null);

    node = useFloatingNode({
      anchorEl: anchorRef,
      floatingEl: floatingRef,
      open: openRef,
    });

    const resolvedOptions =
      typeof options === "function"
        ? options({
            getRawButtonEl: (id: string) => getTestEl(id) as HTMLButtonElement,
          })
        : options;

    result = useFocusTrap(node, resolvedOptions);

    onMounted(() => {
      anchorRef.value = anchorTemplateEl.value;
      floatingRef.value = floatingTemplateEl.value;
    });

    return () =>
      h("div", { class: "test-wrapper" }, [
        h("button", { ref: "anchor", "data-testid": "anchor", type: "button" }, "Anchor"),
        h(
          "div",
          {
            id: "floating",
            ref: "floating",
            "data-testid": "floating",
            tabindex: config.floatingTabindex ?? -1,
          },
          buttonsRef.value.map((btn) => {
            const btnConfig = typeof btn === "string" ? { id: btn } : btn;
            return h(
              "button",
              {
                key: btnConfig.id,
                id: btnConfig.id,
                "data-testid": btnConfig.id,
                type: "button",
                tabindex: btnConfig.tabindex,
              },
              btnConfig.text ?? btnConfig.id,
            );
          }),
        ),
        showOutside.value
          ? h(
              "button",
              {
                id: config.outsideId ?? "outside",
                "data-testid": config.outsideId ?? "outside",
                type: "button",
              },
              config.outsideId ?? "outside",
            )
          : null,
        config.withIgnored
          ? h("button", { id: "ignored", "data-testid": "ignored", type: "button" }, "ignored")
          : null,
      ]);
  });

  return {
    Component,
    getNode: () => node,
    getResult: () => result,
    openRef,
    buttonsRef,
    showOutside,
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
          h(
            "button",
            { id: "parent-inside", "data-testid": "parent-inside", type: "button" },
            "Parent inside",
          ),
          h("button", { ref: "child-anchor", "data-testid": "child-anchor", type: "button" }, [
            "Child anchor",
          ]),
        ]),
        h("div", { ref: "child-floating", "data-testid": "child-floating", tabindex: -1 }, [
          "Child panel",
          h(
            "button",
            { id: "child-inside", "data-testid": "child-inside", type: "button" },
            "Child inside",
          ),
        ]),
        h("button", { id: "outside", "data-testid": "outside", type: "button" }, "Outside"),
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
        h("button", { id: "outside", "data-testid": "outside", type: "button" }, "Outside"),
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

async function flushFocus() {
  await nextTick();
  await vi.runAllTimersAsync();
  await nextTick();
}

interface TrapFixture {
  anchorEl: ReturnType<typeof page.getByTestId>;
  floatingEl: ReturnType<typeof page.getByTestId>;
  rawAnchorEl: HTMLButtonElement;
  rawFloatingEl: HTMLDivElement;
  outsideEl: ReturnType<typeof page.getByTestId>;
  rawOutsideEl: HTMLButtonElement | null;
  ignoredEl: ReturnType<typeof page.getByTestId>;
  rawIgnoredEl: HTMLButtonElement | null;
  node: FloatingNode;
  openRef: Ref<boolean>;
  result: UseFocusTrapReturn;
  buttonsRef: Ref<Array<string | ButtonConfig>>;
  showOutside: Ref<boolean>;
  getButtonEl: (id: string) => ReturnType<typeof page.getByTestId>;
  getRawButtonEl: (id: string) => HTMLButtonElement;
}

async function renderTrap(
  options:
    | UseFocusTrapOptions
    | ((handles: {
        getRawButtonEl: (id: string) => HTMLButtonElement;
      }) => UseFocusTrapOptions) = {},
  initialOpen = false,
  config: FixtureConfig = {},
): Promise<TrapFixture> {
  const fixture = createTestComponent(options, initialOpen, config);
  await render(fixture.Component);
  vi.useFakeTimers();
  await nextTick();

  const outsideId = config.outsideId ?? "outside";

  return {
    anchorEl: page.getByTestId("anchor"),
    floatingEl: page.getByTestId("floating"),
    rawAnchorEl: getTestEl("anchor") as HTMLButtonElement,
    rawFloatingEl: getTestEl("floating") as HTMLDivElement,
    outsideEl: page.getByTestId(outsideId),
    get rawOutsideEl() {
      return getTestEl(outsideId) as HTMLButtonElement | null;
    },
    ignoredEl: page.getByTestId("ignored"),
    get rawIgnoredEl() {
      return getTestEl("ignored") as HTMLButtonElement | null;
    },
    node: fixture.getNode(),
    openRef: fixture.openRef,
    result: fixture.getResult(),
    buttonsRef: fixture.buttonsRef,
    showOutside: fixture.showOutside,
    getButtonEl: (id: string) => page.getByTestId(id),
    getRawButtonEl: (id: string) => getTestEl(id) as HTMLButtonElement,
  };
}

async function renderTreeTrap() {
  const fixture = createTreeComponent();
  const view = await render(fixture.Component);
  vi.useFakeTimers();
  await nextTick();
  return {
    parentFloatingEl: page.getByTestId("parent-floating"),
    childFloatingEl: page.getByTestId("child-floating"),
    rawParentFloatingEl: getTestEl("parent-floating", view.container) as HTMLDivElement,
    rawChildFloatingEl: getTestEl("child-floating", view.container) as HTMLDivElement,
    childBtnEl: page.getByTestId("child-inside"),
    rawChildBtnEl: getTestEl("child-inside", view.container) as HTMLButtonElement,
    result: fixture.getResult(),
    parentOpen: fixture.parentOpen,
    childOpen: fixture.childOpen,
  };
}

async function renderIframeTrap() {
  let iframeDoc: Document | null = null;
  let btnEl: HTMLButtonElement | null = null;
  const openRef = ref(false);

  const Component = defineComponent(() => {
    const iframeTemplateEl = useTemplateRef<HTMLIFrameElement>("iframe");
    const anchorRef = shallowRef<HTMLElement | null>(null);
    const floatingRef = shallowRef<HTMLElement | null>(null);

    const node: FloatingNode = useFloatingNode({
      anchorEl: anchorRef,
      floatingEl: floatingRef,
      open: openRef,
    });

    useFocusTrap(node, { modal: true });

    async function initIframe() {
      const iframe = iframeTemplateEl.value;
      if (!iframe) return;
      const doc = iframe.contentDocument;
      if (!doc) return;
      iframeDoc = doc;

      const anchorEl = doc.createElement("button");
      anchorEl.id = "iframe-anchor";
      doc.body.appendChild(anchorEl);

      const floatingEl = doc.createElement("div");
      floatingEl.id = "iframe-floating";
      doc.body.appendChild(floatingEl);

      const childBtnEl = doc.createElement("button");
      childBtnEl.id = "iframe-btn";
      floatingEl.appendChild(childBtnEl);
      btnEl = childBtnEl;

      anchorRef.value = anchorEl;
      floatingRef.value = floatingEl;
    }

    onMounted(() => {
      const iframe = iframeTemplateEl.value;
      if (iframe?.contentDocument?.readyState === "complete") {
        void initIframe();
      }
    });

    return () =>
      h("div", { class: "test-wrapper" }, [
        h("iframe", {
          ref: "iframe",
          "data-testid": "iframe",
          onLoad: () => void initIframe(),
        }),
      ]);
  });

  await render(Component);
  await nextTick();
  for (let i = 0; i < 50 && !btnEl; i++) {
    await new Promise((r) => setTimeout(r, 10));
  }
  vi.useFakeTimers();
  await nextTick();

  return {
    getIframeDoc: () => iframeDoc!,
    getButtonEl: () => btnEl!,
    openRef,
  };
}

async function openTrap(ctx: TrapFixture) {
  ctx.node.open.value = true;
  await flushFocus();
}

describe("Feature: useFocusTrap", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe("Scenario: Focus containment and initial focus orchestration", () => {
    it("Given a custom ref target, When the floating node opens, Then focus moves to the specified target", async () => {
      const targetRef = ref<HTMLElement | null>(null);
      const ctx = await renderTrap({ initialFocus: targetRef }, false, {
        buttons: ["target"],
      });
      targetRef.value = ctx.getRawButtonEl("target");

      await openTrap(ctx);
      await expect.element(ctx.getButtonEl("target")).toHaveFocus();
    });

    it("Given multiple tabbable elements, When opened without explicit target, Then focus moves to the first tabbable element by default", async () => {
      const ctx = await renderTrap({}, false, {
        buttons: ["first", "second"],
      });

      await openTrap(ctx);
      await expect.element(ctx.getButtonEl("first")).toHaveFocus();
    });

    it("Given no tabbable children exist, When opened, Then focus falls back to the floating element itself", async () => {
      const ctx = await renderTrap();

      await openTrap(ctx);
      await expect.element(ctx.floatingEl).toHaveFocus();
    });

    it("Given a modal focus trap, When tabbing forward and backward, Then focus wraps within boundary elements", async () => {
      const ctx = await renderTrap({ modal: true }, false, {
        buttons: ["first", "middle", "last"],
      });
      const firstBtnEl = ctx.getButtonEl("first");
      const middleBtnEl = ctx.getButtonEl("middle");
      const lastBtnEl = ctx.getButtonEl("last");

      await openTrap(ctx);
      await expect.element(firstBtnEl).toHaveFocus();

      ctx.getRawButtonEl("middle").focus();
      await expect.element(middleBtnEl).toHaveFocus();

      ctx.getRawButtonEl("last").focus();
      await expect.element(lastBtnEl).toHaveFocus();

      // Tab on last element wraps to first
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", cancelable: true }));
      await expect.element(firstBtnEl).toHaveFocus();

      // Shift+Tab on first element wraps to last
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Tab", shiftKey: true, cancelable: true }),
      );
      await expect.element(lastBtnEl).toHaveFocus();
    });

    it("Given an initialFocus getter function, When opened, Then focus moves to the element returned by the function", async () => {
      const ctx = await renderTrap(
        {
          initialFocus: () => document.querySelector<HTMLElement>("#fn-target"),
        },
        false,
        { buttons: ["fn-target"] },
      );

      await openTrap(ctx);
      await expect.element(ctx.getButtonEl("fn-target")).toHaveFocus();
    });

    it("Given initialFocus is set to false, When opened, Then previous focus remains undisturbed", async () => {
      const ctx = await renderTrap({ initialFocus: false, modal: false }, false, {
        buttons: ["btn"],
        withOutside: true,
        outsideId: "prev",
      });
      const previousFocusEl = ctx.outsideEl;
      ctx.rawOutsideEl!.focus();
      await expect.element(previousFocusEl).toHaveFocus();

      await openTrap(ctx);
      await expect.element(previousFocusEl).toHaveFocus();
    });

    it("Given initialFocus is passed as a direct HTMLElement reference, When opened, Then focus moves directly to that element", async () => {
      let customTargetEl: HTMLElement | null = null;
      const ctx = await renderTrap(() => {
        customTargetEl = document.createElement("button");
        customTargetEl.id = "ref-target";
        return { initialFocus: customTargetEl };
      }, false);
      ctx.rawFloatingEl.appendChild(customTargetEl!);

      await openTrap(ctx);
      await expect.element(customTargetEl!).toHaveFocus();
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
      const ctx = await renderTrap({ modal: true }, false, {
        buttons: ["first", "last"],
      });
      const firstBtnEl = ctx.getButtonEl("first");
      const lastBtnEl = ctx.getButtonEl("last");

      await openTrap(ctx);
      await expect.element(firstBtnEl).toHaveFocus();

      // Shift+Tab on first wraps to last
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Tab", shiftKey: true, cancelable: true }),
      );
      await expect.element(lastBtnEl).toHaveFocus();

      // Tab on last wraps to first
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", cancelable: true }));
      await expect.element(firstBtnEl).toHaveFocus();
    });
  });

  describe("Scenario: Return focus coordination", () => {
    it("Given returnFocus is enabled, When floating node closes, Then focus returns to the anchor trigger element", async () => {
      const ctx = await renderTrap({ returnFocus: true }, false, {
        buttons: ["btn"],
        withOutside: true,
        outsideId: "prev",
      });
      const previousFocusEl = ctx.outsideEl;
      ctx.rawOutsideEl!.focus();
      await expect.element(previousFocusEl).toHaveFocus();

      await openTrap(ctx);
      await expect.element(ctx.anchorEl).not.toHaveFocus();

      ctx.node.open.value = false;
      await flushFocus();

      await expect.element(ctx.anchorEl).toHaveFocus();
    });

    it("Given anchor element is removed from DOM, When floating node closes, Then focus falls back to previously active element", async () => {
      const ctx = await renderTrap({ returnFocus: true }, false, {
        buttons: ["btn"],
        withOutside: true,
        outsideId: "prev",
      });
      const previousFocusEl = ctx.outsideEl;
      ctx.rawOutsideEl!.focus();
      ctx.rawAnchorEl.remove();
      ctx.node.refs.anchorEl.value = null;

      await openTrap(ctx);
      await expect.element(previousFocusEl).not.toHaveFocus();

      ctx.node.open.value = false;
      await flushFocus();

      await expect.element(previousFocusEl).toHaveFocus();
    });

    it("Given a custom returnFocus element reference, When floating node closes, Then focus returns to the custom element", async () => {
      const customReturnTargetRef = ref<HTMLElement | null>(null);
      const ctx = await renderTrap(
        {
          returnFocus: customReturnTargetRef,
        },
        false,
        {
          buttons: ["btn"],
          withOutside: true,
          outsideId: "custom-return",
        },
      );
      const customReturnEl = ctx.outsideEl;
      customReturnTargetRef.value = ctx.rawOutsideEl;

      await openTrap(ctx);
      ctx.node.open.value = false;
      await flushFocus();

      await expect.element(customReturnEl).toHaveFocus();
    });

    it("Given returnFocus is disabled, When floating node closes, Then previously active focus is not restored", async () => {
      const ctx = await renderTrap({ returnFocus: false }, false, {
        buttons: ["btn"],
        withOutside: true,
        outsideId: "prev",
      });
      const previousFocusEl = ctx.outsideEl;
      ctx.rawOutsideEl!.focus();

      await openTrap(ctx);
      ctx.node.open.value = false;
      await flushFocus();

      await expect.element(previousFocusEl).not.toHaveFocus();
    });

    it("Given focus naturally moves to an outside element while open, When floating node closes, Then focus is not hijacked back to anchor", async () => {
      const ctx = await renderTrap({ returnFocus: true }, false, {
        buttons: ["btn"],
        outsideId: "natural-outside",
      });

      await openTrap(ctx);

      // Mounted after open so modal isolation does not mark it inert.
      ctx.showOutside.value = true;
      await nextTick();
      const naturalOutsideEl = ctx.outsideEl;
      ctx.rawOutsideEl!.focus();

      // Close the floating element
      ctx.node.open.value = false;
      await flushFocus();

      // Focus should remain on the outside element, not restored to anchor
      await expect.element(naturalOutsideEl).toHaveFocus();
    });

    it("Given an outside pointerdown interaction is detected during closure, When floating node closes, Then return focus is suppressed", async () => {
      const ctx = await renderTrap({ returnFocus: true }, false, {
        buttons: ["btn"],
        withOutside: true,
        outsideId: "prev",
      });
      const previousFocusEl = ctx.outsideEl;
      ctx.rawOutsideEl!.focus();

      await openTrap(ctx);

      // Simulate pointerdown on the outside button
      ctx.rawOutsideEl!.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

      // Suppose the outside component or useEscapeKey/useOutsideClick closes the floating element synchronously
      ctx.node.open.value = false;
      await flushFocus();

      // Focus should NOT be pulled back to `prev` because of the outside pointerdown interaction
      await expect.element(previousFocusEl).not.toHaveFocus();
    });
  });

  describe("Scenario: Non-modal dismissal and outside focus filtering", () => {
    it("Given closeOnFocusOut is enabled, When document focusin occurs on an outside element, Then floating node closes", async () => {
      const ctx = await renderTrap({ modal: false, closeOnFocusOut: true }, false, {
        buttons: ["btn"],
        withOutside: true,
      });

      await openTrap(ctx);
      expect(ctx.node.open.value).toBe(true);

      ctx.rawOutsideEl!.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
      await flushFocus();

      expect(ctx.node.open.value).toBe(false);
    });

    it("Given a non-modal trap, When pointerdown occurs outside, Then trap leaves dismissal to dedicated outside-click composable", async () => {
      const ctx = await renderTrap({ modal: false, closeOnFocusOut: true }, false, {
        buttons: ["btn"],
        withOutside: true,
      });

      await openTrap(ctx);
      expect(ctx.node.open.value).toBe(true);

      ctx.rawOutsideEl!.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      await flushFocus();

      expect(ctx.node.open.value).toBe(true);
    });

    it("Given an ignoreFocusOut predicate, When focus moves to an ignored target, Then floating node remains open", async () => {
      let ignoredTargetEl: HTMLElement | null = null;
      const ctx = await renderTrap(
        {
          modal: false,
          closeOnFocusOut: true,
          ignoreFocusOut: (target) => target === ignoredTargetEl,
        },
        false,
        {
          buttons: ["btn"],
          withOutside: true,
          withIgnored: true,
        },
      );
      ignoredTargetEl = ctx.rawIgnoredEl;

      await openTrap(ctx);

      ctx.rawIgnoredEl!.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
      await flushFocus();
      expect(ctx.node.open.value).toBe(true);

      ctx.rawOutsideEl!.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
      await flushFocus();
      expect(ctx.node.open.value).toBe(false);
    });
  });

  describe("Scenario: Background isolation and inert stacking", () => {
    it("Given a modal focus trap opens, When inspected, Then outside background elements receive inert isolation and recover on close", async () => {
      const ctx = await renderTrap({ modal: true }, false, {
        buttons: ["btn"],
        withOutside: true,
      });
      const outsideEl = ctx.outsideEl;

      await openTrap(ctx);

      await expect.element(outsideEl).toHaveAttribute("inert");

      ctx.node.open.value = false;
      await flushFocus();

      await expect.element(outsideEl).not.toHaveAttribute("inert");
    });
  });

  describe("Scenario: Nested floating nodes and parent-child containment", () => {
    it("Given nested parent and child floating nodes, When focus moves into child panel, Then parent node remains open without premature closure", async () => {
      const ctx = await renderTreeTrap();

      await flushFocus();
      expect(ctx.result.isActive.value).toBe(true);

      // Focus inside child floating element must not close parent
      ctx.rawChildBtnEl.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
      await flushFocus();

      expect(ctx.parentOpen.value).toBe(true);
    });
  });

  describe("Scenario: Lifecycle and manual controls", () => {
    it("Given manual trap controls, When deactivate is invoked, Then floating node open state transitions to false", async () => {
      const ctx = await renderTrap({}, true, { buttons: ["btn"] });

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
      ctx.node.refs.floatingEl.value = ctx.rawFloatingEl;
      await flushFocus();

      expect(ctx.result.isActive.value).toBe(true);
    });
  });

  describe("Scenario: Focus containment recovery on external focus shift and attribute lifecycle", () => {
    it("Given focus escaped outside programmatically, When Tab keydown is dispatched, Then focus wraps back inside the trap", async () => {
      const ctx = await renderTrap({}, false, {
        buttons: ["btn"],
        outsideId: "outside",
      });
      const btnEl = ctx.getButtonEl("btn");
      await openTrap(ctx);

      ctx.showOutside.value = true;
      await nextTick();

      // Programmatic escape: no focusout ever fires from the panel.
      ctx.rawOutsideEl!.focus();
      await flushFocus();

      ctx.rawOutsideEl!.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true }));
      await flushFocus();

      await expect.element(btnEl).toHaveFocus();
    });

    it("Given focus lands outside programmatically, When focusin fires, Then focus is pulled back inside floating element", async () => {
      const ctx = await renderTrap({}, false, {
        buttons: ["btn"],
        outsideId: "outside",
      });
      const btnEl = ctx.getButtonEl("btn");
      await openTrap(ctx);

      ctx.showOutside.value = true;
      await nextTick();

      ctx.rawOutsideEl!.focus();
      ctx.rawOutsideEl!.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
      await flushFocus();

      await expect.element(btnEl).toHaveFocus();
    });

    it("Given floating panel lacked a tabindex, When trap closes, Then temporary fallback tabindex is completely removed", async () => {
      const ctx = await renderTrap();
      // Panel starts without tabindex and has no tabbable children.
      ctx.rawFloatingEl.removeAttribute("tabindex");
      await openTrap(ctx);

      await expect.element(ctx.floatingEl).toHaveAttribute("tabindex", "-1");

      ctx.node.open.value = false;
      await flushFocus();

      await expect.element(ctx.floatingEl).not.toHaveAttribute("tabindex");
    });

    it("Given focus moved synchronously before trap activation, When closed, Then focus returns to opener captured at invocation", async () => {
      const ctx = await renderTrap({}, false, {
        withOutside: true,
        outsideId: "middle",
      });
      await nextTick();

      ctx.rawAnchorEl.focus();
      ctx.node.open.value = true;
      // Sync focus move between open=true and nextTick must not hijack return focus.
      ctx.rawOutsideEl!.focus();
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

      const outsideEl = page.getByTestId("outside");

      fixture.openA.value = true;
      await flushFocus();
      fixture.openB.value = true;
      await flushFocus();

      await expect.element(outsideEl).toHaveAttribute("inert");
      expect(fixture.getResultA().isActive.value).toBe(true);
      expect(fixture.getResultB().isActive.value).toBe(true);

      // Closing A first must not un-inert the background while B is open.
      fixture.openA.value = false;
      await flushFocus();
      await expect.element(outsideEl).toHaveAttribute("inert");

      fixture.openB.value = false;
      await flushFocus();
      await expect.element(outsideEl).not.toHaveAttribute("inert");
    });

    it("Given outside pointerdown followed by immediate inside re-focus, When subsequent outside focus occurs, Then containment is still enforced", async () => {
      const ctx = await renderTrap({}, false, {
        buttons: ["btn"],
        outsideId: "outside",
      });
      const btnEl = ctx.getButtonEl("btn");
      await openTrap(ctx);

      ctx.showOutside.value = true;
      await nextTick();

      document.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      // Keyboard user Tabs back inside within the 100ms suppression window.
      ctx.getRawButtonEl("btn").focus();
      ctx.getRawButtonEl("btn").dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
      await flushFocus();

      await expect.element(btnEl).toHaveFocus();

      // A subsequent outside focus jump is still corrected, not ignored.
      ctx.rawOutsideEl!.focus();
      ctx.rawOutsideEl!.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
      await flushFocus();

      await expect.element(btnEl).toHaveFocus();
    });
  });

  describe("Scenario: Cross-realm iframe support", () => {
    it("Given a floating node inside an iframe document, When opened, Then focus is trapped inside iframe without top-realm sentinels", async () => {
      const fixture = await renderIframeTrap();
      fixture.openRef.value = true;
      await flushFocus();

      const iframeDoc = fixture.getIframeDoc();
      const btnEl = fixture.getButtonEl();

      // Cross-realm check: Vitest's `expect.element(button)` fails cross-realm instanceof HTMLElement check,
      // so inspect the iframe realm activeElement directly.
      expect(iframeDoc.activeElement).toBe(btnEl);
      expect(iframeDoc.querySelectorAll("[data-vfloat-focus-guard]").length).toBe(0);
    });
  });
});
