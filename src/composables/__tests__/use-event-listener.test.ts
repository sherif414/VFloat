import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { effectScope, nextTick, ref } from "vue";
import { useEventListener } from "@/shared/use-event-listener";

describe("useEventListener", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("attaches listeners and removes them when stopped", async () => {
    const target = document.createElement("button");
    const listener = vi.fn();
    document.body.appendChild(target);

    const stop = useEventListener(target, "click", listener);
    await nextTick();

    target.click();
    expect(listener).toHaveBeenCalledTimes(1);

    stop();
    target.click();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("supports null targets and retargets when the element changes", async () => {
    const firstTarget = document.createElement("button");
    const secondTarget = document.createElement("button");
    const target = ref<HTMLElement | null>(null);
    const listener = vi.fn();

    document.body.append(firstTarget, secondTarget);

    const stop = useEventListener(target, "click", listener);
    await nextTick();

    firstTarget.click();
    expect(listener).not.toHaveBeenCalled();

    target.value = firstTarget;
    await nextTick();

    firstTarget.click();
    expect(listener).toHaveBeenCalledTimes(1);

    target.value = secondTarget;
    await nextTick();

    firstTarget.click();
    secondTarget.click();
    expect(listener).toHaveBeenCalledTimes(2);

    stop();
  });

  it("rebinds when the event name changes", async () => {
    const target = document.createElement("button");
    const eventName = ref("click");
    const listener = vi.fn();

    document.body.appendChild(target);

    const stop = useEventListener(target, eventName, listener);
    await nextTick();

    target.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(listener).toHaveBeenCalledTimes(1);

    eventName.value = "mousedown";
    await nextTick();

    target.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    target.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    expect(listener).toHaveBeenCalledTimes(2);

    stop();
  });

  it("cleans up listeners when the parent effect scope stops", async () => {
    const target = document.createElement("button");
    const listener = vi.fn();
    const scope = effectScope();

    document.body.appendChild(target);

    scope.run(() => {
      useEventListener(target, "click", listener);
    });

    await nextTick();

    target.click();
    expect(listener).toHaveBeenCalledTimes(1);

    scope.stop();
    target.click();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("forwards boolean and object listener options", async () => {
    const target = document.createElement("button");
    const clickListener = vi.fn();
    const focusListener = vi.fn();
    const addSpy = vi.spyOn(target, "addEventListener");
    const removeSpy = vi.spyOn(target, "removeEventListener");

    document.body.appendChild(target);

    const stopClick = useEventListener(target, "click", clickListener, true);
    await nextTick();

    expect(addSpy).toHaveBeenCalledWith("click", clickListener, true);

    stopClick();

    expect(removeSpy).toHaveBeenCalledWith("click", clickListener, true);

    const stopFocus = useEventListener(target, "focusin", focusListener, { capture: true });
    await nextTick();

    expect(addSpy).toHaveBeenLastCalledWith(
      "focusin",
      focusListener,
      expect.objectContaining({ capture: true }),
    );

    stopFocus();

    expect(removeSpy).toHaveBeenLastCalledWith(
      "focusin",
      focusListener,
      expect.objectContaining({ capture: true }),
    );
  });
});
