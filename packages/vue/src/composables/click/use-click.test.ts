import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-vue";
import { page, userEvent } from "vitest/browser";
import { computed, defineComponent, h, nextTick, ref, useTemplateRef, type VNode } from "vue";
import {
  type UseClickOptions,
  type VirtualElement,
  useClick,
  useFloatingNode,
} from "@/composables";
import { getTestEl, makeMouseEvent, makePointerEvent } from "@/test-utils";

type AnchorKind =
  | "button"
  | "role-button"
  | "link"
  | "bare-link"
  | "summary"
  | "nested-button"
  | "nested-link"
  | "text-input"
  | "button-input"
  | "plain-div";

interface FixtureConfig {
  anchorKind?: AnchorKind;
  defaultOpen?: boolean;
}

function renderAnchor(kind: AnchorKind, extraProps: Record<string, unknown> = {}): VNode {
  const base = { ref: "anchor", "data-testid": "anchor", ...extraProps };
  switch (kind) {
    case "role-button":
      return h("div", { role: "button", tabindex: 0, ...base }, "Custom Button");
    case "link":
      return h("a", { href: "#", ...base }, "Link");
    case "bare-link":
      return h("a", { tabindex: 0, ...base }, "Link without href");
    case "summary":
      return h("details", [h("summary", base, "Summary Trigger")]);
    case "nested-button":
      return h("button", base, [h("span", { "data-testid": "anchor-child" }, "Child Icon")]);
    case "nested-link":
      return h("a", { href: "#", ...base }, [
        h("span", { "data-testid": "anchor-child" }, "Child Link"),
      ]);
    case "text-input":
      return h("input", { type: "text", ...base });
    case "button-input":
      return h("input", { type: "button", value: "Click me", ...base });
    case "plain-div":
      return h("div", base, "Trigger");
    case "button":
    default:
      return h("button", base, "Trigger");
  }
}

function createTestComponent(options: UseClickOptions = {}, config: FixtureConfig = {}) {
  const openRef = ref(config.defaultOpen ?? false);

  const Component = defineComponent(() => {
    const anchorEl = useTemplateRef<HTMLElement>("anchor");
    const floatingEl = useTemplateRef<HTMLElement>("floating");

    useClick(
      useFloatingNode({
        anchorEl,
        floatingEl,
        open: openRef,
      }),
      options,
    );

    return () =>
      h("div", { class: "test-wrapper" }, [
        renderAnchor(config.anchorKind ?? "button", {
          "aria-expanded": String(openRef.value),
        }),
        openRef.value ? h("div", { ref: "floating", "data-testid": "floating" }, "Floating") : null,
      ]);
  });

  return { Component, openRef };
}

async function renderClick(options: UseClickOptions = {}, config: FixtureConfig = {}) {
  const fixture = createTestComponent(options, config);
  await render(fixture.Component);
  await nextTick();
  return {
    anchorEl: page.getByTestId("anchor"),
    floatingEl: page.getByTestId("floating"),
    openRef: fixture.openRef,
  };
}

describe("Feature: useClick", () => {
  describe("Scenario: Toggle activation on anchor click", () => {
    it("Given a closed floating element with toggle enabled, When the anchor is clicked, Then opens and marks anchor as expanded", async () => {
      // Given
      const { anchorEl, floatingEl } = await renderClick({ toggle: true });
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();

      // When
      await userEvent.click(anchorEl);

      // Then
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();
    });

    it("Given an open floating element with toggle enabled, When the anchor is clicked again, Then closes and marks anchor as collapsed", async () => {
      // Given
      const { anchorEl, floatingEl } = await renderClick({ toggle: true }, { defaultOpen: true });
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();

      // When
      await userEvent.click(anchorEl);

      // Then
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();
    });

    it("Given toggle is disabled, When the anchor is clicked repeatedly, Then opens on first click and remains open", async () => {
      // Given
      const { anchorEl, floatingEl } = await renderClick({ toggle: false });
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");

      // When
      await userEvent.click(anchorEl);

      // Then
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();

      // When clicked again
      await userEvent.click(anchorEl);

      // Then remains open
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
    });

    it("Given an open floating element with toggle disabled, When the anchor is clicked, Then preserves open state", async () => {
      // Given
      const { anchorEl, floatingEl } = await renderClick({ toggle: false }, { defaultOpen: true });
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();

      // When
      await userEvent.click(anchorEl);

      // Then
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();
    });

    it("Given anchor element, When auxiliary mouse buttons (right or middle) are clicked, Then preserves closed state", async () => {
      // Given
      const { anchorEl, floatingEl } = await renderClick();
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");

      // When right-clicked
      await userEvent.click(anchorEl, { button: "right" });

      // Then remains closed
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();

      // When middle-clicked
      await userEvent.click(anchorEl, { button: "middle" });

      // Then remains closed
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();
    });
  });

  describe("Scenario: Pointer event handling and modality filtering", () => {
    it("Given ignoreMouse is true, When anchor is clicked via mouse pointer, Then preserves closed state", async () => {
      // Given
      const { anchorEl, floatingEl } = await renderClick({ ignoreMouse: true });
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");

      // When
      await userEvent.click(anchorEl);

      // Then
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();
    });

    it("Given event option is 'mousedown', When anchor is clicked via user gesture, Then toggles open state on mousedown without double-toggling on click", async () => {
      // Given
      const { anchorEl, floatingEl } = await renderClick({
        event: "mousedown",
        toggle: true,
      });
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");

      // When: User clicks anchor (triggers pointerdown -> mousedown -> click sequence)
      await userEvent.click(anchorEl);

      // Then: Opens cleanly on mousedown and does not double-toggle back to closed on click
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();

      // When: Clicked a second time
      await userEvent.click(anchorEl);

      // Then: Closes cleanly
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();
    });

    it("Given event option is 'mousedown', When auxiliary mouse buttons (right or middle) are clicked, Then preserves closed state", async () => {
      // Given
      const { anchorEl, floatingEl } = await renderClick({ event: "mousedown" });
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");

      // When: Right click
      await userEvent.click(anchorEl, { button: "right" });
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();

      // When: Middle click
      await userEvent.click(anchorEl, { button: "middle" });
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();
    });

    it("Given unknown pointer device with empty pointerType, When event is 'mousedown', Then opens and avoids double-toggle on subsequent click", async () => {
      // Given
      const { anchorEl, floatingEl } = await renderClick({
        event: "mousedown",
        toggle: true,
      });
      const rawAnchorEl = getTestEl("anchor");
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");

      // When: Browser cannot determine device type so pointerType is ""
      rawAnchorEl.dispatchEvent(makePointerEvent("pointerdown", { button: 0, pointerType: "" }));
      rawAnchorEl.dispatchEvent(makeMouseEvent("mousedown", { button: 0 }));
      await nextTick();

      // Then: Opens on mousedown
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();

      // When: Subsequent click event from same gesture fires
      rawAnchorEl.dispatchEvent(makeMouseEvent("click", { detail: 1 }));
      await nextTick();

      // Then: Remains open rather than double-toggling closed
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();
    });

    it("Given unknown pointer device with detail 0, When ignoreKeyboard is true, Then treats gesture as pointer and opens", async () => {
      // Given
      const { anchorEl, floatingEl } = await renderClick({ ignoreKeyboard: true });
      const rawAnchorEl = getTestEl("anchor");
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");

      // When: pointerdown preceded the click, so it is a pointer gesture, not keyboard
      rawAnchorEl.dispatchEvent(makePointerEvent("pointerdown", { button: 0, pointerType: "" }));
      rawAnchorEl.dispatchEvent(makeMouseEvent("click", { detail: 0 }));
      await nextTick();

      // Then
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();
    });

    it("Given unknown pointer device with empty pointerType, When ignoreMouse is true, Then allows the unknown device and opens", async () => {
      // Given
      const { anchorEl, floatingEl } = await renderClick({ ignoreMouse: true });
      const rawAnchorEl = getTestEl("anchor");
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");

      // When
      rawAnchorEl.dispatchEvent(makePointerEvent("pointerdown", { button: 0, pointerType: "" }));
      rawAnchorEl.dispatchEvent(makeMouseEvent("click", { detail: 1 }));
      await nextTick();

      // Then
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();
    });

    it("Given ignoreTouch is true, When touched via touch pointer events, Then preserves closed state", async () => {
      // Given
      const { anchorEl, floatingEl } = await renderClick({ ignoreTouch: true });
      const rawAnchorEl = getTestEl("anchor");
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");

      // When: Touch sequence arrives
      rawAnchorEl.dispatchEvent(makePointerEvent("pointerdown", { pointerType: "touch" }));
      rawAnchorEl.dispatchEvent(makeMouseEvent("click", { detail: 1 }));
      await nextTick();

      // Then: Does not open
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();
    });

    it("Given a touch gesture when event is 'mousedown', When pointerdown and mousedown fire, Then defers opening until the trailing click", async () => {
      // Given
      const { anchorEl, floatingEl } = await renderClick({
        event: "mousedown",
        toggle: true,
      });
      const rawAnchorEl = getTestEl("anchor");
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");

      // When: Touch sequence begins (pointerdown -> mousedown)
      rawAnchorEl.dispatchEvent(
        makePointerEvent("pointerdown", { button: 0, pointerType: "touch" }),
      );
      rawAnchorEl.dispatchEvent(makeMouseEvent("mousedown", { button: 0 }));
      await nextTick();

      // Then: Does not open prematurely on touch mousedown
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();

      // When: Subsequent trailing click arrives
      rawAnchorEl.dispatchEvent(makeMouseEvent("click", { detail: 1 }));
      await nextTick();

      // Then: Opens on trailing click
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();
    });

    it("Given event option is a reactive ref, When switched from 'click' to 'mousedown', Then opens on mousedown", async () => {
      // Given
      const eventOption = ref<"click" | "mousedown">("click");
      const { anchorEl, floatingEl } = await renderClick({ event: eventOption });
      const rawAnchorEl = getTestEl("anchor");
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");

      // When: In 'click' mode, mousedown alone does not open
      rawAnchorEl.dispatchEvent(makeMouseEvent("mousedown", { button: 0 }));
      await nextTick();
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();

      // When: Dynamically switched to 'mousedown'
      eventOption.value = "mousedown";
      await nextTick();

      // Then: mousedown immediately opens
      rawAnchorEl.dispatchEvent(makeMouseEvent("mousedown", { button: 0 }));
      await nextTick();
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();
    });
  });

  describe("Scenario: Keyboard activation on Enter and Space keys", () => {
    it("Given ignoreKeyboard is true on a native button, When activated via Enter key, Then preserves closed state", async () => {
      // Given
      const { anchorEl, floatingEl } = await renderClick({ ignoreKeyboard: true });
      const rawAnchorEl = getTestEl("anchor");
      rawAnchorEl.focus();
      await expect.element(anchorEl).toHaveFocus();
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");

      // When: Pressing Enter on native button dispatches browser click with detail 0
      await userEvent.keyboard("{Enter}");

      // Then: Preserves closed state
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();
    });

    it("Given a focused anchor, When Enter key is pressed, Then toggles the floating element open and closed", async () => {
      // Given
      const { anchorEl, floatingEl } = await renderClick();
      const rawAnchorEl = getTestEl("anchor");
      rawAnchorEl.focus();
      await expect.element(anchorEl).toHaveFocus();
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");

      // When
      await userEvent.keyboard("{Enter}");

      // Then
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();

      // When pressed again
      await userEvent.keyboard("{Enter}");

      // Then
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();
    });

    it("Given a focused anchor, When Space key is pressed, Then toggles the floating element open and closed", async () => {
      // Given
      const { anchorEl, floatingEl } = await renderClick();
      const rawAnchorEl = getTestEl("anchor");
      rawAnchorEl.focus();
      await expect.element(anchorEl).toHaveFocus();
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");

      // When
      await userEvent.keyboard(" ");

      // Then
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();

      // When pressed again
      await userEvent.keyboard(" ");

      // Then
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();
    });

    it("Given ignoreKeyboard is true, When Space key is pressed on a non-button trigger, Then preserves closed state", async () => {
      // Given
      const { anchorEl, floatingEl } = await renderClick(
        { ignoreKeyboard: true },
        { anchorKind: "role-button" },
      );
      const rawAnchorEl = getTestEl("anchor");
      rawAnchorEl.focus();
      await expect.element(anchorEl).toHaveFocus();

      // When
      await userEvent.keyboard(" ");

      // Then
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();
    });

    it("Given an open element opened by Enter key, When repeating Enter keydown events fire with repeat true, Then ignores repeat events and remains open", async () => {
      // Given
      const { anchorEl, floatingEl } = await renderClick({}, { anchorKind: "role-button" });
      const rawAnchorEl = getTestEl("anchor");
      rawAnchorEl.focus();
      await expect.element(anchorEl).toHaveFocus();

      // When: Initial Enter opens
      await userEvent.keyboard("{Enter}");
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();

      // When: Repeating keydown arrives while holding key
      const repeatEvent = new KeyboardEvent("keydown", {
        key: "Enter",
        repeat: true,
        bubbles: true,
      });
      rawAnchorEl.dispatchEvent(repeatEvent);
      await nextTick();

      // Then: Still remains open (does not toggle closed)
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();
    });

    it("Given a focused custom trigger, When Space key is pressed down, Then prevents default to suppress page scrolling", async () => {
      // Given
      const { anchorEl } = await renderClick({}, { anchorKind: "role-button" });
      const rawAnchorEl = getTestEl("anchor");
      rawAnchorEl.focus();
      await expect.element(anchorEl).toHaveFocus();

      // When: Space keydown is dispatched
      const spaceEvent = new KeyboardEvent("keydown", {
        key: " ",
        bubbles: true,
        cancelable: true,
      });
      rawAnchorEl.dispatchEvent(spaceEvent);

      // Then: Prevents default browser scroll action
      expect(spaceEvent.defaultPrevented).toBe(true);
    });
  });

  describe("Scenario: Dynamic enablement and option reactivity", () => {
    it("Given enabled is initially false, When anchor is clicked, Then ignores click until enabled becomes true", async () => {
      // Given
      const enabled = ref(false);
      const { anchorEl, floatingEl } = await renderClick({ enabled });
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");

      // When clicked while disabled
      await userEvent.click(anchorEl);

      // Then
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();

      // When dynamically enabled
      enabled.value = true;
      await nextTick();
      await userEvent.click(anchorEl);

      // Then
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();
    });

    it("Given an active open element, When enabled changes to false, Then ignores subsequent clicks and preserves open state", async () => {
      // Given
      const enabled = ref(true);
      const { anchorEl, floatingEl } = await renderClick({ enabled });

      // When opened
      await userEvent.click(anchorEl);
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();

      // When dynamically disabled
      enabled.value = false;
      await nextTick();
      await userEvent.click(anchorEl);

      // Then: Preserves open state because click was ignored
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();
    });

    it("Given toggle option is a reactive ref, When toggle value is changed dynamically, Then respects the updated toggle behavior", async () => {
      // Given
      const toggle = ref(false);
      const { anchorEl, floatingEl } = await renderClick({ toggle });
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");

      // When opened with toggle = false
      await userEvent.click(anchorEl);
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();

      // When clicked again while toggle = false
      await userEvent.click(anchorEl);

      // Then remains open
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();

      // When toggle is dynamically switched to true
      toggle.value = true;
      await nextTick();
      await userEvent.click(anchorEl);

      // Then closes
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();
    });

    it("Given a mounted component, When the component is unmounted, Then detaches all listeners from anchor", async () => {
      // Given
      const fixture = createTestComponent();
      const screen = await render(fixture.Component);
      await nextTick();
      const rawAnchorEl = getTestEl("anchor");

      // When: Component unmounts
      await screen.unmount();
      await nextTick();

      // When: Click event dispatched on old element
      rawAnchorEl.dispatchEvent(makeMouseEvent("click", { button: 0 }));
      await nextTick();

      // Then: Open state was not modified
      expect(fixture.openRef.value).toBe(false);
    });
  });

  describe("Scenario: Anchor element types and virtual triggers", () => {
    it("Given a div with role='button', When Enter and Space keys are pressed, Then toggles open state", async () => {
      // Given
      const { anchorEl, floatingEl } = await renderClick({}, { anchorKind: "role-button" });
      const rawAnchorEl = getTestEl("anchor");
      rawAnchorEl.focus();
      await expect.element(anchorEl).toHaveFocus();

      // When Enter pressed
      await userEvent.keyboard("{Enter}");

      // Then opens
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();

      // When Space pressed
      await userEvent.keyboard(" ");

      // Then closes
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();
    });

    it("Given an anchor element with href, When Enter key is pressed, Then opens without double-triggering", async () => {
      // Given
      const { anchorEl, floatingEl } = await renderClick({}, { anchorKind: "link" });
      const rawAnchorEl = getTestEl("anchor");
      rawAnchorEl.focus();
      await expect.element(anchorEl).toHaveFocus();

      // When Enter pressed
      await userEvent.keyboard("{Enter}");

      // Then opens
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();

      // When Space pressed
      await userEvent.keyboard(" ");

      // Then closes
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();
    });

    it("Given an anchor element without href, When Enter and Space keys are pressed, Then toggles open state", async () => {
      // Given
      const { anchorEl, floatingEl } = await renderClick({}, { anchorKind: "bare-link" });
      const rawAnchorEl = getTestEl("anchor");
      rawAnchorEl.focus();
      await expect.element(anchorEl).toHaveFocus();

      // When Enter pressed
      await userEvent.keyboard("{Enter}");

      // Then opens
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();

      // When Space pressed
      await userEvent.keyboard(" ");

      // Then closes
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();
    });

    it("Given a summary element trigger, When Enter and Space keys are pressed, Then toggles open state without double-triggering", async () => {
      // Given
      const { anchorEl, floatingEl } = await renderClick({}, { anchorKind: "summary" });
      const rawAnchorEl = getTestEl("anchor");
      rawAnchorEl.focus();
      await expect.element(anchorEl).toHaveFocus();

      // When: Enter pressed on summary
      await userEvent.keyboard("{Enter}");

      // Then: Opens cleanly
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();

      // When: Space pressed on summary
      await userEvent.keyboard(" ");

      // Then: Closes cleanly
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();
    });

    it("Given a native button with nested child elements, When child element is clicked, Then identifies button target and toggles open state cleanly", async () => {
      // Given
      const { anchorEl, floatingEl } = await renderClick({}, { anchorKind: "nested-button" });
      const childEl = page.getByTestId("anchor-child");
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");

      // When: Clicked on nested child inside button
      await userEvent.click(childEl);

      // Then: Opens without double-toggling
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();

      // When: Clicked again on child
      await userEvent.click(childEl);

      // Then: Closes cleanly
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();
    });

    it("Given a link element with nested child elements, When child element receives Enter key, Then identifies link target and opens without double-triggering", async () => {
      // Given
      const { anchorEl, floatingEl } = await renderClick({}, { anchorKind: "nested-link" });
      const rawAnchorEl = getTestEl("anchor");
      rawAnchorEl.focus();
      await expect.element(anchorEl).toHaveFocus();

      // When: Enter pressed
      await userEvent.keyboard("{Enter}");

      // Then: Opens cleanly
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();
    });

    it("Given a button trigger with text node descendants, When event target is a text node or non-element, Then resolves target safely", async () => {
      // Given
      const { anchorEl, floatingEl } = await renderClick({}, { anchorKind: "nested-button" });
      const childEl = getTestEl("anchor-child");
      const textNode = childEl.firstChild!;
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");

      // When: Keydown event targeting the text node arrives
      const textEvent = new KeyboardEvent("keydown", { key: "Enter", bubbles: true });
      textNode.dispatchEvent(textEvent);
      await nextTick();

      // Then: Native button target recognition resolves parent element and suppresses duplicate handling
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();

      // When: Event target is non-element object (e.g. window)
      const windowEvent = new KeyboardEvent("keydown", { key: "Enter", bubbles: true });
      Object.defineProperty(windowEvent, "target", { value: window });
      const rawAnchorEl = getTestEl("anchor");
      rawAnchorEl.dispatchEvent(windowEvent);
      await nextTick();

      // Then: Handled safely without throwing and opens since window is not a button target
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
    });

    it("Given a typeable text input anchor, When typing characters or pressing Enter, Then preserves closed state", async () => {
      // Given
      const { anchorEl, floatingEl } = await renderClick({}, { anchorKind: "text-input" });
      const rawAnchorEl = getTestEl("anchor");
      rawAnchorEl.focus();
      await expect.element(anchorEl).toHaveFocus();

      // When typing text
      await userEvent.keyboard("hello world");

      // Then
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();

      // When pressing Enter in input
      await userEvent.keyboard("{Enter}");

      // Then
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();
    });

    it("Given an input element with type='button', When Enter and Space keys are pressed, Then toggles open state", async () => {
      // Given
      const { anchorEl, floatingEl } = await renderClick({}, { anchorKind: "button-input" });
      const rawAnchorEl = getTestEl("anchor");
      rawAnchorEl.focus();
      await expect.element(anchorEl).toHaveFocus();

      // When Enter pressed
      await userEvent.keyboard("{Enter}");

      // Then opens
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();

      // When Space pressed
      await userEvent.keyboard(" ");

      // Then closes
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();
    });

    it("Given a virtual element with a contextElement, When context element is clicked, Then toggles open state", async () => {
      // Given
      const openRef = ref(false);
      const Component = defineComponent(() => {
        const floatingEl = useTemplateRef<HTMLElement>("floating");
        const contextEl = useTemplateRef<HTMLElement>("context");
        const virtualAnchor = computed<VirtualElement | null>(() => {
          if (!contextEl.value) return null;
          return {
            getBoundingClientRect: () => contextEl.value!.getBoundingClientRect(),
            contextElement: contextEl.value,
          };
        });

        useClick(
          useFloatingNode({
            anchorEl: virtualAnchor,
            floatingEl,
            open: openRef,
          }),
        );

        return () =>
          h("div", { class: "test-wrapper" }, [
            h(
              "button",
              {
                ref: "context",
                "data-testid": "context-btn",
                "aria-expanded": String(openRef.value),
              },
              "Context Target",
            ),
            openRef.value
              ? h("div", { ref: "floating", "data-testid": "floating" }, "Floating")
              : null,
          ]);
      });

      await render(Component);
      await nextTick();
      const contextBtnEl = page.getByTestId("context-btn");
      const floatingEl = page.getByTestId("floating");

      await expect.element(contextBtnEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();

      // When
      await userEvent.click(contextBtnEl);

      // Then
      await expect.element(contextBtnEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();

      // When clicked again
      await userEvent.click(contextBtnEl);

      // Then
      await expect.element(contextBtnEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();
    });
  });

  describe("Scenario: Stale interaction state cleanup", () => {
    it("Given an in-progress touch gesture that is cancelled, When pointercancel fires, Then allows subsequent non-touch clicks", async () => {
      // Given
      const { anchorEl, floatingEl } = await renderClick({ ignoreTouch: true });
      const rawAnchorEl = getTestEl("anchor");
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");

      // When: Simulate a touch sequence that gets cancelled (e.g. user starts dragging/scrolling away)
      rawAnchorEl.dispatchEvent(makePointerEvent("pointerdown", { pointerType: "touch" }));
      rawAnchorEl.dispatchEvent(makePointerEvent("pointercancel", { pointerType: "touch" }));

      // When: Subsequent non-touch click arrives
      rawAnchorEl.dispatchEvent(makeMouseEvent("click", { detail: 1 }));
      await nextTick();

      // Then: Click is not blocked by stale touch state
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();
    });
  });

  describe("Scenario: IME composition safety", () => {
    it("Given an active IME composition session on a non-button trigger, When Enter or Space is pressed, Then ignores activation until composition ends", async () => {
      // Given
      const { anchorEl, floatingEl } = await renderClick({}, { anchorKind: "plain-div" });
      const rawAnchorEl = getTestEl("anchor");
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");

      // When: Start IME
      document.dispatchEvent(new CompositionEvent("compositionstart"));

      // Enter during IME
      rawAnchorEl.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
      await nextTick();
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();

      // Space during IME
      rawAnchorEl.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true }));
      rawAnchorEl.dispatchEvent(new KeyboardEvent("keyup", { key: " ", bubbles: true }));
      await nextTick();
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();

      // When: End IME
      document.dispatchEvent(new CompositionEvent("compositionend"));

      // Enter after IME
      rawAnchorEl.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
      await nextTick();

      // Then: Opens normally
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();
    });

    it("Given a keydown event with isComposing true directly, When Enter is pressed, Then ignores activation", async () => {
      // Given
      const { anchorEl, floatingEl } = await renderClick({}, { anchorKind: "plain-div" });
      const rawAnchorEl = getTestEl("anchor");
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");

      // When
      const event = new KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
        isComposing: true,
      });
      rawAnchorEl.dispatchEvent(event);
      await nextTick();

      // Then
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();
    });

    it("Given an in-progress Space keypress on a custom trigger, When keyup occurs while IME composition is active, Then ignores activation", async () => {
      // Given
      const { anchorEl, floatingEl } = await renderClick({}, { anchorKind: "role-button" });
      const rawAnchorEl = getTestEl("anchor");
      rawAnchorEl.focus();
      await expect.element(anchorEl).toHaveFocus();

      // When: Space keydown fires before IME begins
      rawAnchorEl.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true }));
      await nextTick();

      // When: IME starts before keyup
      document.dispatchEvent(new CompositionEvent("compositionstart"));

      // When: Keyup arrives during IME
      rawAnchorEl.dispatchEvent(new KeyboardEvent("keyup", { key: " ", bubbles: true }));
      await nextTick();

      // Then: Does not open
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();

      // End IME
      document.dispatchEvent(new CompositionEvent("compositionend"));
    });
  });
});
