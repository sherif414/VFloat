import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-vue";
import { page, userEvent } from "vitest/browser";
import { defineComponent, h, nextTick, ref, useTemplateRef } from "vue";
import { useEventListener } from "@/shared/use-event-listener";

//=======================================================================================
// 📌 Fixtures
//=======================================================================================

async function renderSingleTargetFixture(listener: (e: Event) => void) {
  let stop!: () => void;

  const Component = defineComponent(() => {
    const targetEl = useTemplateRef<HTMLElement>("target");
    stop = useEventListener(targetEl, "click", listener);
    return () => h("button", { ref: "target", "data-testid": "target" }, "Target");
  });

  await render(Component);
  await nextTick();

  return {
    targetEl: page.getByTestId("target"),
    stop: () => stop(),
  };
}

async function renderMultiTargetFixture(listener: (e: Event) => void) {
  const activeTarget = ref<HTMLElement | null>(null);
  let target1ElDom: HTMLElement | null = null;
  let target2ElDom: HTMLElement | null = null;

  const Component = defineComponent(() => {
    useEventListener(activeTarget, "click", listener);

    return () =>
      h("div", [
        h(
          "button",
          {
            ref: (el) => {
              target1ElDom = el as HTMLElement;
            },
            "data-testid": "target-1",
          },
          "Target 1",
        ),
        h(
          "button",
          {
            ref: (el) => {
              target2ElDom = el as HTMLElement;
            },
            "data-testid": "target-2",
          },
          "Target 2",
        ),
      ]);
  });

  await render(Component);
  await nextTick();

  return {
    target1El: page.getByTestId("target-1"),
    target2El: page.getByTestId("target-2"),
    setTarget: (target: "first" | "second" | null) => {
      if (target === "first") activeTarget.value = target1ElDom;
      else if (target === "second") activeTarget.value = target2ElDom;
      else activeTarget.value = null;
    },
  };
}

async function renderEventNameFixture(listener: (e: Event) => void) {
  const eventName = ref("click");
  let stop!: () => void;

  const Component = defineComponent(() => {
    const targetEl = useTemplateRef<HTMLElement>("target");
    stop = useEventListener(targetEl, eventName, listener);
    return () => h("button", { ref: "target", "data-testid": "target" }, "Target");
  });

  await render(Component);
  await nextTick();

  return {
    targetEl: page.getByTestId("target"),
    eventName,
    stop: () => stop(),
  };
}

async function renderChildScopeFixture(listener: (e: Event) => void) {
  const showChild = ref(true);

  const Child = defineComponent({
    props: {
      target: {
        type: Object as () => HTMLElement | null,
        default: null,
      },
    },
    setup(props) {
      useEventListener(() => props.target, "click", listener);
      return () => h("span", { "data-testid": "child" }, "Child");
    },
  });

  const Component = defineComponent(() => {
    const targetEl = ref<HTMLElement | null>(null);

    return () =>
      h("div", [
        h(
          "button",
          {
            ref: (el) => {
              targetEl.value = el as HTMLElement;
            },
            "data-testid": "target",
          },
          "Target",
        ),
        showChild.value ? h(Child, { target: targetEl.value }) : null,
      ]);
  });

  await render(Component);
  await nextTick();

  return {
    targetEl: page.getByTestId("target"),
    showChild,
  };
}

async function renderOptionsFixture() {
  const clickListener = vi.fn();
  const focusListener = vi.fn();
  let stopClick!: () => void;
  let stopFocus!: () => void;
  let addSpy!: ReturnType<typeof vi.spyOn>;
  let removeSpy!: ReturnType<typeof vi.spyOn>;

  const Component = defineComponent(() => {
    const targetRef = ref<HTMLElement | null>(null);

    return () =>
      h(
        "button",
        {
          ref: (el) => {
            if (el && !targetRef.value) {
              const btn = el as HTMLElement;
              addSpy = vi.spyOn(btn, "addEventListener");
              removeSpy = vi.spyOn(btn, "removeEventListener");
              targetRef.value = btn;
              stopClick = useEventListener(targetRef, "click", clickListener, true);
              stopFocus = useEventListener(targetRef, "focusin", focusListener, {
                capture: true,
              });
            }
          },
          "data-testid": "target",
        },
        "Target",
      );
  });

  await render(Component);
  await nextTick();

  return {
    targetEl: page.getByTestId("target"),
    clickListener,
    focusListener,
    stopClick: () => stopClick(),
    stopFocus: () => stopFocus(),
    getAddSpy: () => addSpy,
    getRemoveSpy: () => removeSpy,
  };
}

//=======================================================================================
// 📌 BDD Test Suite
//=======================================================================================

describe("Feature: useEventListener reactive DOM listener lifecycle", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe("Scenario: Attachment, retargeting, and event name reactivity", () => {
    it("Given an element target and listener, When stop handle is called, Then listener stops receiving events", async () => {
      const listener = vi.fn();
      const { targetEl, stop } = await renderSingleTargetFixture(listener);

      await expect.element(targetEl).toBeInTheDocument();
      expect(listener).not.toHaveBeenCalled();

      await userEvent.click(targetEl);
      expect(listener).toHaveBeenCalledTimes(1);

      stop();
      await userEvent.click(targetEl);
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("Given a reactive target ref, When target transitions from null to elements, Then listener attaches to the active element", async () => {
      const listener = vi.fn();
      const { target1El, target2El, setTarget } = await renderMultiTargetFixture(listener);

      await userEvent.click(target1El);
      expect(listener).not.toHaveBeenCalled();

      setTarget("first");
      await nextTick();

      await userEvent.click(target1El);
      expect(listener).toHaveBeenCalledTimes(1);

      setTarget("second");
      await nextTick();

      await userEvent.click(target1El);
      await userEvent.click(target2El);
      expect(listener).toHaveBeenCalledTimes(2);
    });

    it("Given a reactive event name ref, When event name updates, Then listener unbinds old event and binds new event", async () => {
      const listener = vi.fn();
      const { targetEl, eventName } = await renderEventNameFixture(listener);

      await userEvent.click(targetEl);
      expect(listener).toHaveBeenCalledTimes(1);

      eventName.value = "dblclick";
      await nextTick();

      await userEvent.click(targetEl);
      expect(listener).toHaveBeenCalledTimes(1);

      await userEvent.dblClick(targetEl);
      expect(listener).toHaveBeenCalledTimes(2);
    });
  });

  describe("Scenario: Scope disposal and options forwarding", () => {
    it("Given a listener bound inside a child component, When child component unmounts, Then listener cleans up automatically", async () => {
      const listener = vi.fn();
      const { targetEl, showChild } = await renderChildScopeFixture(listener);

      expect(listener).not.toHaveBeenCalled();

      await userEvent.click(targetEl);
      expect(listener).toHaveBeenCalledTimes(1);

      showChild.value = false;
      await nextTick();

      await userEvent.click(targetEl);
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("Given boolean and object AddEventListenerOptions, When bound and removed, Then options forward faithfully to native methods", async () => {
      const { clickListener, focusListener, stopClick, stopFocus, getAddSpy, getRemoveSpy } =
        await renderOptionsFixture();

      const addSpy = getAddSpy();
      const removeSpy = getRemoveSpy();

      expect(addSpy).toHaveBeenCalledWith("click", clickListener, true);

      stopClick();
      expect(removeSpy).toHaveBeenCalledWith("click", clickListener, true);

      expect(addSpy).toHaveBeenCalledWith(
        "focusin",
        focusListener,
        expect.objectContaining({ capture: true }),
      );

      stopFocus();
      expect(removeSpy).toHaveBeenCalledWith(
        "focusin",
        focusListener,
        expect.objectContaining({ capture: true }),
      );
    });
  });
});
