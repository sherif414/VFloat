import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { effectScope, nextTick, ref } from "vue";
import {
  type UseFocusContext,
  type UseFocusOptions,
  useFocus,
  useFloatingTree,
  useFloatingTreeNode,
} from "@/composables/interactions";
import type { AnchorElement, FloatingElement } from "@/composables/positioning";
import { useFloating } from "@/composables/positioning";

vi.mock("@/shared/platform", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared/platform")>();
  return {
    ...actual,
    matchesFocusVisible: vi.fn(actual.matchesFocusVisible),
  };
});

import { matchesFocusVisible } from "@/shared/platform";

type FocusTestContext = {
  anchorEl: HTMLElement;
  context: UseFocusContext;
  floatingEl: HTMLElement;
  openRef: ReturnType<typeof ref<boolean>>;
  result: ReturnType<typeof useFocus>;
  scope: ReturnType<typeof effectScope>;
  setOpenMock: ReturnType<typeof vi.fn>;
};

const trackedElements: HTMLElement[] = [];
const activeScopes: ReturnType<typeof effectScope>[] = [];

function trackElement<T extends HTMLElement>(el: T): T {
  trackedElements.push(el);
  return el;
}

function clearTrackedElements() {
  for (const el of [...trackedElements].reverse()) {
    if (el.isConnected) {
      el.remove();
    }
  }

  trackedElements.length = 0;
}

function createButton(id: string, text = id) {
  const button = trackElement(document.createElement("button"));
  button.id = id;
  button.type = "button";
  button.textContent = text;
  return button;
}

function createFloatingElement(id = "floating") {
  const floatingEl = trackElement(document.createElement("div"));
  floatingEl.id = id;
  floatingEl.tabIndex = -1;
  floatingEl.textContent = "Floating content";
  return floatingEl;
}

function createOutsideButton(id = "outside") {
  const button = createButton(id, id);
  document.body.appendChild(button);
  return button;
}

async function flushFocus() {
  await nextTick();
  vi.runAllTimers();
  await nextTick();
}

function setupFocus(
  options: UseFocusOptions = {},
  initialOpen = false,
  elements?: {
    anchorEl?: HTMLElement;
    floatingEl?: HTMLElement;
  },
): FocusTestContext {
  const anchorEl = elements?.anchorEl ?? createButton("anchor", "Anchor");
  const floatingEl = elements?.floatingEl ?? createFloatingElement();

  if (!anchorEl.isConnected) {
    document.body.appendChild(anchorEl);
  }

  if (!floatingEl.isConnected) {
    document.body.appendChild(floatingEl);
  }

  const openRef = ref(initialOpen);
  const setOpenMock = vi.fn((value: boolean) => {
    openRef.value = value;
  });
  const anchorRef = ref<AnchorElement>(anchorEl);
  const floatingRef = ref<FloatingElement>(floatingEl);
  const arrowRef = ref<HTMLElement | null>(null);

  const context: UseFocusContext = {
    refs: {
      anchorEl: anchorRef,
      floatingEl: floatingRef,
      arrowEl: arrowRef,
      setAnchor: (value) => {
        anchorRef.value = value;
      },
      setFloating: (value) => {
        floatingRef.value = value;
      },
      setArrow: (value) => {
        arrowRef.value = value;
      },
    },
    state: {
      open: openRef,
      setOpen: setOpenMock,
    },
  };

  const scope = effectScope();
  activeScopes.push(scope);

  let result!: ReturnType<typeof useFocus>;
  scope.run(() => {
    result = useFocus(context, options);
  });

  return {
    anchorEl,
    context,
    floatingEl,
    openRef,
    result,
    scope,
    setOpenMock,
  };
}

async function setupFocusReady(
  options: UseFocusOptions = {},
  initialOpen = false,
  elements?: {
    anchorEl?: HTMLElement;
    floatingEl?: HTMLElement;
  },
) {
  const ctx = setupFocus(options, initialOpen, elements);
  await nextTick();
  return ctx;
}

describe("useFocus", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    for (const scope of [...activeScopes].reverse()) {
      scope.stop();
    }

    activeScopes.length = 0;
    clearTrackedElements();
    vi.clearAllMocks();
    vi.mocked(matchesFocusVisible).mockReset();
    vi.useRealTimers();
  });

  describe("opening behavior", () => {
    it("opens on focus when focus-visible is not required", async () => {
      const ctx = await setupFocusReady({ requireFocusVisible: false });

      ctx.anchorEl.focus();
      await flushFocus();

      expect(ctx.context.state.open.value).toBe(true);
      expect(ctx.setOpenMock).toHaveBeenCalledWith(true, "focus", expect.any(FocusEvent));
    });

    it("only opens when the focused element matches focus-visible", async () => {
      vi.mocked(matchesFocusVisible).mockReturnValue(false);
      const ctx = await setupFocusReady({ requireFocusVisible: true });

      ctx.anchorEl.focus();
      await flushFocus();
      expect(ctx.context.state.open.value).toBe(false);

      vi.mocked(matchesFocusVisible).mockReturnValue(true);

      ctx.anchorEl.blur();
      await flushFocus();
      ctx.anchorEl.focus();
      await flushFocus();

      expect(ctx.context.state.open.value).toBe(true);
    });

    it("blocks one refocus after the window blurs while the closed anchor stays focused", async () => {
      const ctx = await setupFocusReady({ requireFocusVisible: false });

      ctx.anchorEl.focus();
      await flushFocus();
      expect(ctx.context.state.open.value).toBe(true);

      ctx.context.state.setOpen(false);
      await flushFocus();
      expect(ctx.context.state.open.value).toBe(false);

      window.dispatchEvent(new Event("blur"));

      ctx.anchorEl.blur();
      ctx.anchorEl.focus();
      await flushFocus();

      expect(ctx.context.state.open.value).toBe(false);

      window.dispatchEvent(new Event("focus"));

      ctx.anchorEl.blur();
      ctx.anchorEl.focus();
      await flushFocus();

      expect(ctx.context.state.open.value).toBe(true);
    });
  });

  describe("closing behavior", () => {
    it("closes when focus leaves both the anchor and floating element", async () => {
      const outsideEl = createOutsideButton();
      const ctx = await setupFocusReady({ requireFocusVisible: false });

      ctx.anchorEl.focus();
      await flushFocus();
      expect(ctx.context.state.open.value).toBe(true);

      outsideEl.focus();
      await flushFocus();

      expect(ctx.context.state.open.value).toBe(false);
      expect(ctx.setOpenMock).toHaveBeenLastCalledWith(false, "blur", expect.any(FocusEvent));
    });

    it("stays open when focus moves into the floating element", async () => {
      const ctx = await setupFocusReady({ requireFocusVisible: false });

      ctx.anchorEl.focus();
      await flushFocus();

      ctx.floatingEl.focus();
      await flushFocus();

      expect(ctx.context.state.open.value).toBe(true);
    });

    it("stays open when focus moves within the anchor subtree", async () => {
      const anchorEl = trackElement(document.createElement("div"));
      anchorEl.id = "anchor";
      anchorEl.tabIndex = 0;
      const childInput = trackElement(document.createElement("input"));
      childInput.id = "anchor-child";
      anchorEl.appendChild(childInput);

      const ctx = await setupFocusReady({ requireFocusVisible: false }, false, {
        anchorEl,
        floatingEl: createFloatingElement(),
      });

      anchorEl.focus();
      await flushFocus();
      expect(ctx.context.state.open.value).toBe(true);

      childInput.focus();
      await flushFocus();

      expect(ctx.context.state.open.value).toBe(true);
    });
  });

  describe("floating tree integration", () => {
    it("keeps the parent open while focus moves into a child submenu and closes the child on return", async () => {
      const rootAnchorEl = createButton("root-anchor", "Root anchor");
      const rootFloatingEl = createFloatingElement("root-floating");
      const childAnchorEl = createButton("child-anchor", "Child anchor");
      const childFloatingEl = createFloatingElement("child-floating");

      document.body.appendChild(rootAnchorEl);
      document.body.appendChild(rootFloatingEl);
      document.body.appendChild(childAnchorEl);
      document.body.appendChild(childFloatingEl);

      const scope = effectScope();
      activeScopes.push(scope);

      let rootContext!: ReturnType<typeof useFloating>;
      let childContext!: ReturnType<typeof useFloating>;

      scope.run(() => {
        const tree = useFloatingTree({ id: "focus-tree" });
        rootContext = useFloating(
          ref<AnchorElement>(rootAnchorEl),
          ref<FloatingElement>(rootFloatingEl),
          {
            open: ref(false),
          },
        );
        const rootNode = useFloatingTreeNode(rootContext, {
          tree,
          id: "root",
        });
        useFocus(rootContext, { requireFocusVisible: false });

        childContext = useFloating(
          ref<AnchorElement>(childAnchorEl),
          ref<FloatingElement>(childFloatingEl),
          {
            open: ref(false),
          },
        );
        useFloatingTreeNode(childContext, {
          parent: rootNode,
          id: "child",
        });
        useFocus(childContext, { requireFocusVisible: false });
      });

      await nextTick();

      rootAnchorEl.focus();
      await flushFocus();

      expect(rootContext.state.open.value).toBe(true);

      childAnchorEl.focus();
      await flushFocus();

      expect(rootContext.state.open.value).toBe(true);
      expect(childContext.state.open.value).toBe(true);

      rootAnchorEl.focus();
      await flushFocus();

      expect(rootContext.state.open.value).toBe(true);
      expect(childContext.state.open.value).toBe(false);
    });
  });

  describe("lifecycle and cleanup", () => {
    it("does not respond when disabled", async () => {
      const enabled = ref(false);
      const ctx = await setupFocusReady({
        enabled,
        requireFocusVisible: false,
      });

      ctx.anchorEl.focus();
      await flushFocus();

      expect(ctx.context.state.open.value).toBe(false);
      expect(ctx.setOpenMock).not.toHaveBeenCalled();
    });

    it("cleanup clears pending blur work and removes every listener", async () => {
      const outsideEl = createOutsideButton();
      const ctx = await setupFocusReady({ requireFocusVisible: false });

      ctx.anchorEl.focus();
      await flushFocus();
      expect(ctx.context.state.open.value).toBe(true);

      ctx.anchorEl.blur();
      ctx.result.cleanup();
      await flushFocus();

      expect(ctx.context.state.open.value).toBe(true);

      outsideEl.focus();
      await flushFocus();

      expect(ctx.context.state.open.value).toBe(true);

      ctx.context.state.setOpen(false);
      await flushFocus();

      ctx.anchorEl.focus();
      await flushFocus();

      expect(ctx.context.state.open.value).toBe(false);
    });
  });
});
