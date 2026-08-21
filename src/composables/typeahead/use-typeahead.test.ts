import { afterEach, describe, expect, it, vi } from "vitest";
import { effectScope, nextTick, ref } from "vue";
import { useCollection, useFloatingContext, useTypeahead } from "@/composables";

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

function dispatchKey(
  target: EventTarget,
  key: string,
  options: {
    ctrlKey?: boolean;
    metaKey?: boolean;
    altKey?: boolean;
    cancelable?: boolean;
  } = {},
) {
  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: options.cancelable ?? true,
    ctrlKey: options.ctrlKey ?? false,
    metaKey: options.metaKey ?? false,
    altKey: options.altKey ?? false,
  });
  target.dispatchEvent(event);
  return event;
}

describe("useTypeahead", () => {
  let scope: ReturnType<typeof effectScope> | undefined;

  afterEach(() => {
    scope?.stop();
    scope = undefined;
    clearTrackedElements();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  function setup(
    options: {
      values?: string[];
      list?: any;
      isValueDisabled?: (val: string) => boolean;
      activeIndex?: any;
      selectedIndex?: any;
      onMatch?: (idx: number, val: string) => void;
      onTypingChange?: (isTyping: boolean) => void;
      enabled?: any;
      resetMs?: any;
      ignoreKeys?: any;
      findMatch?: any;
      open?: boolean;
    } = {},
  ) {
    scope = effectScope();

    const anchorEl = trackElement(document.createElement("button"));
    const floatingEl = trackElement(document.createElement("div"));
    document.body.appendChild(anchorEl);
    document.body.appendChild(floatingEl);

    const openRef = ref(options.open ?? true);
    const anchorRef = ref(anchorEl);
    const floatingRef = ref(floatingEl);

    let resultContext: any;
    let collection: ReturnType<typeof useCollection> | undefined;

    scope.run(() => {
      const context = useFloatingContext({
        anchorEl: anchorRef,
        floatingEl: floatingRef,
        open: openRef,
      });

      if (!options.list) {
        collection = useCollection({
          values: options.values ?? [
            "Apple",
            "Apricot",
            "Avocado",
            "Banana",
            "Blueberry",
            "Cherry",
          ],
          isValueDisabled: options.isValueDisabled,
        });
      }

      const typeahead = useTypeahead(context, {
        collection,
        list: options.list,
        activeIndex: options.activeIndex,
        selectedIndex: options.selectedIndex,
        onMatch: options.onMatch,
        onTypingChange: options.onTypingChange,
        enabled: options.enabled,
        resetMs: options.resetMs,
        ignoreKeys: options.ignoreKeys,
        findMatch: options.findMatch,
        isValueDisabled: options.isValueDisabled,
      });

      resultContext = {
        context,
        typeahead,
        collection,
        anchorEl,
        floatingEl,
        openRef,
      };
    });

    return resultContext as {
      context: ReturnType<typeof useFloatingContext>;
      typeahead: ReturnType<typeof useTypeahead>;
      collection?: ReturnType<typeof useCollection>;
      anchorEl: HTMLButtonElement;
      floatingEl: HTMLDivElement;
      openRef: ReturnType<typeof ref<boolean>>;
    };
  }

  describe("Basic Single-Character and Prefix Matching", () => {
    it("matches single character and updates collection activeValue", () => {
      const { floatingEl, collection } = setup();

      dispatchKey(floatingEl, "b");
      expect(collection?.activeValue.value).toBe("Banana");
    });

    it("matches case-insensitively", () => {
      const { floatingEl, collection } = setup();

      dispatchKey(floatingEl, "C");
      expect(collection?.activeValue.value).toBe("Cherry");
    });

    it("matches multi-character query in rapid succession", () => {
      vi.useFakeTimers();
      const { floatingEl, collection } = setup();

      dispatchKey(floatingEl, "b");
      expect(collection?.activeValue.value).toBe("Banana");

      // Rapidly type 'l' within resetMs
      dispatchKey(floatingEl, "l");
      expect(collection?.activeValue.value).toBe("Blueberry");
    });

    it("does not alternate between overlapping prefix items when typing a multi-character query", () => {
      vi.useFakeTimers();
      const { floatingEl, collection } = setup({
        values: ["Grape", "Grapefruit", "Guava"],
      });

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

    it("resets buffer after resetMs timeout", () => {
      vi.useFakeTimers();
      const { floatingEl, collection } = setup({ resetMs: 500 });

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
    it("cycles through all items starting with the same character", () => {
      vi.useFakeTimers();
      const { floatingEl, collection } = setup();

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
    it("skips disabled items during single-character search and cycling", () => {
      vi.useFakeTimers();
      const { floatingEl, collection } = setup({
        values: ["Apple", "Apricot", "Avocado"],
        isValueDisabled: (val) => val === "Apricot",
      });

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

    it("does not match a multi-character query if the item is disabled", () => {
      vi.useFakeTimers();
      const { floatingEl, collection } = setup({
        values: ["Apple", "Apricot", "Banana"],
        isValueDisabled: (val) => val === "Apricot",
      });

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
    it("starts typeahead search after current active item position", () => {
      const { floatingEl, collection } = setup({
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
    it("works with direct list and onMatch callback", () => {
      let matchedIndex = -1;
      let matchedValue = "";

      const { floatingEl } = setup({
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

    it("supports custom findMatch function", () => {
      const customFindMatch = vi.fn(
        (orderedList: readonly (string | null)[], typedString: string) => {
          return orderedList.find((item) =>
            item?.toLowerCase().includes(typedString.toLowerCase()),
          );
        },
      );

      const { floatingEl, collection } = setup({
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
    it("ignores Space when buffer is empty to preserve normal activate/click", () => {
      const { floatingEl, collection } = setup();

      const event = dispatchKey(floatingEl, " ");
      expect(event.defaultPrevented).toBe(false);
      expect(collection?.activeValue.value).toBeNull();
    });

    it("captures Space when buffer is non-empty for multi-word queries", () => {
      vi.useFakeTimers();
      const { floatingEl, collection } = setup({
        values: ["New York", "New Jersey", "London"],
      });

      dispatchKey(floatingEl, "n");
      dispatchKey(floatingEl, "e");
      dispatchKey(floatingEl, "w");
      expect(collection?.activeValue.value).toBe("New York");

      const spaceEvent = dispatchKey(floatingEl, " ");
      expect(spaceEvent.defaultPrevented).toBe(true);

      dispatchKey(floatingEl, "j");
      expect(collection?.activeValue.value).toBe("New Jersey");
    });

    it("does not intercept typing when focused on a native typeable element", () => {
      const { floatingEl, collection } = setup();

      const input = trackElement(document.createElement("input"));
      input.type = "text";
      floatingEl.appendChild(input);

      const event = dispatchKey(input, "b");
      expect(event.defaultPrevented).toBe(false);
      expect(collection?.activeValue.value).toBeNull();
    });
  });

  describe("Key Filtering and Modifiers", () => {
    it("ignores modifier keys (ctrl, alt, meta)", () => {
      const { floatingEl, collection } = setup();

      dispatchKey(floatingEl, "b", { ctrlKey: true });
      dispatchKey(floatingEl, "b", { altKey: true });
      dispatchKey(floatingEl, "b", { metaKey: true });

      expect(collection?.activeValue.value).toBeNull();
    });

    it("ignores keys specified in ignoreKeys", () => {
      const { floatingEl, collection } = setup({
        ignoreKeys: ["a", "b"],
      });

      dispatchKey(floatingEl, "a");
      dispatchKey(floatingEl, "b");
      expect(collection?.activeValue.value).toBeNull();

      dispatchKey(floatingEl, "c");
      expect(collection?.activeValue.value).toBe("Cherry");
    });

    it("ignores non-character keys (e.g. Escape, Enter, ArrowDown)", () => {
      const { floatingEl, collection } = setup();

      dispatchKey(floatingEl, "ArrowDown");
      dispatchKey(floatingEl, "Enter");
      dispatchKey(floatingEl, "Escape");

      expect(collection?.activeValue.value).toBeNull();
    });
  });

  describe("isTyping Reactive State and onTypingChange", () => {
    it("updates isTyping and triggers onTypingChange during typing session", () => {
      vi.useFakeTimers();
      const typingStates: boolean[] = [];

      const { floatingEl, typeahead } = setup({
        onTypingChange: (isTyping) => {
          typingStates.push(isTyping);
        },
      });

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
      const { floatingEl, collection } = setup({ enabled: enabledRef });

      dispatchKey(floatingEl, "b");
      expect(collection?.activeValue.value).toBe("Banana");

      enabledRef.value = false;
      await nextTick();

      dispatchKey(floatingEl, "c");
      expect(collection?.activeValue.value).toBe("Banana");
    });

    it("resets buffer and cleans up when cleanup() is called", () => {
      vi.useFakeTimers();
      const { floatingEl, collection, typeahead } = setup();

      typeahead.cleanup();

      dispatchKey(floatingEl, "b");
      expect(collection?.activeValue.value).toBeNull();
    });

    it("handles key typing on the anchor element", () => {
      const { anchorEl, collection } = setup({ open: true });

      dispatchKey(anchorEl, "b");
      expect(collection?.activeValue.value).toBe("Banana");
    });

    it("handles virtual element anchors gracefully", () => {
      scope = effectScope();
      const contextEl = trackElement(document.createElement("button"));
      document.body.appendChild(contextEl);

      const floatingEl = trackElement(document.createElement("div"));
      document.body.appendChild(floatingEl);

      let collection: any;
      scope.run(() => {
        const virtualAnchor = {
          contextElement: contextEl,
          getBoundingClientRect: () => contextEl.getBoundingClientRect(),
        };
        const context = useFloatingContext({
          anchorEl: ref(virtualAnchor),
          floatingEl: ref(floatingEl),
          open: ref(true),
        });

        collection = useCollection({ values: ["Apple", "Banana"] });
        useTypeahead(context, { collection });
      });

      dispatchKey(contextEl, "b");
      expect(collection.activeValue.value).toBe("Banana");
    });

    it("skips null and empty strings in list gracefully", () => {
      let matched = -1;
      const { floatingEl } = setup({
        list: [null, "", "Banana", null, "Blueberry"],
        onMatch: (idx) => {
          matched = idx;
        },
      });

      dispatchKey(floatingEl, "b");
      expect(matched).toBe(2);
    });

    it("allows manual reset via reset() method", () => {
      vi.useFakeTimers();
      const { floatingEl, typeahead, collection } = setup();

      dispatchKey(floatingEl, "a");
      expect(typeahead.isTyping.value).toBe(true);

      typeahead.reset();
      expect(typeahead.isTyping.value).toBe(false);

      dispatchKey(floatingEl, "b");
      expect(collection?.activeValue.value).toBe("Banana");
    });
  });
});
