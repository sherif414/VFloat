import { describe, expect, it, vi } from "vitest";
import { effectScope, nextTick, ref, watchEffect } from "vue";
import { useFloatingContext } from "@/composables";
import { getFloatingContextFloatingElements } from "@/composables/floating-context/floating-context-registry";

describe("useFloatingContext", () => {
  it("uses defaultOpen for uncontrolled state", () => {
    const context = useFloatingContext({
      anchorEl: ref(null),
      floatingEl: ref(null),
      defaultOpen: true,
    });

    expect(context.state.open.value).toBe(true);
  });

  it("prefers controlled open state over defaultOpen", () => {
    const context = useFloatingContext({
      anchorEl: ref(null),
      floatingEl: ref(null),
      open: ref(false),
      defaultOpen: true,
    });

    expect(context.state.open.value).toBe(false);
  });

  it("uses controlled open state and forwards reasons and events", () => {
    const open = ref(false);
    const onOpenChange = vi.fn();
    const event = new KeyboardEvent("keydown");
    const context = useFloatingContext({
      anchorEl: ref(null),
      floatingEl: ref(null),
      open,
      onOpenChange,
    });

    context.state.setOpen(true, "keyboard-activate", event);

    expect(open.value).toBe(true);
    expect(onOpenChange).toHaveBeenCalledWith(true, "keyboard-activate", event);
  });

  it("falls back to programmatic reasons and ignores duplicate updates", () => {
    const onOpenChange = vi.fn();
    const context = useFloatingContext({
      anchorEl: ref(null),
      floatingEl: ref(null),
      onOpenChange,
    });

    context.state.setOpen(true);
    context.state.setOpen(true, "anchor-click");

    expect(context.state.open.value).toBe(true);
    expect(onOpenChange).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(true, "programmatic", undefined);
  });

  it("assigns each context a stable symbol id", () => {
    const context = useFloatingContext({
      anchorEl: ref(null),
      floatingEl: ref(null),
    });
    const otherContext = useFloatingContext({
      anchorEl: ref(null),
      floatingEl: ref(null),
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
      anchorEl: ref(null),
      floatingEl: ref(null),
      open: rootOpen,
      onOpenChange: () => calls.push("root"),
    });
    const child = useFloatingContext({
      anchorEl: ref(null),
      floatingEl: ref(null),
      parentContext: root,
      open: childOpen,
      onOpenChange: () => calls.push("child"),
    });
    useFloatingContext({
      anchorEl: ref(null),
      floatingEl: ref(null),
      parentContext: child,
      open: grandchildOpen,
      onOpenChange: () => calls.push("grandchild"),
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
      anchorEl: ref(null),
      floatingEl: ref(null),
      open: rootOpen,
    });
    const child = useFloatingContext({
      anchorEl: ref(null),
      floatingEl: ref(null),
      parentContext: root,
      open: childOpen,
    });

    child.state.setOpen(true, "programmatic");

    expect(rootOpen.value).toBe(false);
    expect(childOpen.value).toBe(true);
  });

  it("does not cascade when a controlled parent ref is written directly", () => {
    const rootOpen = ref(true);
    const childOpen = ref(true);
    const root = useFloatingContext({
      anchorEl: ref(null),
      floatingEl: ref(null),
      open: rootOpen,
    });
    useFloatingContext({
      anchorEl: ref(null),
      floatingEl: ref(null),
      parentContext: root,
      open: childOpen,
    });

    rootOpen.value = false;

    expect(childOpen.value).toBe(true);
  });

  it("unregisters child context links on scope disposal", () => {
    const rootOpen = ref(true);
    const childOpen = ref(true);
    const root = useFloatingContext({
      anchorEl: ref(null),
      floatingEl: ref(null),
      open: rootOpen,
    });
    const scope = effectScope();

    scope.run(() => {
      useFloatingContext({
        anchorEl: ref(null),
        floatingEl: ref(null),
        parentContext: root,
        open: childOpen,
      });
    });

    scope.stop();
    root.state.setOpen(false, "outside-pointer");

    expect(rootOpen.value).toBe(false);
    expect(childOpen.value).toBe(true);
  });

  it("unregisters child context links from family helpers on scope disposal", () => {
    const rootFloatingEl = document.createElement("div");
    const childFloatingEl = document.createElement("div");
    const root = useFloatingContext({
      anchorEl: ref(null),
      floatingEl: ref(rootFloatingEl),
    });
    const scope = effectScope();

    scope.run(() => {
      useFloatingContext({
        anchorEl: ref(null),
        floatingEl: ref(childFloatingEl),
        parentContext: root,
      });
    });

    expect(getFloatingContextFloatingElements(root)).toEqual([rootFloatingEl, childFloatingEl]);

    scope.stop();

    expect(getFloatingContextFloatingElements(root)).toEqual([rootFloatingEl]);
  });

  it("updates descendant floating element helpers when child contexts mount later", async () => {
    const rootFloatingEl = document.createElement("div");
    const childFloatingEl = document.createElement("div");
    const root = useFloatingContext({
      anchorEl: ref(null),
      floatingEl: ref(rootFloatingEl),
    });
    const lengths: number[] = [];
    const scope = effectScope();

    scope.run(() => {
      watchEffect(() => {
        lengths.push(getFloatingContextFloatingElements(root).length);
      });

      useFloatingContext({
        anchorEl: ref(null),
        floatingEl: ref(childFloatingEl),
        parentContext: root,
      });
    });

    await nextTick();
    scope.stop();

    expect(lengths).toEqual([1, 2]);
  });
});
