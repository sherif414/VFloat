import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { computed, effectScope, nextTick, ref } from "vue";
import { useActiveDescendant } from "./active-descendant";

const trackedElements: HTMLElement[] = [];

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

describe("useActiveDescendant", () => {
  let scope: ReturnType<typeof effectScope> | undefined;

  beforeEach(() => {
    scope = effectScope();
  });

  afterEach(() => {
    scope?.stop();
    scope = undefined;
    clearTrackedElements();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it("sets aria-activedescendant on anchor element when open and virtual mode is enabled", async () => {
    const anchorEl = trackElement(document.createElement("button"));
    const item0 = trackElement(document.createElement("div"));
    const item1 = trackElement(document.createElement("div"));
    item0.id = "item-0";
    item1.id = "item-1";
    document.body.append(anchorEl, item0, item1);

    const open = ref(true);
    const activeIndex = ref<number | null>(0);
    const listRef = ref<Array<HTMLElement | null>>([item0, item1]);

    let activeDescendant!: ReturnType<typeof useActiveDescendant>;
    scope?.run(() => {
      activeDescendant = useActiveDescendant(
        computed(() => anchorEl),
        listRef,
        activeIndex,
        {
          virtual: true,
          open,
        },
      );
    });

    await nextTick();
    expect(anchorEl.getAttribute("aria-activedescendant")).toBe("item-0");
    expect(activeDescendant.activeItem.value).toBe(item0);

    activeIndex.value = 1;
    await nextTick();
    expect(anchorEl.getAttribute("aria-activedescendant")).toBe("item-1");
    expect(activeDescendant.activeItem.value).toBe(item1);
  });

  it("clears aria-activedescendant when closed or when virtual is false", async () => {
    const anchorEl = trackElement(document.createElement("button"));
    const item0 = trackElement(document.createElement("div"));
    item0.id = "opt-0";
    document.body.append(anchorEl, item0);

    const open = ref(true);
    const virtual = ref(true);
    const activeIndex = ref<number | null>(0);
    const listRef = ref<Array<HTMLElement | null>>([item0]);

    let activeDescendant!: ReturnType<typeof useActiveDescendant>;
    scope?.run(() => {
      activeDescendant = useActiveDescendant(
        computed(() => anchorEl),
        listRef,
        activeIndex,
        {
          virtual,
          open,
        },
      );
    });

    await nextTick();
    expect(anchorEl.getAttribute("aria-activedescendant")).toBe("opt-0");

    open.value = false;
    await nextTick();
    expect(anchorEl.hasAttribute("aria-activedescendant")).toBe(false);
    expect(activeDescendant.activeItem.value).toBeNull();

    open.value = true;
    virtual.value = false;
    await nextTick();
    expect(anchorEl.hasAttribute("aria-activedescendant")).toBe(false);
  });

  it("warns in DEV mode if active item is missing an id", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const anchorEl = trackElement(document.createElement("button"));
    const unassignedItem = trackElement(document.createElement("div")); // no id
    document.body.append(anchorEl, unassignedItem);

    const open = ref(true);
    const listRef = ref<Array<HTMLElement | null>>([unassignedItem]);

    scope?.run(() => {
      useActiveDescendant(
        computed(() => anchorEl),
        listRef,
        0,
        {
          virtual: true,
          open,
        },
      );
    });

    await nextTick();
    expect(anchorEl.hasAttribute("aria-activedescendant")).toBe(false);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("[useActiveDescendant] List item at index"),
      0,
      expect.any(String),
    );
  });

  it("cleans up attribute and stops watch on cleanup()", async () => {
    const anchorEl = trackElement(document.createElement("button"));
    const item0 = trackElement(document.createElement("div"));
    item0.id = "entry-0";
    document.body.append(anchorEl, item0);

    const open = ref(true);
    const activeIndex = ref<number | null>(0);
    const listRef = ref<Array<HTMLElement | null>>([item0]);

    let activeDescendant!: ReturnType<typeof useActiveDescendant>;
    scope?.run(() => {
      activeDescendant = useActiveDescendant(
        computed(() => anchorEl),
        listRef,
        activeIndex,
        {
          virtual: true,
          open,
        },
      );
    });

    await nextTick();
    expect(anchorEl.getAttribute("aria-activedescendant")).toBe("entry-0");

    activeDescendant.cleanup();
    expect(anchorEl.hasAttribute("aria-activedescendant")).toBe(false);
    expect(activeDescendant.activeItem.value).toBeNull();

    activeIndex.value = null;
    await nextTick();
    expect(anchorEl.hasAttribute("aria-activedescendant")).toBe(false);
  });
});
