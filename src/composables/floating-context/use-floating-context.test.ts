import { describe, expect, it, vi } from "vite-plus/test";
import { effectScope, nextTick, ref, watchEffect } from "vue";
import {
  getFloatingContextFloatingElements,
  getFloatingInternals,
  useFloatingContext,
} from "@/composables";

describe("useFloatingContext", () => {
  it("uses controlled open state and forwards reasons and events", () => {
    const open = ref(false);
    const onOpenChange = vi.fn();
    const event = new KeyboardEvent("keydown");
    const context = useFloatingContext({
      refs: {
        anchorEl: ref(null),
        floatingEl: ref(null),
      },
      state: { open, onOpenChange },
    });

    context.state.setOpen(true, "keyboard-activate", event);

    expect(open.value).toBe(true);
    expect(onOpenChange).toHaveBeenCalledWith(true, "keyboard-activate", event);
  });

  it("falls back to programmatic reasons and ignores duplicate updates", () => {
    const onOpenChange = vi.fn();
    const context = useFloatingContext({
      refs: {
        anchorEl: ref(null),
        floatingEl: ref(null),
      },
      state: { onOpenChange },
    });

    context.state.setOpen(true);
    context.state.setOpen(true, "anchor-click");

    expect(context.state.open.value).toBe(true);
    expect(onOpenChange).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(true, "programmatic", undefined);
  });

  it("assigns each context a stable symbol id", () => {
    const context = useFloatingContext({
      refs: {
        anchorEl: ref(null),
        floatingEl: ref(null),
      },
    });
    const otherContext = useFloatingContext({
      refs: {
        anchorEl: ref(null),
        floatingEl: ref(null),
      },
    });

    expect(typeof context.id).toBe("symbol");
    expect(context.id).toBe(context.id);
    expect(context.id).not.toBe(otherContext.id);
  });

  it("closes descendant contexts from deepest to nearest child before closing the parent", () => {
    const calls: string[] = [];
    const rootOpen = ref(true);
    const childOpen = ref(true);
    const grandchildOpen = ref(true);
    const root = useFloatingContext({
      refs: {
        anchorEl: ref(null),
        floatingEl: ref(null),
      },
      state: {
        open: rootOpen,
        onOpenChange: () => calls.push("root"),
      },
    });
    const child = useFloatingContext({
      refs: {
        anchorEl: ref(null),
        floatingEl: ref(null),
      },
      parentContext: root,
      state: {
        open: childOpen,
        onOpenChange: () => calls.push("child"),
      },
    });
    useFloatingContext({
      refs: {
        anchorEl: ref(null),
        floatingEl: ref(null),
      },
      parentContext: child,
      state: {
        open: grandchildOpen,
        onOpenChange: () => calls.push("grandchild"),
      },
    });

    root.state.setOpen(false, "outside-pointer");

    expect(rootOpen.value).toBe(false);
    expect(childOpen.value).toBe(false);
    expect(grandchildOpen.value).toBe(false);
    expect(calls).toEqual(["grandchild", "child", "root"]);
  });

  it("does not open ancestors when opening a child context", () => {
    const rootOpen = ref(false);
    const childOpen = ref(false);
    const root = useFloatingContext({
      refs: {
        anchorEl: ref(null),
        floatingEl: ref(null),
      },
      state: { open: rootOpen },
    });
    const child = useFloatingContext({
      refs: {
        anchorEl: ref(null),
        floatingEl: ref(null),
      },
      parentContext: root,
      state: { open: childOpen },
    });

    child.state.setOpen(true, "programmatic");

    expect(rootOpen.value).toBe(false);
    expect(childOpen.value).toBe(true);
  });

  it("does not cascade when a controlled parent ref is written directly", () => {
    const rootOpen = ref(true);
    const childOpen = ref(true);
    const root = useFloatingContext({
      refs: {
        anchorEl: ref(null),
        floatingEl: ref(null),
      },
      state: { open: rootOpen },
    });
    useFloatingContext({
      refs: {
        anchorEl: ref(null),
        floatingEl: ref(null),
      },
      parentContext: root,
      state: { open: childOpen },
    });

    rootOpen.value = false;

    expect(childOpen.value).toBe(true);
  });

  it("unregisters child context links on scope disposal", () => {
    const rootOpen = ref(true);
    const childOpen = ref(true);
    const root = useFloatingContext({
      refs: {
        anchorEl: ref(null),
        floatingEl: ref(null),
      },
      state: { open: rootOpen },
    });
    const scope = effectScope();

    scope.run(() => {
      useFloatingContext({
        refs: {
          anchorEl: ref(null),
          floatingEl: ref(null),
        },
        parentContext: root,
        state: { open: childOpen },
      });
    });

    scope.stop();
    root.state.setOpen(false, "outside-pointer");

    expect(rootOpen.value).toBe(false);
    expect(childOpen.value).toBe(true);
  });

  it("tracks child links by context id", () => {
    const root = useFloatingContext({
      refs: {
        anchorEl: ref(null),
        floatingEl: ref(null),
      },
    });
    const scope = effectScope();
    let childId: symbol | undefined;

    scope.run(() => {
      const child = useFloatingContext({
        refs: {
          anchorEl: ref(null),
          floatingEl: ref(null),
        },
        parentContext: root,
      });
      childId = child.id;
    });

    const childContextIds = getFloatingInternals(root)?.childContextIds?.value;
    expect(childContextIds).toEqual(new Set([childId]));

    scope.stop();

    expect(getFloatingInternals(root)?.childContextIds?.value.size).toBe(0);
  });

  it("updates descendant floating element helpers when child contexts mount later", async () => {
    const rootFloatingEl = document.createElement("div");
    const childFloatingEl = document.createElement("div");
    const root = useFloatingContext({
      refs: {
        anchorEl: ref(null),
        floatingEl: ref(rootFloatingEl),
      },
    });
    const lengths: number[] = [];
    const scope = effectScope();

    scope.run(() => {
      watchEffect(() => {
        lengths.push(getFloatingContextFloatingElements(root).length);
      });

      useFloatingContext({
        refs: {
          anchorEl: ref(null),
          floatingEl: ref(childFloatingEl),
        },
        parentContext: root,
      });
    });

    await nextTick();
    scope.stop();

    expect(lengths).toEqual([1, 2]);
  });
});
