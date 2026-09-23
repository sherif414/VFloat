import { afterEach, describe, expect, it, vi } from "vitest";
import { effectScope, nextTick, ref } from "vue";
import { useEventListener } from "@/shared/use-event-listener";
import { clearTrackedElements, trackElement } from "@/test-utils";

describe("Feature: useEventListener reactive DOM listener lifecycle", () => {
  afterEach(() => {
    clearTrackedElements();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe("Scenario: Attachment, retargeting, and event name reactivity", () => {
    it("Given an element target and listener, When stop handle is called, Then listener stops receiving events", async () => {
      const target = trackElement(document.createElement("button"));
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

    it("Given a reactive target ref, When target transitions from null to elements, Then listener attaches to the active element", async () => {
      const firstTarget = trackElement(document.createElement("button"));
      const secondTarget = trackElement(document.createElement("button"));
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

    it("Given a reactive event name ref, When event name updates, Then listener unbinds old event and binds new event", async () => {
      const target = trackElement(document.createElement("button"));
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
  });

  describe("Scenario: Scope disposal and options forwarding", () => {
    it("Given a listener bound inside an effect scope, When scope is stopped, Then listener cleans up automatically", async () => {
      const target = trackElement(document.createElement("button"));
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

    it("Given boolean and object AddEventListenerOptions, When bound and removed, Then options forward faithfully to native methods", async () => {
      const target = trackElement(document.createElement("button"));
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

      const stopFocus = useEventListener(target, "focusin", focusListener, {
        capture: true,
      });
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
});
