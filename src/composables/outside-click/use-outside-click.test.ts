import { userEvent } from "vite-plus/test/browser";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { effectScope, nextTick, ref } from "vue";
import {
  type AnchorElement,
  type FloatingElement,
  type UseOutsideClickContext,
  type UseOutsideClickOptions,
  useFloatingContext,
  useOutsideClick,
} from "@/composables";

const elementsToCleanUp: HTMLElement[] = [];

function trackElement(el: HTMLElement): HTMLElement {
  elementsToCleanUp.push(el);
  return el;
}

function clearTrackedElements() {
  for (const el of elementsToCleanUp) {
    if (el.isConnected) {
      document.body.removeChild(el);
    }
  }
  elementsToCleanUp.length = 0;
}

function createOutsideElement(id = "outside"): HTMLElement {
  const outsideEl = trackElement(document.createElement("div"));
  outsideEl.id = id;
  Object.assign(outsideEl.style, {
    position: "fixed",
    bottom: "0",
    left: "0",
    width: "100px",
    height: "100px",
    zIndex: "1",
  });
  document.body.appendChild(outsideEl);
  return outsideEl;
}

describe("useOutsideClick", () => {
  let context: UseOutsideClickContext;
  let anchorEl: HTMLElement;
  let floatingEl: HTMLElement;
  let scope: ReturnType<typeof effectScope>;
  let setOpenMock: ReturnType<typeof vi.fn>;

  const createElements = () => {
    anchorEl = trackElement(document.createElement("button"));
    anchorEl.id = "anchor";
    document.body.appendChild(anchorEl);

    floatingEl = trackElement(document.createElement("div"));
    floatingEl.id = "floating";
    floatingEl.textContent = "Floating";
    document.body.appendChild(floatingEl);

    const openRef = ref(true);
    setOpenMock = vi.fn((open: boolean) => {
      openRef.value = open;
    });

    context = {
      refs: {
        anchorEl: ref<AnchorElement>(anchorEl),
        floatingEl: ref<FloatingElement>(floatingEl),
        arrowEl: ref<HTMLElement | null>(null),
      },
      state: {
        open: openRef,
        setOpen: setOpenMock as () => void,
      },
    };
  };

  const initOutsideClick = (options?: UseOutsideClickOptions) => {
    scope = effectScope();
    scope.run(() => {
      useOutsideClick(context, options);
    });
  };

  beforeEach(() => {
    createElements();
  });

  afterEach(() => {
    scope?.stop();
    clearTrackedElements();
    vi.clearAllMocks();
  });

  it("closes on outside click by default", async () => {
    const outsideEl = createOutsideElement();
    initOutsideClick({ event: "click" });

    await userEvent.click(outsideEl);
    await nextTick();

    expect(setOpenMock).toHaveBeenCalledTimes(1);
    expect(setOpenMock).toHaveBeenNthCalledWith(1, false, "outside-pointer", expect.any(Event));
    expect(context.state.open.value).toBe(false);
  });

  it("does not close when outside dismissal is disabled", async () => {
    const outsideEl = createOutsideElement();
    initOutsideClick({ enabled: false, event: "click" });

    await userEvent.click(outsideEl);
    await nextTick();

    expect(setOpenMock).not.toHaveBeenCalled();
    expect(context.state.open.value).toBe(true);
  });

  it("does not close when clicking the anchor or floating element", async () => {
    initOutsideClick({ event: "click" });

    await userEvent.click(anchorEl);
    await userEvent.click(floatingEl);
    await nextTick();

    expect(setOpenMock).not.toHaveBeenCalled();
    expect(context.state.open.value).toBe(true);
  });

  it("uses the ignoreClick predicate for per-target dismissal", async () => {
    const outsideEl = createOutsideElement();
    const ignoredEl = createOutsideElement("ignored");
    ignoredEl.style.left = "120px";
    initOutsideClick({
      event: "click",
      ignoreClick: (_event, target) => target === ignoredEl,
    });

    await userEvent.click(ignoredEl);
    await nextTick();
    expect(setOpenMock).not.toHaveBeenCalled();

    await userEvent.click(outsideEl);
    await nextTick();
    expect(setOpenMock).toHaveBeenCalledTimes(1);
    expect(setOpenMock).toHaveBeenNthCalledWith(1, false, "outside-pointer", expect.any(Event));
  });

  it("calls onClick instead of closing when a custom handler is provided", async () => {
    const outsideEl = createOutsideElement();
    const onClick = vi.fn();
    initOutsideClick({ event: "click", onClick });

    await userEvent.click(outsideEl);
    await nextTick();

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(setOpenMock).not.toHaveBeenCalled();
    expect(context.state.open.value).toBe(true);
  });

  it("ignores outside click after a drag that started inside the floating element", async () => {
    const outsideEl = createOutsideElement();
    initOutsideClick({ event: "click", ignoreDrag: true });

    floatingEl.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
    outsideEl.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    await nextTick();

    expect(setOpenMock).not.toHaveBeenCalled();
    expect(context.state.open.value).toBe(true);
  });

  it("keeps a parent open when clicking inside a child floating element", async () => {
    const childAnchorEl = trackElement(document.createElement("button"));
    const childFloatingEl = trackElement(document.createElement("div"));
    childFloatingEl.style.width = "100px";
    childFloatingEl.style.height = "100px";
    document.body.appendChild(childAnchorEl);
    document.body.appendChild(childFloatingEl);
    const parentOpen = ref(true);
    const childOpen = ref(true);
    const onParentOpenChange = vi.fn();

    scope = effectScope();
    scope.run(() => {
      const parentContext = useFloatingContext({
        refs: {
          anchorEl: ref(anchorEl),
          floatingEl: ref(floatingEl),
        },
        state: {
          open: parentOpen,
          onOpenChange: onParentOpenChange,
        },
      });
      useFloatingContext({
        refs: {
          anchorEl: ref(childAnchorEl),
          floatingEl: ref(childFloatingEl),
        },
        parentContext,
        state: { open: childOpen },
      });

      useOutsideClick(parentContext, { event: "click" });
    });

    await userEvent.click(childFloatingEl);
    await nextTick();

    expect(parentOpen.value).toBe(true);
    expect(onParentOpenChange).not.toHaveBeenCalled();
  });

  it("treats parent blank areas as outside for child contexts", async () => {
    const childAnchorEl = trackElement(document.createElement("button"));
    const childFloatingEl = trackElement(document.createElement("div"));
    childFloatingEl.style.width = "100px";
    childFloatingEl.style.height = "100px";
    document.body.appendChild(childAnchorEl);
    document.body.appendChild(childFloatingEl);
    const parentOpen = ref(true);
    const childOpen = ref(true);

    scope = effectScope();
    scope.run(() => {
      const parentContext = useFloatingContext({
        refs: {
          anchorEl: ref(anchorEl),
          floatingEl: ref(floatingEl),
        },
        state: { open: parentOpen },
      });
      const childContext = useFloatingContext({
        refs: {
          anchorEl: ref(childAnchorEl),
          floatingEl: ref(childFloatingEl),
        },
        parentContext,
        state: { open: childOpen },
      });

      useOutsideClick(childContext, { event: "click" });
    });

    await userEvent.click(floatingEl);
    await nextTick();

    expect(parentOpen.value).toBe(true);
    expect(childOpen.value).toBe(false);
  });
});
