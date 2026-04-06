import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { effectScope, nextTick, ref, type Ref } from "vue";
import {
  type UseListNavigationOptions,
  type UseListNavigationReturn,
  useListNavigation,
} from "@/composables/interactions/use-list-navigation";
import type { AnchorElement, FloatingElement } from "@/composables/positioning";
import { useFloating } from "@/composables/positioning";

type ListNavigationTestContext = {
  activeIndex: Ref<number | null>;
  anchorEl: HTMLButtonElement;
  context: ReturnType<typeof useFloating>;
  floatingEl: HTMLDivElement;
  items: HTMLButtonElement[];
  listRef: Ref<Array<HTMLElement | null>>;
  onNavigate: ReturnType<typeof vi.fn>;
  openRef: Ref<boolean>;
  result: UseListNavigationReturn;
  scope: ReturnType<typeof effectScope>;
};

type SetupOptions = Partial<
  Omit<UseListNavigationOptions, "activeIndex" | "listRef" | "onNavigate">
>;

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

function createButton(id: string): HTMLButtonElement {
  const button = trackElement(document.createElement("button"));
  button.id = id;
  button.type = "button";
  button.textContent = id;
  return button;
}

function createItems(container: HTMLElement, count = 8): HTMLButtonElement[] {
  return Array.from({ length: count }, (_, index) => {
    const button = createButton(`item-${index}`);
    container.appendChild(button);
    return button;
  });
}

async function flushListNavigation(ticks = 2) {
  for (let i = 0; i < ticks; i++) {
    await nextTick();
  }
}

function dispatchKey(target: EventTarget, key: string) {
  target.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
}

function setupListNavigation(
  options: SetupOptions = {},
  initialOpen = false,
): ListNavigationTestContext {
  const anchorEl = createButton("anchor");
  document.body.appendChild(anchorEl);

  const floatingEl = trackElement(document.createElement("div"));
  floatingEl.id = "floating";
  document.body.appendChild(floatingEl);

  const items = createItems(floatingEl);
  const listRef = ref<Array<HTMLElement | null>>(items);
  const openRef = ref(initialOpen);
  const activeIndex = ref<number | null>(null);
  const anchorRef = ref<AnchorElement>(anchorEl);
  const floatingRef = ref<FloatingElement>(floatingEl);
  const context = useFloating(anchorRef, floatingRef, { open: openRef });
  const onNavigate = vi.fn((index: number | null) => {
    activeIndex.value = index;
  });

  const scope = effectScope();
  activeScopes.push(scope);

  let result!: UseListNavigationReturn;
  scope.run(() => {
    result = useListNavigation(context, {
      listRef,
      activeIndex,
      onNavigate,
      ...options,
    });
  });

  return {
    activeIndex,
    anchorEl,
    context,
    floatingEl,
    items,
    listRef,
    onNavigate,
    openRef,
    result,
    scope,
  };
}

describe("useListNavigation", () => {
  afterEach(() => {
    for (const scope of [...activeScopes].reverse()) {
      scope.stop();
    }

    activeScopes.length = 0;
    clearTrackedElements();
    vi.clearAllMocks();
  });

  describe("opening behavior", () => {
    it("opens once on ArrowDown and targets the first enabled item", async () => {
      const ctx = setupListNavigation({
        disabledIndices: [0, 1],
        focusItemOnOpen: "auto",
        orientation: "vertical",
      });
      const scrollSpy = vi.fn();
      ctx.items[2].scrollIntoView = scrollSpy;

      dispatchKey(ctx.anchorEl, "ArrowDown");
      await flushListNavigation();

      expect(ctx.context.state.open.value).toBe(true);
      expect(ctx.onNavigate).toHaveBeenCalledTimes(1);
      expect(ctx.onNavigate).toHaveBeenCalledWith(2);
      expect(ctx.activeIndex.value).toBe(2);
      expect(scrollSpy).toHaveBeenCalledTimes(1);
      expect(document.activeElement).toBe(ctx.items[2]);
    });

    it("opens once on ArrowUp and targets the last enabled item", async () => {
      const ctx = setupListNavigation({
        disabledIndices: [7],
        focusItemOnOpen: false,
        orientation: "vertical",
      });
      ctx.anchorEl.focus();

      dispatchKey(ctx.anchorEl, "ArrowUp");
      await flushListNavigation();

      expect(ctx.context.state.open.value).toBe(true);
      expect(ctx.onNavigate).toHaveBeenCalledTimes(1);
      expect(ctx.onNavigate).toHaveBeenCalledWith(6);
      expect(ctx.activeIndex.value).toBe(6);
      expect(document.activeElement).toBe(ctx.anchorEl);
    });

    it("ignores a disabled selectedIndex when resolving the initial item", async () => {
      const selectedIndex = ref(1);
      const ctx = setupListNavigation({
        disabledIndices: [1],
        focusItemOnOpen: true,
        orientation: "vertical",
        selectedIndex,
      });

      ctx.openRef.value = true;
      await flushListNavigation();

      expect(ctx.onNavigate).toHaveBeenCalledTimes(1);
      expect(ctx.activeIndex.value).toBe(0);
      expect(document.activeElement).toBe(ctx.items[0]);
    });

    it("only applies focusItemOnOpen auto to the current keyboard-open cycle", async () => {
      const ctx = setupListNavigation({
        focusItemOnOpen: "auto",
        orientation: "vertical",
      });
      ctx.anchorEl.focus();

      dispatchKey(ctx.anchorEl, "ArrowDown");
      await flushListNavigation();
      expect(document.activeElement).toBe(ctx.items[0]);

      ctx.openRef.value = false;
      await flushListNavigation();

      ctx.anchorEl.focus();
      ctx.onNavigate.mockClear();

      ctx.openRef.value = true;
      await flushListNavigation();

      expect(ctx.onNavigate).not.toHaveBeenCalled();
      expect(document.activeElement).toBe(ctx.anchorEl);
    });
  });

  describe("linear navigation", () => {
    it("skips disabled items without wrapping when loop is disabled", async () => {
      const ctx = setupListNavigation(
        {
          disabledIndices: [1],
          focusItemOnOpen: false,
          loop: false,
          orientation: "vertical",
        },
        true,
      );
      ctx.activeIndex.value = 0;

      dispatchKey(ctx.floatingEl, "ArrowDown");
      await flushListNavigation();
      expect(ctx.activeIndex.value).toBe(2);

      ctx.onNavigate.mockClear();
      ctx.activeIndex.value = ctx.items.length - 1;

      dispatchKey(ctx.floatingEl, "ArrowDown");
      await flushListNavigation();

      expect(ctx.onNavigate).not.toHaveBeenCalled();
      expect(ctx.activeIndex.value).toBe(ctx.items.length - 1);
    });

    it("wraps when loop is enabled", async () => {
      const ctx = setupListNavigation(
        {
          focusItemOnOpen: false,
          loop: true,
          orientation: "vertical",
        },
        true,
      );
      ctx.activeIndex.value = ctx.items.length - 1;

      dispatchKey(ctx.floatingEl, "ArrowDown");
      await flushListNavigation();

      expect(ctx.activeIndex.value).toBe(0);
    });

    it("moves to the first and last enabled items with Home and End", async () => {
      const ctx = setupListNavigation(
        {
          disabledIndices: [0, 7],
          focusItemOnOpen: false,
          orientation: "vertical",
        },
        true,
      );
      ctx.activeIndex.value = 3;

      dispatchKey(ctx.floatingEl, "Home");
      await flushListNavigation();
      expect(ctx.activeIndex.value).toBe(1);

      dispatchKey(ctx.floatingEl, "End");
      await flushListNavigation();
      expect(ctx.activeIndex.value).toBe(6);
    });
  });

  describe("grid navigation", () => {
    it("respects RTL row looping inside a grid", async () => {
      const ctx = setupListNavigation(
        {
          cols: 4,
          focusItemOnOpen: false,
          loop: true,
          orientation: "both",
          rtl: true,
        },
        true,
      );
      ctx.activeIndex.value = 0;

      dispatchKey(ctx.floatingEl, "ArrowRight");
      await flushListNavigation();
      expect(ctx.activeIndex.value).toBe(3);

      dispatchKey(ctx.floatingEl, "ArrowLeft");
      await flushListNavigation();
      expect(ctx.activeIndex.value).toBe(0);
    });

    it("respects RTL next-row looping inside a grid", async () => {
      const ctx = setupListNavigation(
        {
          cols: 4,
          focusItemOnOpen: false,
          gridLoopDirection: "next",
          loop: true,
          orientation: "both",
          rtl: true,
        },
        true,
      );
      ctx.activeIndex.value = 3;

      dispatchKey(ctx.floatingEl, "ArrowLeft");
      await flushListNavigation();
      expect(ctx.activeIndex.value).toBe(4);

      dispatchKey(ctx.floatingEl, "ArrowRight");
      await flushListNavigation();
      expect(ctx.activeIndex.value).toBe(3);
    });
  });

  describe("virtual focus", () => {
    it("syncs aria-activedescendant and virtualItemRef", async () => {
      const virtualItemRef = ref<HTMLElement | null>(null);
      const ctx = setupListNavigation(
        {
          focusItemOnOpen: false,
          orientation: "vertical",
          virtual: true,
          virtualItemRef,
        },
        true,
      );

      ctx.items.forEach((item, index) => {
        item.id = `option-${index}`;
      });
      ctx.activeIndex.value = 2;

      await flushListNavigation();

      expect(ctx.anchorEl.getAttribute("aria-activedescendant")).toBe("option-2");
      expect(virtualItemRef.value).toBe(ctx.items[2]);
      expect(document.activeElement).not.toBe(ctx.items[2]);
    });
  });

  describe("hover behavior", () => {
    it("does not activate disabled hovered items", async () => {
      const ctx = setupListNavigation(
        {
          disabledIndices: [4],
          focusItemOnHover: true,
          orientation: "vertical",
        },
        true,
      );

      ctx.items[4].dispatchEvent(
        new MouseEvent("mousemove", {
          bubbles: true,
          clientX: 16,
          clientY: 16,
        }),
      );
      await flushListNavigation();

      expect(ctx.onNavigate).not.toHaveBeenCalled();
      expect(ctx.activeIndex.value).toBeNull();
    });
  });

  describe("cleanup and lifecycle", () => {
    it("cleanup removes listeners and clears virtual focus state", async () => {
      const virtualItemRef = ref<HTMLElement | null>(null);
      const ctx = setupListNavigation(
        {
          focusItemOnOpen: false,
          orientation: "vertical",
          virtual: true,
          virtualItemRef,
        },
        true,
      );

      ctx.items.forEach((item, index) => {
        item.id = `cleanup-option-${index}`;
      });
      ctx.activeIndex.value = 1;
      await flushListNavigation();

      expect(ctx.anchorEl.getAttribute("aria-activedescendant")).toBe("cleanup-option-1");
      expect(virtualItemRef.value).toBe(ctx.items[1]);

      ctx.result.cleanup();
      await flushListNavigation();

      expect(ctx.anchorEl.hasAttribute("aria-activedescendant")).toBe(false);
      expect(virtualItemRef.value).toBeNull();

      ctx.onNavigate.mockClear();
      dispatchKey(ctx.anchorEl, "ArrowDown");
      dispatchKey(ctx.floatingEl, "ArrowDown");
      await flushListNavigation();

      expect(ctx.onNavigate).not.toHaveBeenCalled();
    });
  });
});
