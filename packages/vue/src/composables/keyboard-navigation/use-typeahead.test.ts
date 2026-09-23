import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-vue";
import { page } from "vitest/browser";
import { defineComponent, h, nextTick, ref, useTemplateRef, type MaybeRefOrGetter } from "vue";
import {
  type NavigationTarget,
  type TypeaheadFindMatchFn,
  useAriaActivedescendant,
  useFloatingNode,
  useRovingFocus,
  useTypeahead,
} from "@/composables";
import { dispatchKey, getTestEl } from "@/test-utils";

interface FixtureConfig {
  withTypeableInput?: boolean;
  withCustomContainer?: boolean;
}

interface SetupOptions {
  items?: readonly (string | null)[];
  activeIndex?: MaybeRefOrGetter<number>;
  target?: NavigationTarget;
  onMatch?: (index: number) => void;
  enabled?: MaybeRefOrGetter<boolean>;
  resetMs?: MaybeRefOrGetter<number>;
  ignoreKeys?: MaybeRefOrGetter<readonly string[]>;
  findMatch?: TypeaheadFindMatchFn | null | undefined;
  isItemDisabled?: (index: number) => boolean;
  open?: boolean;
}

const DEFAULT_ITEMS = ["Apple", "Apricot", "Avocado", "Banana", "Blueberry", "Cherry"];

function createTestComponent(options: SetupOptions = {}, config: FixtureConfig = {}) {
  const activeIndexRef = ref(-1);
  let typeahead!: ReturnType<typeof useTypeahead>;
  let node!: ReturnType<typeof useFloatingNode>;

  const openRef = ref(options.open ?? true);

  const Component = defineComponent(() => {
    const anchorEl = useTemplateRef<HTMLButtonElement>("anchor");
    const floatingEl = useTemplateRef<HTMLDivElement>("floating");
    const customEl = useTemplateRef<HTMLDivElement>("custom");

    node = useFloatingNode({
      anchorEl,
      floatingEl,
      open: openRef,
    });

    typeahead = useTypeahead(node, {
      items: options.items ?? DEFAULT_ITEMS,
      containerEl: config.withCustomContainer ? customEl : undefined,
      target: options.target,
      activeIndex: options.activeIndex ?? activeIndexRef,
      onMatch: options.onMatch
        ? (index) => {
            activeIndexRef.value = index;
            options.onMatch?.(index);
          }
        : undefined,
      enabled: options.enabled,
      resetMs: options.resetMs,
      ignoreKeys: options.ignoreKeys,
      findMatch: options.findMatch,
      isItemDisabled: options.isItemDisabled,
    });

    return () =>
      h("div", { class: "test-wrapper" }, [
        h("button", { ref: "anchor", "data-testid": "anchor" }, "Anchor"),
        h(
          "div",
          { ref: "floating", "data-testid": "floating", tabindex: -1 },
          config.withTypeableInput
            ? ["Floating content", h("input", { "data-testid": "typeable", type: "text" })]
            : "Floating content",
        ),
        config.withCustomContainer
          ? h("div", { ref: "custom", "data-testid": "custom", tabindex: -1 }, "Custom")
          : null,
      ]);
  });

  return {
    Component,
    getActiveIndex: () => activeIndexRef.value,
    getTypeahead: () => typeahead,
    getNode: () => node,
    openRef,
  };
}

async function renderTypeahead(options: SetupOptions = {}, config: FixtureConfig = {}) {
  const onMatchMock = vi.fn();
  const fixture = createTestComponent(
    {
      onMatch: options.onMatch ?? onMatchMock,
      ...options,
    },
    config,
  );
  await render(fixture.Component);
  return {
    anchorEl: getTestEl("anchor"),
    floatingEl: getTestEl("floating"),
    getActiveIndex: fixture.getActiveIndex,
    typeahead: fixture.getTypeahead(),
    node: fixture.getNode(),
    openRef: fixture.openRef,
  };
}

describe("Feature: useTypeahead", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe("Scenario: Incremental prefix matching and query buffering", () => {
    it("Given a list of items, When typing a single character, Then matches first prefix item and prevents default", async () => {
      // Given
      const { floatingEl, getActiveIndex } = await renderTypeahead();

      // When
      const event = dispatchKey(floatingEl, "b");

      // Then
      expect(getActiveIndex()).toBe(3);
      expect(event.defaultPrevented).toBe(true);
    });

    it("Given uppercase character input, When typed, Then matches case-insensitively", async () => {
      // Given
      const { floatingEl, getActiveIndex } = await renderTypeahead();

      // When
      dispatchKey(floatingEl, "C");

      // Then
      expect(getActiveIndex()).toBe(5);
    });

    it("Given multiple characters in rapid succession, When typed, Then matches progressive multi-character prefix", async () => {
      // Given
      const { floatingEl, getActiveIndex } = await renderTypeahead();
      vi.useFakeTimers();

      // When: Type 'b' then 'l'
      dispatchKey(floatingEl, "b");
      expect(getActiveIndex()).toBe(3);

      dispatchKey(floatingEl, "l");

      // Then: Matches "Blueberry" (index 4)
      expect(getActiveIndex()).toBe(4);
    });

    it("Given a multi-character query, When successive matching keys are typed, Then retains the earliest match instead of alternating", async () => {
      // Given
      const { floatingEl, getActiveIndex } = await renderTypeahead({
        items: ["Grape", "Grapefruit", "Guava"],
      });
      vi.useFakeTimers();

      // When & Then
      for (const [char, expected] of [
        ["g", 0],
        ["r", 0],
        ["a", 0],
        ["p", 0],
        ["e", 0],
        ["f", 1],
      ] as const) {
        dispatchKey(floatingEl, char);
        expect(getActiveIndex()).toBe(expected);
      }
    });

    it("Given a typed prefix query, When resetMs timeout expires, Then clears buffer for subsequent query", async () => {
      // Given
      const { floatingEl, getActiveIndex } = await renderTypeahead({ resetMs: 500 });
      vi.useFakeTimers();

      dispatchKey(floatingEl, "b");
      expect(getActiveIndex()).toBe(3);

      // When: Timer advances past resetMs
      vi.advanceTimersByTime(500);

      // When: New character typed
      dispatchKey(floatingEl, "c");

      // Then: New independent query matches "Cherry"
      expect(getActiveIndex()).toBe(5);
    });

    it("Given floating panel is closed, When typing on the panel, Then ignores input", async () => {
      // Given
      const { floatingEl, getActiveIndex } = await renderTypeahead({ open: false });

      // When
      dispatchKey(floatingEl, "b");

      // Then
      expect(getActiveIndex()).toBe(-1);
    });
  });

  describe("Scenario: Repeated character cycling across identical prefixes", () => {
    it("Given multiple items starting with the same letter, When that letter is pressed repeatedly, Then cycles and wraps around", async () => {
      // Given
      const { floatingEl, getActiveIndex } = await renderTypeahead();
      vi.useFakeTimers();

      // When & Then
      for (const expected of [0, 1, 2, 0]) {
        dispatchKey(floatingEl, "a");
        expect(getActiveIndex()).toBe(expected);
      }
    });

    it("Given an existing activeIndex, When single character cycling begins, Then starts searching after the active index", async () => {
      // Given
      const { floatingEl, getActiveIndex } = await renderTypeahead({
        items: ["Macadamia", "Mango", "Melon", "Mulberry"],
        activeIndex: ref(1),
      });

      // When
      dispatchKey(floatingEl, "m");

      // Then: Advances to "Melon" (index 2)
      expect(getActiveIndex()).toBe(2);
    });
  });

  describe("Scenario: Disabled item filtering", () => {
    it("Given disabled items in the list, When cycling through items, Then skips disabled entries", async () => {
      // Given
      const { floatingEl, getActiveIndex } = await renderTypeahead({
        items: ["Apple", "Apricot", "Avocado"],
        isItemDisabled: (idx) => idx === 1,
      });
      vi.useFakeTimers();

      // When
      dispatchKey(floatingEl, "a");
      expect(getActiveIndex()).toBe(0);

      dispatchKey(floatingEl, "a");
      // Then: Skips index 1 (Apricot) and lands on index 2 (Avocado)
      expect(getActiveIndex()).toBe(2);

      dispatchKey(floatingEl, "a");
      expect(getActiveIndex()).toBe(0);
    });

    it("Given a query that exclusively matches a disabled item, When typed, Then ignores match and preserves current index", async () => {
      // Given
      const { floatingEl, getActiveIndex } = await renderTypeahead({
        items: ["Apple", "Apricot", "Banana"],
        isItemDisabled: (idx) => idx === 1,
      });
      vi.useFakeTimers();

      dispatchKey(floatingEl, "a");
      dispatchKey(floatingEl, "p");
      expect(getActiveIndex()).toBe(0);

      vi.advanceTimersByTime(1000);

      // When typing "apr" (which matches disabled "Apricot")
      dispatchKey(floatingEl, "a");
      dispatchKey(floatingEl, "p");
      dispatchKey(floatingEl, "r");

      // Then: Disabled item is never selected
      expect(getActiveIndex()).toBe(0);
    });
  });

  describe("Scenario: Custom item lists and match predicates", () => {
    it("Given onMatch callback, When items match, Then forwards matched index to onMatch", async () => {
      // Given
      const onMatch = vi.fn();
      const { floatingEl } = await renderTypeahead({
        items: ["Dog", "Cat", "Duck", "Deer"],
        onMatch,
      });
      vi.useFakeTimers();

      // When
      dispatchKey(floatingEl, "d");
      expect(onMatch).toHaveBeenCalledWith(0);

      dispatchKey(floatingEl, "u");

      // Then
      expect(onMatch).toHaveBeenCalledWith(2);
    });

    it("Given a custom findMatch function, When query is typed, Then delegates matching to custom function", async () => {
      // Given
      const customFindMatch = vi.fn<TypeaheadFindMatchFn>((itemsList, query) =>
        itemsList.findIndex((item) => item?.toLowerCase().includes(query.toLowerCase())),
      );

      const { floatingEl, getActiveIndex } = await renderTypeahead({
        findMatch: customFindMatch,
      });
      vi.useFakeTimers();

      // When
      for (const char of "her") {
        dispatchKey(floatingEl, char);
      }

      // Then
      expect(customFindMatch).toHaveBeenCalled();
      expect(getActiveIndex()).toBe(5);
    });

    it("Given findMatch is null, When characters are typed, Then falls back to standard prefix search", async () => {
      // Given
      const { floatingEl, getActiveIndex } = await renderTypeahead({
        findMatch: null,
      });

      // When
      dispatchKey(floatingEl, "c");

      // Then
      expect(getActiveIndex()).toBe(5);
    });

    it("Given custom findMatch returns an out-of-range index, When evaluated, Then treats result as no match", async () => {
      // Given
      const onMatch = vi.fn();
      const { floatingEl, typeahead, getActiveIndex } = await renderTypeahead({
        findMatch: () => 99,
        onMatch,
      });
      vi.useFakeTimers();

      // When
      dispatchKey(floatingEl, "b");

      // Then
      expect(onMatch).not.toHaveBeenCalled();
      expect(getActiveIndex()).toBe(-1);
      expect(typeahead.searchQuery.value).toBe("b");

      vi.advanceTimersByTime(1000);
      expect(typeahead.searchQuery.value).toBe("");
    });

    it("Given null and empty string items in list, When typing query, Then safely skips empty labels", async () => {
      // Given
      const onMatch = vi.fn();
      const { floatingEl } = await renderTypeahead({
        items: [null, "", "Banana", null, "Blueberry"],
        onMatch,
      });

      // When
      dispatchKey(floatingEl, "b");

      // Then
      expect(onMatch).toHaveBeenCalledWith(2);
    });
  });

  describe("Scenario: Trigger-level typeahead when floating element is closed", () => {
    it("Given closed trigger, When typing on trigger, Then emits matches without opening floating element", async () => {
      // Given
      const onMatch = vi.fn();
      const { anchorEl, node, typeahead } = await renderTypeahead({
        onMatch,
        open: false,
      });

      // When
      dispatchKey(anchorEl, "b");

      // Then
      expect(onMatch).toHaveBeenCalledWith(3);
      expect(typeahead.searchQuery.value).toBe("b");
      expect(node.open.value).toBe(false);
    });

    it("Given closed trigger with empty buffer, When Space is pressed, Then preserves Space for activation without matching", async () => {
      // Given
      const onMatch = vi.fn();
      const { anchorEl, node } = await renderTypeahead({ onMatch, open: false });

      // When
      const event = dispatchKey(anchorEl, " ");

      // Then
      expect(event.defaultPrevented).toBe(false);
      expect(onMatch).not.toHaveBeenCalled();
      expect(node.open.value).toBe(false);
    });

    it("Given closed trigger, When multi-word query is typed, Then extends search buffer across space", async () => {
      // Given
      const { anchorEl, getActiveIndex } = await renderTypeahead({
        items: ["New York", "New Jersey", "London"],
        open: false,
      });
      vi.useFakeTimers();

      // When
      for (const char of "new") {
        dispatchKey(anchorEl, char);
      }
      expect(getActiveIndex()).toBe(0);

      const spaceEvent = dispatchKey(anchorEl, " ");
      expect(spaceEvent.defaultPrevented).toBe(true);

      dispatchKey(anchorEl, "j");

      // Then
      expect(getActiveIndex()).toBe(1);
    });

    it("Given closed trigger with active search buffer, When navigation keys are pressed, Then resets buffer without claiming event", async () => {
      // Given
      const { anchorEl, typeahead, getActiveIndex } = await renderTypeahead({ open: false });
      vi.useFakeTimers();

      dispatchKey(anchorEl, "b");
      expect(typeahead.searchQuery.value).toBe("b");

      // When: ArrowDown
      const arrowEvent = dispatchKey(anchorEl, "ArrowDown");
      expect(arrowEvent.defaultPrevented).toBe(false);
      expect(typeahead.searchQuery.value).toBe("");

      // When: Enter
      const enterEvent = dispatchKey(anchorEl, "Enter");
      expect(enterEvent.defaultPrevented).toBe(false);
      expect(getActiveIndex()).toBe(3);
    });
  });

  describe("Scenario: Container scoping and input element protection", () => {
    it("Given an explicit containerEl override, When typing occurs, Then searches within container and ignores panel", async () => {
      // Given
      const onMatch = vi.fn();
      const fixture = createTestComponent(
        { items: ["Apple", "Banana"], onMatch },
        { withCustomContainer: true },
      );
      await render(fixture.Component);

      // When: Typing on custom container
      dispatchKey(getTestEl("custom"), "b");
      expect(onMatch).toHaveBeenCalledWith(1);

      // When: Typing on floating element
      dispatchKey(getTestEl("floating"), "c");

      // Then: Floating element keystrokes are ignored
      expect(onMatch).toHaveBeenCalledTimes(1);
    });

    it("Given a focused native text input inside panel, When typing, Then preserves input keystrokes without hijacking", async () => {
      // Given
      const { getActiveIndex, typeahead } = await renderTypeahead({}, { withTypeableInput: true });
      const inputEl = getTestEl("typeable");

      // When
      const event = dispatchKey(inputEl, "b");

      // Then
      expect(event.defaultPrevented).toBe(false);
      expect(getActiveIndex()).toBe(-1);
      expect(typeahead.searchQuery.value).toBe("");
    });
  });

  describe("Scenario: Space key handling in multi-word queries", () => {
    it("Given an idle search buffer, When Space is pressed, Then ignores keypress to preserve element activation", async () => {
      // Given
      const { floatingEl, getActiveIndex } = await renderTypeahead();

      // When
      const event = dispatchKey(floatingEl, " ");

      // Then
      expect(event.defaultPrevented).toBe(false);
      expect(getActiveIndex()).toBe(-1);
    });

    it("Given an active multi-character query, When Space is pressed mid-query, Then appends space for multi-word labels", async () => {
      // Given
      const { floatingEl, getActiveIndex } = await renderTypeahead({
        items: ["New York", "New Jersey", "London"],
      });
      vi.useFakeTimers();

      // When
      dispatchKey(floatingEl, "n");
      dispatchKey(floatingEl, "e");
      dispatchKey(floatingEl, "w");
      expect(getActiveIndex()).toBe(0);

      const spaceEvent = dispatchKey(floatingEl, " ");
      expect(spaceEvent.defaultPrevented).toBe(true);

      dispatchKey(floatingEl, "j");

      // Then
      expect(getActiveIndex()).toBe(1);
    });

    it("Given space produces no match, When typed, Then retains buffer until timeout expires", async () => {
      // Given
      const { floatingEl, typeahead, getActiveIndex } = await renderTypeahead({
        items: ["Newark", "London"],
      });
      vi.useFakeTimers();

      dispatchKey(floatingEl, "n");
      dispatchKey(floatingEl, "e");
      dispatchKey(floatingEl, "w");
      expect(getActiveIndex()).toBe(0);

      // When
      dispatchKey(floatingEl, " ");
      expect(typeahead.searchQuery.value).toBe("new ");
      expect(getActiveIndex()).toBe(0);

      // When: Timeout expires
      vi.advanceTimersByTime(1000);

      // Then
      expect(typeahead.searchQuery.value).toBe("");
      expect(getActiveIndex()).toBe(0);
    });
  });

  describe("Scenario: Modifier key and sibling navigation key filtering", () => {
    it("Given keyboard modifier combinations (Ctrl, Alt, Meta), When pressed, Then ignores keystrokes", async () => {
      // Given
      const { floatingEl, getActiveIndex } = await renderTypeahead();

      // When
      dispatchKey(floatingEl, "b", { ctrlKey: true });
      dispatchKey(floatingEl, "b", { altKey: true });
      dispatchKey(floatingEl, "b", { metaKey: true });

      // Then
      expect(getActiveIndex()).toBe(-1);
    });

    it("Given keys configured in ignoreKeys, When pressed, Then skips ignored keys", async () => {
      // Given
      const { floatingEl, getActiveIndex } = await renderTypeahead({
        ignoreKeys: ["a", "b"],
      });

      // When
      dispatchKey(floatingEl, "a");
      dispatchKey(floatingEl, "b");
      expect(getActiveIndex()).toBe(-1);

      dispatchKey(floatingEl, "c");

      // Then
      expect(getActiveIndex()).toBe(5);
    });

    it("Given navigation and dismissal keys (ArrowDown, Enter, Escape), When pressed, Then preserves them for sibling composables", async () => {
      // Given
      const { floatingEl, getActiveIndex } = await renderTypeahead();

      // When
      dispatchKey(floatingEl, "ArrowDown");
      dispatchKey(floatingEl, "Enter");
      dispatchKey(floatingEl, "Escape");

      // Then
      expect(getActiveIndex()).toBe(-1);
    });

    it("Given an active typeahead query, When manual navigation occurs, Then abandons pending query buffer", async () => {
      // Given
      const navigatedIndex = ref(-1);
      const { floatingEl, typeahead } = await renderTypeahead({
        activeIndex: navigatedIndex,
        onMatch: (idx) => {
          navigatedIndex.value = idx;
        },
      });
      vi.useFakeTimers();

      dispatchKey(floatingEl, "b");
      expect(navigatedIndex.value).toBe(3);

      // When: ArrowDown manual navigation
      dispatchKey(floatingEl, "ArrowDown");
      navigatedIndex.value = 4;

      // Then: Query buffer abandoned
      expect(typeahead.searchQuery.value).toBe("");

      // When: New search begins
      dispatchKey(floatingEl, "a");
      expect(navigatedIndex.value).toBe(0);
    });
  });

  describe("Scenario: Search buffer state exposure and manual resets", () => {
    it("Given query keystrokes, When typed, Then exposes live buffer via searchQuery ref", async () => {
      // Given
      const { floatingEl, typeahead } = await renderTypeahead();
      vi.useFakeTimers();

      expect(typeahead.searchQuery.value).toBe("");

      // When
      dispatchKey(floatingEl, "b");
      expect(typeahead.searchQuery.value).toBe("b");

      dispatchKey(floatingEl, "l");
      expect(typeahead.searchQuery.value).toBe("bl");

      vi.advanceTimersByTime(1000);

      // Then
      expect(typeahead.searchQuery.value).toBe("");
    });

    it("Given a query mismatch, When character is typed, Then retains buffer until timeout without shifting focus", async () => {
      // Given
      const { floatingEl, typeahead, getActiveIndex } = await renderTypeahead({
        items: ["Apple", "Banana", "Blood Orange", "Dragonfruit"],
      });
      vi.useFakeTimers();

      dispatchKey(floatingEl, "b");
      dispatchKey(floatingEl, "l");
      dispatchKey(floatingEl, "o");
      expect(typeahead.searchQuery.value).toBe("blo");
      expect(getActiveIndex()).toBe(2);

      // When: Mismatch character typed
      dispatchKey(floatingEl, "d");
      expect(typeahead.searchQuery.value).toBe("blod");
      expect(getActiveIndex()).toBe(2);

      // Then: Timeout clears buffer
      vi.advanceTimersByTime(1000);
      expect(typeahead.searchQuery.value).toBe("");
      expect(getActiveIndex()).toBe(2);
    });

    it("Given an active search query, When Backspace is pressed, Then trims buffer and re-evaluates matches", async () => {
      // Given
      const { floatingEl, typeahead, getActiveIndex } = await renderTypeahead({
        items: ["Apple", "Apricot", "Banana", "Blueberry"],
      });
      vi.useFakeTimers();

      dispatchKey(floatingEl, "b");
      dispatchKey(floatingEl, "a");
      expect(typeahead.searchQuery.value).toBe("ba");
      expect(getActiveIndex()).toBe(2);

      // When: Backspace trims "ba" -> "b"
      dispatchKey(floatingEl, "Backspace");
      expect(typeahead.searchQuery.value).toBe("b");
      expect(getActiveIndex()).toBe(2);

      // When: Extend to "bl"
      dispatchKey(floatingEl, "l");
      expect(typeahead.searchQuery.value).toBe("bl");
      expect(getActiveIndex()).toBe(3);

      // When: Backspace all
      dispatchKey(floatingEl, "Backspace");
      expect(typeahead.searchQuery.value).toBe("b");
      dispatchKey(floatingEl, "Backspace");

      // Then
      expect(typeahead.searchQuery.value).toBe("");
    });

    it("Given an active search query, When reset() is called, Then clears buffer immediately", async () => {
      // Given
      const { floatingEl, typeahead, getActiveIndex } = await renderTypeahead();
      vi.useFakeTimers();

      dispatchKey(floatingEl, "a");
      expect(typeahead.searchQuery.value).toBe("a");

      // When
      typeahead.reset();

      // Then
      expect(typeahead.searchQuery.value).toBe("");

      dispatchKey(floatingEl, "b");
      expect(getActiveIndex()).toBe(3);
    });

    it("Given enabled changes to false, When typing occurs, Then halts search and preserves activeIndex", async () => {
      // Given
      const enabledRef = ref(true);
      const { floatingEl, getActiveIndex } = await renderTypeahead({ enabled: enabledRef });

      dispatchKey(floatingEl, "b");
      expect(getActiveIndex()).toBe(3);

      // When: Disabled dynamically
      enabledRef.value = false;
      await nextTick();

      dispatchKey(floatingEl, "c");

      // Then
      expect(getActiveIndex()).toBe(3);
    });
  });

  describe("Scenario: NavigationTarget protocol integration", () => {
    it("Given useRovingFocus target, When matching keys are typed, Then auto-wires activeIndex and shifts DOM focus", async () => {
      // Given
      let roving!: ReturnType<typeof useRovingFocus>;

      const Component = defineComponent(() => {
        const anchorEl = useTemplateRef<HTMLButtonElement>("anchor");
        const floatingEl = useTemplateRef<HTMLDivElement>("floating");
        const elementsList = ref<Array<HTMLElement | null>>([]);

        const node = useFloatingNode({ anchorEl, floatingEl, open: ref(true) });
        roving = useRovingFocus(node, { elementsList });
        useTypeahead(node, {
          target: roving,
          items: DEFAULT_ITEMS,
        });

        return () =>
          h("div", [
            h("button", { ref: "anchor", "data-testid": "anchor" }, "Anchor"),
            h(
              "div",
              { ref: "floating", "data-testid": "floating", tabindex: -1 },
              DEFAULT_ITEMS.map((item, idx) =>
                h(
                  "button",
                  {
                    ref: (el) => (elementsList.value[idx] = el as HTMLElement | null),
                    "data-testid": `item-${idx}`,
                    tabindex: roving.getTabindex(idx),
                  },
                  item,
                ),
              ),
            ),
          ]);
      });

      await render(Component);
      const floatingEl = getTestEl("floating");

      // When
      dispatchKey(floatingEl, "b");

      // Then
      expect(roving.activeIndex.value).toBe(3);
      await expect.element(page.getByTestId("item-3")).toHaveFocus();
    });

    it("Given useAriaActivedescendant target, When matching keys are typed, Then auto-wires activeIndex and updates aria-activedescendant", async () => {
      // Given
      let descendant!: ReturnType<typeof useAriaActivedescendant>;

      const Component = defineComponent(() => {
        const anchorEl = useTemplateRef<HTMLInputElement>("anchor");
        const floatingEl = useTemplateRef<HTMLDivElement>("floating");
        const elementsList = ref<Array<HTMLElement | null>>([]);

        const node = useFloatingNode({ anchorEl, floatingEl, open: ref(true) });
        descendant = useAriaActivedescendant(node, { elementsList });
        useTypeahead(node, {
          target: descendant,
          items: DEFAULT_ITEMS,
        });

        return () =>
          h("div", [
            h("input", { ref: "anchor", "data-testid": "anchor" }),
            h(
              "div",
              { ref: "floating", "data-testid": "floating", tabindex: -1 },
              DEFAULT_ITEMS.map((item, idx) =>
                h(
                  "div",
                  {
                    ref: (el) => (elementsList.value[idx] = el as HTMLElement | null),
                    id: descendant.getItemId(idx),
                    role: "option",
                    "data-testid": `item-${idx}`,
                  },
                  item,
                ),
              ),
            ),
          ]);
      });

      await render(Component);
      const floatingEl = getTestEl("floating");

      // When
      dispatchKey(floatingEl, "b");
      await nextTick();

      // Then
      expect(descendant.activeIndex.value).toBe(3);
      await expect
        .element(page.getByTestId("anchor"))
        .toHaveAttribute("aria-activedescendant", descendant.getItemId(3));
    });

    it("Given explicit onMatch with NavigationTarget, When matching keys are typed, Then overrides target.focusIndex", async () => {
      // Given
      let roving!: ReturnType<typeof useRovingFocus>;
      const customOnMatch = vi.fn();

      const Component = defineComponent(() => {
        const anchorEl = useTemplateRef<HTMLButtonElement>("anchor");
        const floatingEl = useTemplateRef<HTMLDivElement>("floating");
        const elementsList = ref<Array<HTMLElement | null>>([]);

        const node = useFloatingNode({ anchorEl, floatingEl, open: ref(true) });
        roving = useRovingFocus(node, { elementsList });
        useTypeahead(node, {
          target: roving,
          items: DEFAULT_ITEMS,
          onMatch: customOnMatch,
        });

        return () =>
          h("div", [
            h("button", { ref: "anchor", "data-testid": "anchor" }, "Anchor"),
            h("div", { ref: "floating", "data-testid": "floating", tabindex: -1 }),
          ]);
      });

      await render(Component);
      const floatingEl = getTestEl("floating");

      // When
      dispatchKey(floatingEl, "b");

      // Then
      expect(customOnMatch).toHaveBeenCalledWith(3);
      expect(roving.activeIndex.value).toBe(-1);
    });

    it("Given undefined ref values for items and options, When typing occurs, Then safely no-ops without throwing", async () => {
      // Given
      const itemsRef = ref<string[] | undefined>(undefined);
      const enabledRef = ref<boolean | undefined>(undefined);
      const resetMsRef = ref<number | undefined>(undefined);
      const { floatingEl, getActiveIndex } = await renderTypeahead({
        items: itemsRef as any,
        enabled: enabledRef as any,
        resetMs: resetMsRef as any,
      });

      // When & Then: Typing with ref(undefined) safely no-ops
      expect(() => dispatchKey(floatingEl, "a")).not.toThrow();
      expect(getActiveIndex()).toBe(-1);
    });
  });

  describe("Scenario: IME composition safety", () => {
    it("Given an active composition session, When typing, Then ignores keystrokes until composition ends", async () => {
      // Given
      const { floatingEl, typeahead, getActiveIndex } = await renderTypeahead({
        items: ["Apple", "Banana", "Cherry"],
      });

      // Start IME
      document.dispatchEvent(new CompositionEvent("compositionstart"));

      // When typing during IME
      dispatchKey(floatingEl, "a");
      expect(typeahead.searchQuery.value).toBe("");
      expect(getActiveIndex()).toBe(-1);

      // End IME
      document.dispatchEvent(new CompositionEvent("compositionend"));

      // When typing after IME
      dispatchKey(floatingEl, "a");

      // Then: Matches normally
      expect(typeahead.searchQuery.value).toBe("a");
      expect(getActiveIndex()).toBe(0);
    });

    it("Given a keydown event with isComposing true directly, When evaluated, Then ignores keystroke", async () => {
      // Given
      const { floatingEl, typeahead, getActiveIndex } = await renderTypeahead({
        items: ["Apple", "Banana", "Cherry"],
      });

      // When
      const event = new KeyboardEvent("keydown", { key: "b", bubbles: true, cancelable: true });
      Object.defineProperty(event, "isComposing", { value: true });
      floatingEl.dispatchEvent(event);

      // Then
      expect(typeahead.searchQuery.value).toBe("");
      expect(getActiveIndex()).toBe(-1);
    });
  });
});
