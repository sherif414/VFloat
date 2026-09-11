import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-vue";
import {
  defineComponent,
  h,
  nextTick,
  onMounted,
  ref,
  useTemplateRef,
  type MaybeRefOrGetter,
} from "vue";
import {
  useFloatingNode,
  useTypeahead,
  type TypeaheadFindMatchFn,
} from "@/composables";
import { dispatchKey, getTestEl } from "@/test-utils";

interface FixtureConfig {
  withTypeableInput?: boolean;
}

interface SetupOptions {
  values?: string[];
  list?: readonly (string | null)[];
  isValueDisabled?: (value: string) => boolean;
  activeIndex?: MaybeRefOrGetter<number | null>;
  selectedIndex?: MaybeRefOrGetter<number | null>;
  onMatch?: (index: number, value: string) => void;
  onTypingChange?: (isTyping: boolean) => void;
  enabled?: MaybeRefOrGetter<boolean>;
  resetMs?: MaybeRefOrGetter<number>;
  ignoreKeys?: MaybeRefOrGetter<readonly string[]>;
  findMatch?: TypeaheadFindMatchFn | null;
  open?: boolean;
}

const DEFAULT_VALUES = ["Apple", "Apricot", "Avocado", "Banana", "Blueberry", "Cherry"];

function createTestComponent(options: SetupOptions = {}, config: FixtureConfig = {}) {
  const activeValue = ref<string | null>(null);
  const activeIndex = ref<number | null>(null);
  let typeahead!: ReturnType<typeof useTypeahead>;
  let node!: ReturnType<typeof useFloatingNode>;

  const openRef = ref(options.open ?? true);

  const Component = defineComponent(() => {
    const anchorEl = useTemplateRef<HTMLButtonElement>("anchor");
    const floatingEl = useTemplateRef<HTMLDivElement>("floating");

    node = useFloatingNode({
      anchorEl,
      floatingEl,
      open: openRef,
    });

    const list = options.list ?? options.values ?? DEFAULT_VALUES;

    typeahead = useTypeahead(node, {
      list,
      activeIndex: options.activeIndex ?? activeIndex,
      selectedIndex: options.selectedIndex,
      onMatch: (index, val) => {
        activeIndex.value = index;
        activeValue.value = val;
        options.onMatch?.(index, val);
      },
      onTypingChange: options.onTypingChange,
      enabled: options.enabled,
      resetMs: options.resetMs,
      ignoreKeys: options.ignoreKeys,
      findMatch: options.findMatch,
      isValueDisabled: options.isValueDisabled,
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
      ]);
  });

  const collectionState = {
    activeValue,
    setActiveValue: (val: string | null) => {
      activeValue.value = val;
      const list = options.list ?? options.values ?? DEFAULT_VALUES;
      const idx = val ? list.indexOf(val) : -1;
      activeIndex.value = idx !== -1 ? idx : null;
    },
  };

  return {
    Component,
    getCollection: () => collectionState,
    getTypeahead: () => typeahead,
    getNode: () => node,
    openRef,
  };
}

async function renderTypeahead(options: SetupOptions = {}, config: FixtureConfig = {}) {
  const fixture = createTestComponent(options, config);
  await render(fixture.Component);
  return {
    anchorEl: getTestEl("anchor"),
    floatingEl: getTestEl("floating"),
    collection: fixture.getCollection(),
    typeahead: fixture.getTypeahead(),
    node: fixture.getNode(),
    openRef: fixture.openRef,
  };
}

describe("useTypeahead", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe("Basic Single-Character and Prefix Matching", () => {
    it("matches single character and updates collection activeValue", async () => {
      const { floatingEl, collection } = await renderTypeahead();

      dispatchKey(floatingEl, "b");
      expect(collection?.activeValue.value).toBe("Banana");
    });

    it("matches case-insensitively", async () => {
      const { floatingEl, collection } = await renderTypeahead();

      dispatchKey(floatingEl, "C");
      expect(collection?.activeValue.value).toBe("Cherry");
    });

    it("matches multi-character query in rapid succession", async () => {
      const { floatingEl, collection } = await renderTypeahead();
      vi.useFakeTimers();

      dispatchKey(floatingEl, "b");
      expect(collection?.activeValue.value).toBe("Banana");

      // Rapidly type 'l' within resetMs
      dispatchKey(floatingEl, "l");
      expect(collection?.activeValue.value).toBe("Blueberry");
    });

    it("does not alternate between overlapping prefix items when typing a multi-character query", async () => {
      const { floatingEl, collection } = await renderTypeahead({
        values: ["Grape", "Grapefruit", "Guava"],
      });
      vi.useFakeTimers();

      // Type 'g'
      dispatchKey(floatingEl, "g");
      expect(collection?.activeValue.value).toBe("Grape");

      // Type 'r' -> 'gr'
      dispatchKey(floatingEl, "r");
      expect(collection?.activeValue.value).toBe("Grape");

      // Type 'a' -> 'gra'
      dispatchKey(floatingEl, "a");
      expect(collection?.activeValue.value).toBe("Grape");

      // Type 'p' -> 'grap'
      dispatchKey(floatingEl, "p");
      expect(collection?.activeValue.value).toBe("Grape");

      // Type 'e' -> 'grape'
      dispatchKey(floatingEl, "e");
      expect(collection?.activeValue.value).toBe("Grape");

      // Now type 'f' -> 'grapef' -> should transition to Grapefruit
      dispatchKey(floatingEl, "f");
      expect(collection?.activeValue.value).toBe("Grapefruit");
    });

    it("resets buffer after resetMs timeout", async () => {
      const { floatingEl, collection } = await renderTypeahead({ resetMs: 500 });
      vi.useFakeTimers();

      dispatchKey(floatingEl, "b");
      expect(collection?.activeValue.value).toBe("Banana");

      // Advance past reset timeout
      vi.advanceTimersByTime(500);

      // Next keystroke should start a fresh query
      dispatchKey(floatingEl, "c");
      expect(collection?.activeValue.value).toBe("Cherry");
    });
  });

  describe("Repeated Character Cycling", () => {
    it("cycles through all items starting with the same character", async () => {
      const { floatingEl, collection } = await renderTypeahead();
      vi.useFakeTimers();

      // First 'a' -> Apple
      dispatchKey(floatingEl, "a");
      expect(collection?.activeValue.value).toBe("Apple");

      // Second 'a' -> Apricot
      dispatchKey(floatingEl, "a");
      expect(collection?.activeValue.value).toBe("Apricot");

      // Third 'a' -> Avocado
      dispatchKey(floatingEl, "a");
      expect(collection?.activeValue.value).toBe("Avocado");

      // Fourth 'a' -> wraps around back to Apple
      dispatchKey(floatingEl, "a");
      expect(collection?.activeValue.value).toBe("Apple");
    });
  });

  describe("Collection Integration & Disabled Items (Issue #30)", () => {
    it("skips disabled items during single-character search and cycling", async () => {
      const { floatingEl, collection } = await renderTypeahead({
        values: ["Apple", "Apricot", "Avocado"],
        isValueDisabled: (val) => val === "Apricot",
      });
      vi.useFakeTimers();

      // First 'a' -> Apple
      dispatchKey(floatingEl, "a");
      expect(collection?.activeValue.value).toBe("Apple");

      // Second 'a' -> skips disabled Apricot and jumps to Avocado
      dispatchKey(floatingEl, "a");
      expect(collection?.activeValue.value).toBe("Avocado");

      // Third 'a' -> wraps back to Apple
      dispatchKey(floatingEl, "a");
      expect(collection?.activeValue.value).toBe("Apple");
    });

    it("does not match a multi-character query if the item is disabled", async () => {
      const { floatingEl, collection } = await renderTypeahead({
        values: ["Apple", "Apricot", "Banana"],
        isValueDisabled: (val) => val === "Apricot",
      });
      vi.useFakeTimers();

      dispatchKey(floatingEl, "a");
      expect(collection?.activeValue.value).toBe("Apple");

      // Typing "p" -> "ap" matches "Apple" (first enabled starting with "ap")
      dispatchKey(floatingEl, "p");
      expect(collection?.activeValue.value).toBe("Apple");

      // Advance timers and type "apr" which uniquely starts "Apricot"
      vi.advanceTimersByTime(750);
      dispatchKey(floatingEl, "a");
      dispatchKey(floatingEl, "p");
      dispatchKey(floatingEl, "r");

      // Since Apricot is disabled, search fails and activeValue does not jump to Apricot
      expect(collection?.activeValue.value).toBe("Apple");
    });
  });

  describe("Arrow Key Navigation Synchronization", () => {
    it("starts typeahead search after current active item position", async () => {
      const { floatingEl, collection } = await renderTypeahead({
        values: ["Macadamia", "Mango", "Melon", "Mulberry"],
      });

      // Simulate arrow key navigation to "Mango"
      collection?.setActiveValue("Mango");

      // Type 'm' -> should search after "Mango" and select "Melon"
      dispatchKey(floatingEl, "m");
      expect(collection?.activeValue.value).toBe("Melon");
    });
  });

  describe("Custom List, onMatch, and Options", () => {
    it("works with direct list and onMatch callback", async () => {
      let matchedIndex = -1;
      let matchedValue = "";

      const { floatingEl } = await renderTypeahead({
        list: ["Dog", "Cat", "Duck", "Deer"],
        onMatch: (idx, val) => {
          matchedIndex = idx;
          matchedValue = val;
        },
      });

      dispatchKey(floatingEl, "d");
      expect(matchedIndex).toBe(0);
      expect(matchedValue).toBe("Dog");

      dispatchKey(floatingEl, "u");
      expect(matchedIndex).toBe(2);
      expect(matchedValue).toBe("Duck");
    });

    it("supports custom findMatch function", async () => {
      const customFindMatch = vi.fn<TypeaheadFindMatchFn>((orderedList, typedString) =>
        orderedList.find((item) => item?.toLowerCase().includes(typedString.toLowerCase())),
      );

      const { floatingEl, collection } = await renderTypeahead({
        findMatch: customFindMatch,
      });

      // Type 'h', 'e', 'r' (substring unique to 'Cherry')
      for (const char of "her") {
        dispatchKey(floatingEl, char);
      }

      expect(customFindMatch).toHaveBeenCalled();
      expect(collection?.activeValue.value).toBe("Cherry");
    });
  });

  describe("Space Key and Target Heuristics (Issue #29)", () => {
    it("ignores Space when buffer is empty to preserve normal activate/click", async () => {
      const { floatingEl, collection } = await renderTypeahead();

      const event = dispatchKey(floatingEl, " ");
      expect(event.defaultPrevented).toBe(false);
      expect(collection?.activeValue.value).toBeNull();
    });

    it("captures Space when buffer is non-empty for multi-word queries", async () => {
      const { floatingEl, collection } = await renderTypeahead({
        values: ["New York", "New Jersey", "London"],
      });
      vi.useFakeTimers();

      dispatchKey(floatingEl, "n");
      dispatchKey(floatingEl, "e");
      dispatchKey(floatingEl, "w");
      expect(collection?.activeValue.value).toBe("New York");

      const spaceEvent = dispatchKey(floatingEl, " ");
      expect(spaceEvent.defaultPrevented).toBe(true);

      dispatchKey(floatingEl, "j");
      expect(collection?.activeValue.value).toBe("New Jersey");
    });

    it("does not intercept typing when focused on a native typeable element", async () => {
      const { collection } = await renderTypeahead({}, { withTypeableInput: true });
      const inputEl = getTestEl("typeable");

      const event = dispatchKey(inputEl, "b");
      expect(event.defaultPrevented).toBe(false);
      expect(collection?.activeValue.value).toBeNull();
    });
  });

  describe("Key Filtering and Modifiers", () => {
    it("ignores modifier keys (ctrl, alt, meta)", async () => {
      const { floatingEl, collection } = await renderTypeahead();

      dispatchKey(floatingEl, "b", { ctrlKey: true });
      dispatchKey(floatingEl, "b", { altKey: true });
      dispatchKey(floatingEl, "b", { metaKey: true });

      expect(collection?.activeValue.value).toBeNull();
    });

    it("ignores keys specified in ignoreKeys", async () => {
      const { floatingEl, collection } = await renderTypeahead({
        ignoreKeys: ["a", "b"],
      });

      dispatchKey(floatingEl, "a");
      dispatchKey(floatingEl, "b");
      expect(collection?.activeValue.value).toBeNull();

      dispatchKey(floatingEl, "c");
      expect(collection?.activeValue.value).toBe("Cherry");
    });

    it("ignores non-character keys (e.g. Escape, Enter, ArrowDown)", async () => {
      const { floatingEl, collection } = await renderTypeahead();

      dispatchKey(floatingEl, "ArrowDown");
      dispatchKey(floatingEl, "Enter");
      dispatchKey(floatingEl, "Escape");

      expect(collection?.activeValue.value).toBeNull();
    });
  });

  describe("isTyping Reactive State and onTypingChange", () => {
    it("updates isTyping and triggers onTypingChange during typing session", async () => {
      const typingStates: boolean[] = [];

      const { floatingEl, typeahead } = await renderTypeahead({
        onTypingChange: (isTyping) => {
          typingStates.push(isTyping);
        },
      });
      vi.useFakeTimers();

      expect(typeahead.isTyping.value).toBe(false);

      dispatchKey(floatingEl, "a");
      expect(typeahead.isTyping.value).toBe(true);
      expect(typingStates).toContain(true);

      vi.advanceTimersByTime(750);
      expect(typeahead.isTyping.value).toBe(false);
      expect(typingStates[typingStates.length - 1]).toBe(false);
    });
  });

  describe("Lifecycle & Dynamic Option Updates", () => {
    it("stops handling keys when enabled option changes to false", async () => {
      const enabledRef = ref(true);
      const { floatingEl, collection } = await renderTypeahead({ enabled: enabledRef });

      dispatchKey(floatingEl, "b");
      expect(collection?.activeValue.value).toBe("Banana");

      enabledRef.value = false;
      await nextTick();

      dispatchKey(floatingEl, "c");
      expect(collection?.activeValue.value).toBe("Banana");
    });

    it("resets buffer and cleans up when cleanup() is called", async () => {
      const { floatingEl, collection, typeahead } = await renderTypeahead();
      vi.useFakeTimers();

      typeahead.cleanup();

      dispatchKey(floatingEl, "b");
      expect(collection?.activeValue.value).toBeNull();
    });

    it("handles key typing on the anchor element", async () => {
      const { anchorEl, collection } = await renderTypeahead({ open: true });

      dispatchKey(anchorEl, "b");
      expect(collection?.activeValue.value).toBe("Banana");
    });

    it("handles virtual element anchors gracefully", async () => {
      const activeValue = ref<string | null>(null);
      const Component = defineComponent(() => {
        const contextEl = useTemplateRef<HTMLButtonElement>("context");
        const floatingEl = useTemplateRef<HTMLDivElement>("floating");
        const anchorRef = ref({
          contextElement: null as unknown as Element,
          getBoundingClientRect: () => contextEl.value?.getBoundingClientRect() ?? new DOMRect(),
        });

        const node = useFloatingNode({
          anchorEl: anchorRef,
          floatingEl,
          open: ref(true),
        });

        useTypeahead(node, {
          list: ["Apple", "Banana"],
          onMatch: (_idx, val) => {
            activeValue.value = val;
          },
        });

        // Publish the rendered button as the virtual anchor's context element.
        // Assigned through the ref so the anchor computed re-resolves and the
        // keydown listener re-binds to the button.
        onMounted(() => {
          anchorRef.value = { ...anchorRef.value, contextElement: contextEl.value! };
        });

        return () =>
          h("div", { class: "test-wrapper" }, [
            h("button", { ref: "context", "data-testid": "context" }, "Context"),
            h("div", { ref: "floating", "data-testid": "floating", tabindex: -1 }, "Floating"),
          ]);
      });

      await render(Component);
      await nextTick();

      dispatchKey(getTestEl("context"), "b");
      expect(activeValue.value).toBe("Banana");
    });

    it("skips null and empty strings in list gracefully", async () => {
      let matched = -1;
      const { floatingEl } = await renderTypeahead({
        list: [null, "", "Banana", null, "Blueberry"],
        onMatch: (idx) => {
          matched = idx;
        },
      });

      dispatchKey(floatingEl, "b");
      expect(matched).toBe(2);
    });

    it("allows manual reset via reset() method", async () => {
      const { floatingEl, typeahead, collection } = await renderTypeahead();
      vi.useFakeTimers();

      dispatchKey(floatingEl, "a");
      expect(typeahead.isTyping.value).toBe(true);

      typeahead.reset();
      expect(typeahead.isTyping.value).toBe(false);

      dispatchKey(floatingEl, "b");
      expect(collection?.activeValue.value).toBe("Banana");
    });
  });
});
