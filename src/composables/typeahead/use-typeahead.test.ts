import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-vue";
import { defineComponent, h, nextTick, ref, useTemplateRef, type MaybeRefOrGetter } from "vue";
import { useFloatingNode, useTypeahead, type TypeaheadFindMatchFn } from "@/composables";
import { dispatchKey, getTestEl } from "@/test-utils";

interface FixtureConfig {
  withTypeableInput?: boolean;
  withCustomContainer?: boolean;
}

interface SetupOptions {
  items?: readonly (string | null)[];
  activeIndex?: MaybeRefOrGetter<number>;
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
      activeIndex: options.activeIndex ?? activeIndexRef,
      onMatch: (index) => {
        activeIndexRef.value = index;
        options.onMatch?.(index);
      },
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
  const fixture = createTestComponent(options, config);
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

describe("useTypeahead", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe("prefix matching", () => {
    it("matches a single character", async () => {
      const { floatingEl, getActiveIndex } = await renderTypeahead();

      const event = dispatchKey(floatingEl, "b");
      expect(getActiveIndex()).toBe(3);
      expect(event.defaultPrevented).toBe(true);
    });

    it("matches case-insensitively", async () => {
      const { floatingEl, getActiveIndex } = await renderTypeahead();

      dispatchKey(floatingEl, "C");
      expect(getActiveIndex()).toBe(5);
    });

    it("matches a multi-character query typed in rapid succession", async () => {
      const { floatingEl, getActiveIndex } = await renderTypeahead();
      vi.useFakeTimers();

      dispatchKey(floatingEl, "b");
      expect(getActiveIndex()).toBe(3);

      dispatchKey(floatingEl, "l");
      expect(getActiveIndex()).toBe(4);
    });

    it("keeps a multi-character query on the earliest match instead of alternating", async () => {
      const { floatingEl, getActiveIndex } = await renderTypeahead({
        items: ["Grape", "Grapefruit", "Guava"],
      });
      vi.useFakeTimers();

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

    it("clears the buffer after the resetMs timeout", async () => {
      const { floatingEl, getActiveIndex } = await renderTypeahead({ resetMs: 500 });
      vi.useFakeTimers();

      dispatchKey(floatingEl, "b");
      expect(getActiveIndex()).toBe(3);

      vi.advanceTimersByTime(500);

      dispatchKey(floatingEl, "c");
      expect(getActiveIndex()).toBe(5);
    });

    it("ignores typing while closed", async () => {
      const { floatingEl, getActiveIndex } = await renderTypeahead({ open: false });

      dispatchKey(floatingEl, "b");
      expect(getActiveIndex()).toBe(-1);
    });
  });

  describe("repeated character cycling", () => {
    it("cycles through same-letter items and wraps around", async () => {
      const { floatingEl, getActiveIndex } = await renderTypeahead();
      vi.useFakeTimers();

      for (const expected of [0, 1, 2, 0]) {
        dispatchKey(floatingEl, "a");
        expect(getActiveIndex()).toBe(expected);
      }
    });

    it("starts cycling after the caller's active index", async () => {
      const { floatingEl, getActiveIndex } = await renderTypeahead({
        items: ["Macadamia", "Mango", "Melon", "Mulberry"],
        activeIndex: ref(1),
      });

      dispatchKey(floatingEl, "m");
      expect(getActiveIndex()).toBe(2);
    });
  });

  describe("disabled items", () => {
    it("skips disabled items while cycling", async () => {
      const { floatingEl, getActiveIndex } = await renderTypeahead({
        items: ["Apple", "Apricot", "Avocado"],
        isItemDisabled: (idx) => idx === 1,
      });
      vi.useFakeTimers();

      dispatchKey(floatingEl, "a");
      expect(getActiveIndex()).toBe(0);

      dispatchKey(floatingEl, "a");
      expect(getActiveIndex()).toBe(2);

      dispatchKey(floatingEl, "a");
      expect(getActiveIndex()).toBe(0);
    });

    it("never matches a query that only fits a disabled item", async () => {
      const { floatingEl, getActiveIndex } = await renderTypeahead({
        items: ["Apple", "Apricot", "Banana"],
        isItemDisabled: (idx) => idx === 1,
      });
      vi.useFakeTimers();

      dispatchKey(floatingEl, "a");
      dispatchKey(floatingEl, "p");
      expect(getActiveIndex()).toBe(0);

      vi.advanceTimersByTime(750);
      dispatchKey(floatingEl, "a");
      dispatchKey(floatingEl, "p");
      dispatchKey(floatingEl, "r");

      expect(getActiveIndex()).toBe(0);
    });
  });

  describe("custom items and matchers", () => {
    it("forwards the matched index through onMatch", async () => {
      const onMatch = vi.fn();

      const { floatingEl } = await renderTypeahead({
        items: ["Dog", "Cat", "Duck", "Deer"],
        onMatch,
      });
      vi.useFakeTimers();

      dispatchKey(floatingEl, "d");
      expect(onMatch).toHaveBeenCalledWith(0);

      dispatchKey(floatingEl, "u");
      expect(onMatch).toHaveBeenCalledWith(2);
    });

    it("supports a custom findMatch function", async () => {
      const customFindMatch = vi.fn<TypeaheadFindMatchFn>((itemsList, query) =>
        itemsList.findIndex((item) => item?.toLowerCase().includes(query.toLowerCase())),
      );

      const { floatingEl, getActiveIndex } = await renderTypeahead({
        findMatch: customFindMatch,
      });
      vi.useFakeTimers();

      for (const char of "her") {
        dispatchKey(floatingEl, char);
      }

      expect(customFindMatch).toHaveBeenCalled();
      expect(getActiveIndex()).toBe(5);
    });

    it("falls back to prefix search when findMatch is null", async () => {
      const { floatingEl, getActiveIndex } = await renderTypeahead({
        findMatch: null,
      });

      dispatchKey(floatingEl, "c");
      expect(getActiveIndex()).toBe(5);
    });

    it("treats out-of-range custom matches as no match", async () => {
      const onMatch = vi.fn();

      const { floatingEl, typeahead, getActiveIndex } = await renderTypeahead({
        findMatch: () => 99,
        onMatch,
      });

      dispatchKey(floatingEl, "b");
      expect(onMatch).not.toHaveBeenCalled();
      expect(getActiveIndex()).toBe(-1);
      expect(typeahead.searchQuery.value).toBe("");
    });

    it("skips null and empty labels", async () => {
      const onMatch = vi.fn();

      const { floatingEl } = await renderTypeahead({
        items: [null, "", "Banana", null, "Blueberry"],
        onMatch,
      });

      dispatchKey(floatingEl, "b");
      expect(onMatch).toHaveBeenCalledWith(2);
    });
  });

  describe("APG keyboard scope", () => {
    it("ignores typing on the anchor element since typeahead belongs to the list container", async () => {
      const { anchorEl, getActiveIndex } = await renderTypeahead();

      dispatchKey(anchorEl, "b");
      expect(getActiveIndex()).toBe(-1);
    });

    it("searches within an explicit containerEl override instead of the panel", async () => {
      const onMatch = vi.fn();

      const fixture = createTestComponent(
        { items: ["Apple", "Banana"], onMatch },
        { withCustomContainer: true },
      );
      await render(fixture.Component);

      dispatchKey(getTestEl("custom"), "b");
      expect(onMatch).toHaveBeenCalledWith(1);

      dispatchKey(getTestEl("floating"), "c");
      expect(onMatch).toHaveBeenCalledTimes(1);
    });

    it("does not steal keystrokes from native typing controls", async () => {
      const { getActiveIndex, typeahead } = await renderTypeahead({}, { withTypeableInput: true });
      const inputEl = getTestEl("typeable");

      const event = dispatchKey(inputEl, "b");
      expect(event.defaultPrevented).toBe(false);
      expect(getActiveIndex()).toBe(-1);
      expect(typeahead.searchQuery.value).toBe("");
    });
  });

  describe("space handling", () => {
    it("ignores space on an idle buffer to preserve activation", async () => {
      const { floatingEl, getActiveIndex } = await renderTypeahead();

      const event = dispatchKey(floatingEl, " ");
      expect(event.defaultPrevented).toBe(false);
      expect(getActiveIndex()).toBe(-1);
    });

    it("appends space mid-query for multi-word labels", async () => {
      const { floatingEl, getActiveIndex } = await renderTypeahead({
        items: ["New York", "New Jersey", "London"],
      });
      vi.useFakeTimers();

      dispatchKey(floatingEl, "n");
      dispatchKey(floatingEl, "e");
      dispatchKey(floatingEl, "w");
      expect(getActiveIndex()).toBe(0);

      const spaceEvent = dispatchKey(floatingEl, " ");
      expect(spaceEvent.defaultPrevented).toBe(true);

      dispatchKey(floatingEl, "j");
      expect(getActiveIndex()).toBe(1);
    });

    it("flushes the buffer when space itself matches nothing", async () => {
      // A trailing-space dead query can never match an extension under
      // prefix search, so it flushes immediately instead of lingering.
      const { floatingEl, typeahead, getActiveIndex } = await renderTypeahead({
        items: ["Newark", "London"],
      });
      vi.useFakeTimers();

      dispatchKey(floatingEl, "n");
      dispatchKey(floatingEl, "e");
      dispatchKey(floatingEl, "w");
      expect(getActiveIndex()).toBe(0);

      dispatchKey(floatingEl, " ");
      expect(typeahead.searchQuery.value).toBe("");
      expect(getActiveIndex()).toBe(0);
    });
  });

  describe("key filtering", () => {
    it("ignores modifier combinations", async () => {
      const { floatingEl, getActiveIndex } = await renderTypeahead();

      dispatchKey(floatingEl, "b", { ctrlKey: true });
      dispatchKey(floatingEl, "b", { altKey: true });
      dispatchKey(floatingEl, "b", { metaKey: true });

      expect(getActiveIndex()).toBe(-1);
    });

    it("ignores keys listed in ignoreKeys", async () => {
      const { floatingEl, getActiveIndex } = await renderTypeahead({
        ignoreKeys: ["a", "b"],
      });

      dispatchKey(floatingEl, "a");
      dispatchKey(floatingEl, "b");
      expect(getActiveIndex()).toBe(-1);

      dispatchKey(floatingEl, "c");
      expect(getActiveIndex()).toBe(5);
    });

    it("ignores navigation and dismissal keys owned by siblings", async () => {
      const { floatingEl, getActiveIndex } = await renderTypeahead();

      dispatchKey(floatingEl, "ArrowDown");
      dispatchKey(floatingEl, "Enter");
      dispatchKey(floatingEl, "Escape");

      expect(getActiveIndex()).toBe(-1);
    });

    it("abandons the pending query when manual navigation takes over", async () => {
      // Without this, typing "b", arrowing to the next item, then typing "a"
      // would extend the stale buffer to "ba" and jump back instead of
      // starting a fresh search from the manually focused item.
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

      dispatchKey(floatingEl, "ArrowDown");
      navigatedIndex.value = 4;
      expect(typeahead.searchQuery.value).toBe("");

      dispatchKey(floatingEl, "a");
      expect(navigatedIndex.value).toBe(0);
    });
  });

  describe("search buffer state", () => {
    it("exposes the live buffer through searchQuery", async () => {
      const { floatingEl, typeahead } = await renderTypeahead();
      vi.useFakeTimers();

      expect(typeahead.searchQuery.value).toBe("");

      dispatchKey(floatingEl, "b");
      expect(typeahead.searchQuery.value).toBe("b");

      dispatchKey(floatingEl, "l");
      expect(typeahead.searchQuery.value).toBe("bl");

      vi.advanceTimersByTime(750);
      expect(typeahead.searchQuery.value).toBe("");
    });

    it("clears the buffer through reset()", async () => {
      const { floatingEl, typeahead, getActiveIndex } = await renderTypeahead();
      vi.useFakeTimers();

      dispatchKey(floatingEl, "a");
      expect(typeahead.searchQuery.value).toBe("a");

      typeahead.reset();
      expect(typeahead.searchQuery.value).toBe("");

      dispatchKey(floatingEl, "b");
      expect(getActiveIndex()).toBe(3);
    });

    it("stops searching when enabled becomes false", async () => {
      const enabledRef = ref(true);
      const { floatingEl, getActiveIndex } = await renderTypeahead({ enabled: enabledRef });

      dispatchKey(floatingEl, "b");
      expect(getActiveIndex()).toBe(3);

      enabledRef.value = false;
      await nextTick();

      dispatchKey(floatingEl, "c");
      expect(getActiveIndex()).toBe(3);
    });
  });
});
