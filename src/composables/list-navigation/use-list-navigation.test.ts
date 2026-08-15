import { afterEach, describe, expect, it } from "vitest";
import { effectScope, nextTick, ref } from "vue";
import { useFloatingContext } from "@/composables";
import { useCollection } from "@/composables/collection/use-collection";
import { useListNavigation } from "@/composables/list-navigation/use-list-navigation";

function dispatchKey(target: EventTarget, key: string) {
  target.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
}

describe("useListNavigation", () => {
  let scope: ReturnType<typeof effectScope>;
  const elementsToCleanUp: any[] = [];

  afterEach(() => {
    if (scope) {
      scope.stop();
    }
    for (const el of elementsToCleanUp) {
      if (el && typeof el.remove === "function") {
        el.remove();
      }
    }
    elementsToCleanUp.length = 0;
  });

  function setup(
    options: {
      enabled?: any;
      loop?: any;
      orientation?: any;
      openOnArrowKeyDown?: any;
      rtl?: any;
      closeOnTab?: any;
      anchorEl?: any;
      values?: any;
      isValueDisabled?: (val: string) => boolean;
      onEnter?: (val: string, e: KeyboardEvent) => void;
      onExit?: (val: string, e: KeyboardEvent) => void;
    } = {},
  ) {
    scope = effectScope();

    const anchorEl = options.anchorEl || document.createElement("button");
    const floatingEl = document.createElement("div");

    if (anchorEl instanceof HTMLElement) {
      document.body.appendChild(anchorEl);
      elementsToCleanUp.push(anchorEl);
    }
    document.body.appendChild(floatingEl);
    elementsToCleanUp.push(floatingEl);

    const openRef = ref(false);
    const anchorRef = ref(anchorEl);
    const floatingRef = ref(floatingEl);

    let resultContext: any;
    let collection: ReturnType<typeof useCollection>;

    scope.run(() => {
      const context = useFloatingContext({
        anchorEl: anchorRef,
        floatingEl: floatingRef,
        open: openRef,
      });

      collection = useCollection({
        values: options.values || ["1", "2", "3"],
        isValueDisabled: options.isValueDisabled,
      });

      const navigation = useListNavigation(context, {
        collection,
        orientation: options.orientation ?? "vertical",
        loop: "loop" in options ? options.loop : true,
        enabled: options.enabled,
        openOnArrowKeyDown: options.openOnArrowKeyDown,
        rtl: options.rtl,
        closeOnTab: options.closeOnTab,
        onEnter: options.onEnter,
        onExit: options.onExit,
      });

      resultContext = {
        context,
        navigation,
        collection,
        anchorEl,
        floatingEl,
        openRef,
      };
    });

    return resultContext as {
      context: ReturnType<typeof useFloatingContext>;
      navigation: ReturnType<typeof useListNavigation>;
      collection: ReturnType<typeof useCollection>;
      anchorEl: any;
      floatingEl: HTMLDivElement;
      openRef: ReturnType<typeof ref<boolean>>;
    };
  }

  it("opens on ArrowDown and sets activeValue to first item", () => {
    const { anchorEl, openRef, collection } = setup();

    dispatchKey(anchorEl, "ArrowDown");

    expect(openRef.value).toBe(true);
    expect(collection.activeValue.value).toBe("1");
  });

  it("opens on ArrowUp and sets activeValue to last item", () => {
    const { anchorEl, openRef, collection } = setup();

    dispatchKey(anchorEl, "ArrowUp");

    expect(openRef.value).toBe(true);
    expect(collection.activeValue.value).toBe("3");
  });

  it("navigates next on ArrowDown when floating is open", () => {
    const { floatingEl, openRef, collection } = setup();
    openRef.value = true;
    collection.setActiveValue("1");

    dispatchKey(floatingEl, "ArrowDown");
    expect(collection.activeValue.value).toBe("2");

    dispatchKey(floatingEl, "ArrowDown");
    expect(collection.activeValue.value).toBe("3");
  });

  it("navigates previous on ArrowUp when floating is open", () => {
    const { floatingEl, openRef, collection } = setup();
    openRef.value = true;
    collection.setActiveValue("3");

    dispatchKey(floatingEl, "ArrowUp");
    expect(collection.activeValue.value).toBe("2");

    dispatchKey(floatingEl, "ArrowUp");
    expect(collection.activeValue.value).toBe("1");
  });

  it("navigates to first on Home", () => {
    const { floatingEl, openRef, collection } = setup();
    openRef.value = true;
    collection.setActiveValue("3");

    dispatchKey(floatingEl, "Home");
    expect(collection.activeValue.value).toBe("1");
  });

  it("navigates to last on End", () => {
    const { floatingEl, openRef, collection } = setup();
    openRef.value = true;
    collection.setActiveValue("1");

    dispatchKey(floatingEl, "End");
    expect(collection.activeValue.value).toBe("3");
  });

  it("wraps around when loop is enabled", () => {
    const { floatingEl, openRef, collection } = setup();
    openRef.value = true;
    collection.setActiveValue("3");

    dispatchKey(floatingEl, "ArrowDown");
    expect(collection.activeValue.value).toBe("1");
  });

  it("closes on Tab without preventing default", () => {
    const { floatingEl, openRef } = setup();
    openRef.value = true;

    const event = new KeyboardEvent("keydown", {
      key: "Tab",
      bubbles: true,
      cancelable: true,
    });
    floatingEl.dispatchEvent(event);
    expect(openRef.value).toBe(false);
    expect(event.defaultPrevented).toBe(false);
  });

  it("ignores keydowns on floating element when closed", () => {
    const { floatingEl, openRef, collection } = setup();
    openRef.value = false;
    collection.setActiveValue("1");

    dispatchKey(floatingEl, "ArrowDown");
    expect(collection.activeValue.value).toBe("1");
  });

  it("resets collection activeValue when closed", async () => {
    const { openRef, collection } = setup();
    openRef.value = true;
    collection.setActiveValue("2");

    openRef.value = false;
    await nextTick();
    expect(collection.activeValue.value).toBeNull();
  });

  describe("Submenu & Intent Navigation (onEnter / onExit)", () => {
    it("calls onEnter with activeValue on ArrowRight in LTR vertical list", () => {
      let enteredValue = "";
      let enteredEvent: KeyboardEvent | null = null;
      const { floatingEl, openRef, collection } = setup({
        onEnter: (val, e) => {
          enteredValue = val;
          enteredEvent = e;
        },
      });
      openRef.value = true;
      collection.setActiveValue("1");

      dispatchKey(floatingEl, "ArrowRight");

      expect(enteredValue).toBe("1");
      expect(enteredEvent).toBeInstanceOf(KeyboardEvent);
    });

    it("calls onExit with activeValue on ArrowLeft in LTR vertical list", () => {
      let exitedValue = "";
      let exitedEvent: KeyboardEvent | null = null;
      const { floatingEl, openRef, collection } = setup({
        onExit: (val, e) => {
          exitedValue = val;
          exitedEvent = e;
        },
      });
      openRef.value = true;
      collection.setActiveValue("1");

      dispatchKey(floatingEl, "ArrowLeft");

      expect(exitedValue).toBe("1");
      expect(exitedEvent).toBeInstanceOf(KeyboardEvent);
    });

    it("respects RTL for onEnter (ArrowLeft) and onExit (ArrowRight)", () => {
      let enteredValue = "";
      let exitedValue = "";
      const { floatingEl, openRef, collection } = setup({
        rtl: true,
        onEnter: (val) => {
          enteredValue = val;
        },
        onExit: (val) => {
          exitedValue = val;
        },
      });
      openRef.value = true;
      collection.setActiveValue("1");

      dispatchKey(floatingEl, "ArrowLeft");
      expect(enteredValue).toBe("1");

      dispatchKey(floatingEl, "ArrowRight");
      expect(exitedValue).toBe("1");
    });

    it("does not call onEnter / onExit when item is disabled", () => {
      let entered = false;
      let exited = false;
      const { floatingEl, openRef, collection } = setup({
        values: ["1", "2"],
        isValueDisabled: (val) => val === "2",
        onEnter: () => {
          entered = true;
        },
        onExit: () => {
          exited = true;
        },
      });
      openRef.value = true;
      collection.activeValue.value = "2";

      dispatchKey(floatingEl, "ArrowRight");
      expect(entered).toBe(false);

      dispatchKey(floatingEl, "ArrowLeft");
      expect(exited).toBe(false);
    });
  });

  describe("Option: enabled", () => {
    it("does not respond when disabled initially", () => {
      const { anchorEl, openRef } = setup({ enabled: false });
      dispatchKey(anchorEl, "ArrowDown");
      expect(openRef.value).toBe(false);
    });

    it("does not respond on floating element when disabled initially", () => {
      const { floatingEl, openRef, collection } = setup({ enabled: false });
      openRef.value = true;
      collection.setActiveValue("1");
      dispatchKey(floatingEl, "ArrowDown");
      expect(collection.activeValue.value).toBe("1");
    });

    it("supports dynamic changes of enabled status", async () => {
      const enabledRef = ref(true);
      const { anchorEl, openRef } = setup({ enabled: enabledRef });

      dispatchKey(anchorEl, "ArrowDown");
      expect(openRef.value).toBe(true);

      openRef.value = false;
      enabledRef.value = false;
      await nextTick();

      dispatchKey(anchorEl, "ArrowDown");
      expect(openRef.value).toBe(false);
    });
  });

  describe("Option: loop", () => {
    it("does not wrap when loop is false", () => {
      const { floatingEl, openRef, collection } = setup({ loop: false });
      openRef.value = true;
      collection.setActiveValue("3");

      dispatchKey(floatingEl, "ArrowDown");
      expect(collection.activeValue.value).toBe("3");
    });

    it("does not wrap when loop defaults to false", () => {
      const { floatingEl, openRef, collection } = setup({ loop: undefined });
      openRef.value = true;
      collection.setActiveValue("3");

      dispatchKey(floatingEl, "ArrowDown");
      expect(collection.activeValue.value).toBe("3");
    });
  });

  describe("Option: orientation", () => {
    describe("horizontal orientation", () => {
      it("opens on ArrowRight and ArrowLeft when closed", () => {
        const { anchorEl, openRef, collection } = setup({
          orientation: "horizontal",
          loop: false,
        });

        dispatchKey(anchorEl, "ArrowRight");
        expect(openRef.value).toBe(true);
        expect(collection.activeValue.value).toBe("1");

        openRef.value = false;
        collection.setActiveValue(null);

        dispatchKey(anchorEl, "ArrowLeft");
        expect(openRef.value).toBe(true);
        expect(collection.activeValue.value).toBe("3");
      });

      it("respects RTL for opening in horizontal orientation", () => {
        const { anchorEl, openRef, collection } = setup({
          orientation: "horizontal",
          loop: false,
          rtl: true,
        });

        dispatchKey(anchorEl, "ArrowLeft");
        expect(openRef.value).toBe(true);
        expect(collection.activeValue.value).toBe("1");

        openRef.value = false;
        collection.setActiveValue(null);

        dispatchKey(anchorEl, "ArrowRight");
        expect(openRef.value).toBe(true);
        expect(collection.activeValue.value).toBe("3");
      });

      it("navigates on ArrowRight/Left and ignores ArrowUp/Down when open", () => {
        const { floatingEl, openRef, collection } = setup({
          orientation: "horizontal",
        });
        openRef.value = true;
        collection.setActiveValue("1");

        dispatchKey(floatingEl, "ArrowDown");
        expect(collection.activeValue.value).toBe("1");
        dispatchKey(floatingEl, "ArrowUp");
        expect(collection.activeValue.value).toBe("1");

        dispatchKey(floatingEl, "ArrowRight");
        expect(collection.activeValue.value).toBe("2");
        dispatchKey(floatingEl, "ArrowLeft");
        expect(collection.activeValue.value).toBe("1");
      });
    });
  });

  describe("Option: openOnArrowKeyDown", () => {
    it("does not open when openOnArrowKeyDown is false", () => {
      const { anchorEl, openRef } = setup({ openOnArrowKeyDown: false });
      dispatchKey(anchorEl, "ArrowDown");
      expect(openRef.value).toBe(false);
    });
  });

  describe("Option: closeOnTab", () => {
    it("does not close on Tab when closeOnTab is false", () => {
      const { floatingEl, openRef } = setup({ closeOnTab: false });
      openRef.value = true;

      dispatchKey(floatingEl, "Tab");
      expect(openRef.value).toBe(true);
    });
  });

  describe("Virtual Element Support", () => {
    it("binds listeners and works with VirtualElement contextElement", () => {
      const contextEl = document.createElement("button");
      const virtualAnchor = {
        contextElement: contextEl,
      };

      const { openRef, collection } = setup({ anchorEl: virtualAnchor });

      dispatchKey(contextEl, "ArrowDown");
      expect(openRef.value).toBe(true);
      expect(collection.activeValue.value).toBe("1");
    });
  });

  describe("Cleanup method", () => {
    it("removes all listeners and stops watchers when cleanup is called", () => {
      const { navigation, anchorEl, openRef } = setup();

      navigation.cleanup();

      dispatchKey(anchorEl, "ArrowDown");
      expect(openRef.value).toBe(false);
    });
  });

  describe("Typeable Targets Handling", () => {
    it("ignores arrow keydowns if target is typeable element inside the anchor", () => {
      const anchorEl = document.createElement("div");
      const inputEl = document.createElement("input");
      inputEl.type = "text";
      anchorEl.appendChild(inputEl);

      const { openRef } = setup({ anchorEl });

      inputEl.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
      expect(openRef.value).toBe(false);
    });
  });

  describe("Real-world patterns & Edge Cases", () => {
    it("skips disabled elements during navigation", () => {
      scope = effectScope();
      const anchorEl = document.createElement("button");
      const floatingEl = document.createElement("div");
      document.body.appendChild(anchorEl);
      document.body.appendChild(floatingEl);
      elementsToCleanUp.push(anchorEl, floatingEl);

      const openRef = ref(true);
      const anchorRef = ref(anchorEl);
      const floatingRef = ref(floatingEl);

      let collection: any;
      scope.run(() => {
        const context = useFloatingContext({
          anchorEl: anchorRef,
          floatingEl: floatingRef,
          open: openRef,
        });
        collection = useCollection({
          values: ["1", "2", "3"],
          isValueDisabled: (val) => val === "2",
        });
        useListNavigation(context, {
          collection,
          orientation: "vertical",
        });
      });

      collection.setActiveValue("1");
      dispatchKey(floatingEl, "ArrowDown");
      expect(collection.activeValue.value).toBe("3");

      dispatchKey(floatingEl, "ArrowUp");
      expect(collection.activeValue.value).toBe("1");
    });

    it("handles dynamic updates of collection values", async () => {
      scope = effectScope();
      const anchorEl = document.createElement("button");
      const floatingEl = document.createElement("div");
      document.body.appendChild(anchorEl);
      document.body.appendChild(floatingEl);
      elementsToCleanUp.push(anchorEl, floatingEl);

      const openRef = ref(true);
      const anchorRef = ref(anchorEl);
      const floatingRef = ref(floatingEl);

      const valuesRef = ref(["1", "2"]);
      let collection: any;
      scope.run(() => {
        const context = useFloatingContext({
          anchorEl: anchorRef,
          floatingEl: floatingRef,
          open: openRef,
        });
        collection = useCollection({
          values: valuesRef,
        });
        useListNavigation(context, {
          collection,
          orientation: "vertical",
        });
      });

      collection.setActiveValue("2");
      valuesRef.value = ["1"];
      await nextTick();

      dispatchKey(floatingEl, "ArrowDown");
      expect(collection.activeValue.value).toBe("1");
    });

    it("only prevents default on handled key events", () => {
      const { floatingEl, openRef } = setup();
      openRef.value = true;

      const unhandledEvent = new KeyboardEvent("keydown", {
        key: "a",
        bubbles: true,
        cancelable: true,
      });
      floatingEl.dispatchEvent(unhandledEvent);
      expect(unhandledEvent.defaultPrevented).toBe(false);

      const handledEvent = new KeyboardEvent("keydown", {
        key: "ArrowDown",
        bubbles: true,
        cancelable: true,
      });
      floatingEl.dispatchEvent(handledEvent);
      expect(handledEvent.defaultPrevented).toBe(true);
    });

    it("handles typeable elements inside floating list", () => {
      const { floatingEl, openRef, collection } = setup();
      openRef.value = true;

      const input = document.createElement("input");
      floatingEl.appendChild(input);
      elementsToCleanUp.push(input);

      const typingEvent = new KeyboardEvent("keydown", {
        key: "a",
        bubbles: true,
        cancelable: true,
      });
      input.dispatchEvent(typingEvent);
      expect(typingEvent.defaultPrevented).toBe(false);

      const arrowEvent = new KeyboardEvent("keydown", {
        key: "ArrowDown",
        bubbles: true,
        cancelable: true,
      });
      input.dispatchEvent(arrowEvent);
      expect(collection.activeValue.value).toBe("1");
      expect(arrowEvent.defaultPrevented).toBe(true);
    });
  });

  describe("Complex Keyboard Sequences Marathon", () => {
    it("simulates a flat menu keyboard marathon navigation flow", async () => {
      const { anchorEl, floatingEl, openRef, collection } = setup();

      // 1. Initially closed. ArrowDown opens and sets to first
      dispatchKey(anchorEl, "ArrowDown");
      expect(openRef.value).toBe(true);
      expect(collection.activeValue.value).toBe("1");

      // 2. ArrowDown moves next
      dispatchKey(floatingEl, "ArrowDown");
      expect(collection.activeValue.value).toBe("2");

      // 3. ArrowDown moves next
      dispatchKey(floatingEl, "ArrowDown");
      expect(collection.activeValue.value).toBe("3");

      // 4. ArrowDown wraps around (loop defaults to true in setup)
      dispatchKey(floatingEl, "ArrowDown");
      expect(collection.activeValue.value).toBe("1");

      // 5. Home jumps to first
      dispatchKey(floatingEl, "Home");
      expect(collection.activeValue.value).toBe("1");

      // 6. End jumps to last
      dispatchKey(floatingEl, "End");
      expect(collection.activeValue.value).toBe("3");

      // 7. ArrowDown wraps
      dispatchKey(floatingEl, "ArrowDown");
      expect(collection.activeValue.value).toBe("1");

      // 8. ArrowUp wraps to last
      dispatchKey(floatingEl, "ArrowUp");
      expect(collection.activeValue.value).toBe("3");

      // 9. ArrowUp moves previous
      dispatchKey(floatingEl, "ArrowUp");
      expect(collection.activeValue.value).toBe("2");

      // 10. Tab closes the menu and clears activeValue
      dispatchKey(floatingEl, "Tab");
      expect(openRef.value).toBe(false);
      await nextTick();
      expect(collection.activeValue.value).toBeNull();

      // 11. Closed. ArrowUp opens and sets active to last
      dispatchKey(anchorEl, "ArrowUp");
      expect(openRef.value).toBe(true);
      expect(collection.activeValue.value).toBe("3");

      // 12. ArrowDown wraps
      dispatchKey(floatingEl, "ArrowDown");
      expect(collection.activeValue.value).toBe("1");

      // 13. Tab closes again
      dispatchKey(floatingEl, "Tab");
      expect(openRef.value).toBe(false);
    });

    it("simulates a parent menu and child submenu coordination flow", async () => {
      scope = effectScope();
      const parentAnchor = document.createElement("button");
      const parentFloating = document.createElement("div");
      document.body.appendChild(parentAnchor);
      document.body.appendChild(parentFloating);
      elementsToCleanUp.push(parentAnchor, parentFloating);

      const parentOpen = ref(false);
      const parentContext = useFloatingContext({
        anchorEl: ref(parentAnchor),
        floatingEl: ref(parentFloating),
        open: parentOpen,
      });
      const parentCollection = useCollection({ values: ["file", "edit", "view"] });

      const childFloating = document.createElement("div");
      document.body.appendChild(childFloating);
      elementsToCleanUp.push(childFloating);

      const childOpen = ref(false);
      const childContext = useFloatingContext({
        anchorEl: ref(parentFloating),
        floatingEl: ref(childFloating),
        open: childOpen,
        parentContext,
      });
      const childCollection = useCollection({ values: ["pdf", "png", "svg"] });

      useListNavigation(parentContext, {
        collection: parentCollection,
        orientation: "vertical",
        onEnter: (val) => {
          if (val === "file") {
            childOpen.value = true;
            childCollection.setFirst();
          }
        },
      });

      useListNavigation(childContext, {
        collection: childCollection,
        orientation: "vertical",
        onExit: () => {
          childOpen.value = false;
          parentCollection.setActiveValue("file");
        },
      });

      // 1. Open parent menu with ArrowDown
      dispatchKey(parentAnchor, "ArrowDown");
      expect(parentOpen.value).toBe(true);
      expect(parentCollection.activeValue.value).toBe("file");

      // 2. Press ArrowRight on "file" -> opens child submenu and focuses "pdf"
      dispatchKey(parentFloating, "ArrowRight");
      expect(childOpen.value).toBe(true);
      expect(childCollection.activeValue.value).toBe("pdf");

      // 3. ArrowDown inside child submenu -> moves to "png"
      dispatchKey(childFloating, "ArrowDown");
      expect(childCollection.activeValue.value).toBe("png");

      // 4. ArrowLeft inside child submenu -> closes submenu and returns focus to "file"
      dispatchKey(childFloating, "ArrowLeft");
      expect(childOpen.value).toBe(false);
      expect(parentCollection.activeValue.value).toBe("file");
    });
  });

  describe("Decoupled Callbacks & Custom Collection", () => {
    it("supports decoupled custom collection conforming to NavigableCollection interface", () => {
      scope = effectScope();
      const anchorEl = document.createElement("button");
      const floatingEl = document.createElement("div");
      document.body.appendChild(anchorEl);
      document.body.appendChild(floatingEl);
      elementsToCleanUp.push(anchorEl, floatingEl);

      const openRef = ref(true);
      const anchorRef = ref(anchorEl);
      const floatingRef = ref(floatingEl);

      let setNextCalled = false;
      let setPreviousCalled = false;

      const mockCollection = {
        activeValue: ref("item-1"),
        setActiveValue: () => {},
        setNext: () => {
          setNextCalled = true;
        },
        setPrevious: () => {
          setPreviousCalled = true;
        },
        setFirst: () => {},
        setLast: () => {},
      };

      scope.run(() => {
        const context = useFloatingContext({
          anchorEl: anchorRef,
          floatingEl: floatingRef,
          open: openRef,
        });
        useListNavigation(context, {
          collection: mockCollection,
          orientation: "vertical",
        });
      });

      dispatchKey(floatingEl, "ArrowDown");
      expect(setNextCalled).toBe(true);

      dispatchKey(floatingEl, "ArrowUp");
      expect(setPreviousCalled).toBe(true);
    });

    it("triggers onEnter and onExit with activeValue and KeyboardEvent", () => {
      scope = effectScope();
      const anchorEl = document.createElement("button");
      const floatingEl = document.createElement("div");
      document.body.appendChild(anchorEl);
      document.body.appendChild(floatingEl);
      elementsToCleanUp.push(anchorEl, floatingEl);

      const openRef = ref(true);
      const anchorRef = ref(anchorEl);
      const floatingRef = ref(floatingEl);

      let enterArgs: any[] = [];
      let exitArgs: any[] = [];

      const mockCollection = {
        activeValue: ref("item-active"),
        setActiveValue: () => {},
        setNext: () => {},
        setPrevious: () => {},
        setFirst: () => {},
        setLast: () => {},
      };

      scope.run(() => {
        const context = useFloatingContext({
          anchorEl: anchorRef,
          floatingEl: floatingRef,
          open: openRef,
        });
        useListNavigation(context, {
          collection: mockCollection,
          orientation: "vertical",
          onEnter: (activeValue, e) => {
            enterArgs = [activeValue, e];
          },
          onExit: (activeValue, e) => {
            exitArgs = [activeValue, e];
          },
        });
      });

      dispatchKey(floatingEl, "ArrowRight");
      expect(enterArgs[0]).toBe("item-active");
      expect(enterArgs[1] instanceof KeyboardEvent).toBe(true);

      dispatchKey(floatingEl, "ArrowLeft");
      expect(exitArgs[0]).toBe("item-active");
      expect(exitArgs[1] instanceof KeyboardEvent).toBe(true);
    });
  });

  describe("Context-Aware Hierarchy & Smart Defaults", () => {
    it("defaults openOnArrowKeyDown to false for nested child contexts", () => {
      scope = effectScope();
      const parentAnchor = document.createElement("button");
      const parentFloating = document.createElement("div");
      const childAnchor = document.createElement("button");
      const childFloating = document.createElement("div");

      document.body.appendChild(parentAnchor);
      document.body.appendChild(parentFloating);
      document.body.appendChild(childAnchor);
      document.body.appendChild(childFloating);
      elementsToCleanUp.push(parentAnchor, parentFloating, childAnchor, childFloating);

      const parentOpen = ref(false);
      const childOpen = ref(false);

      scope.run(() => {
        const rootContext = useFloatingContext({
          anchorEl: ref(parentAnchor),
          floatingEl: ref(parentFloating),
          open: parentOpen,
        });
        const childContext = useFloatingContext({
          anchorEl: ref(childAnchor),
          floatingEl: ref(childFloating),
          open: childOpen,
          parentContext: rootContext,
        });

        const rootCollection = useCollection({ values: ["a", "b"] });
        const childCollection = useCollection({ values: ["1", "2"] });

        // Root uses default openOnArrowKeyDown (which is context.isRoot === true)
        useListNavigation(rootContext, { collection: rootCollection });
        // Child uses default openOnArrowKeyDown (which is context.isRoot === false)
        useListNavigation(childContext, { collection: childCollection });
      });

      // Pressing ArrowDown on root anchor opens root
      dispatchKey(parentAnchor, "ArrowDown");
      expect(parentOpen.value).toBe(true);

      // Pressing ArrowDown on child anchor does NOT open child by default
      dispatchKey(childAnchor, "ArrowDown");
      expect(childOpen.value).toBe(false);
    });

    it("allows explicit openOnArrowKeyDown to override smart default on nested context", () => {
      scope = effectScope();
      const parentAnchor = document.createElement("button");
      const parentFloating = document.createElement("div");
      const childAnchor = document.createElement("button");
      const childFloating = document.createElement("div");

      document.body.appendChild(parentAnchor);
      document.body.appendChild(parentFloating);
      document.body.appendChild(childAnchor);
      document.body.appendChild(childFloating);
      elementsToCleanUp.push(parentAnchor, parentFloating, childAnchor, childFloating);

      const parentOpen = ref(false);
      const childOpen = ref(false);

      scope.run(() => {
        const rootContext = useFloatingContext({
          anchorEl: ref(parentAnchor),
          floatingEl: ref(parentFloating),
          open: parentOpen,
        });
        const childContext = useFloatingContext({
          anchorEl: ref(childAnchor),
          floatingEl: ref(childFloating),
          open: childOpen,
          parentContext: rootContext,
        });

        const childCollection = useCollection({ values: ["1", "2"] });
        useListNavigation(childContext, {
          collection: childCollection,
          openOnArrowKeyDown: true,
        });
      });

      dispatchKey(childAnchor, "ArrowDown");
      expect(childOpen.value).toBe(true);
    });

    it("automatically closes nested submenu and focuses anchorEl on ArrowLeft when onExit is omitted", () => {
      scope = effectScope();
      const parentAnchor = document.createElement("button");
      const parentFloating = document.createElement("div");
      const childAnchor = document.createElement("button");
      const childFloating = document.createElement("div");

      document.body.appendChild(parentAnchor);
      document.body.appendChild(parentFloating);
      document.body.appendChild(childAnchor);
      document.body.appendChild(childFloating);
      elementsToCleanUp.push(parentAnchor, parentFloating, childAnchor, childFloating);

      const parentOpen = ref(true);
      const childOpen = ref(true);
      let childCollection!: ReturnType<typeof useCollection>;

      scope.run(() => {
        const rootContext = useFloatingContext({
          anchorEl: ref(parentAnchor),
          floatingEl: ref(parentFloating),
          open: parentOpen,
        });
        const childContext = useFloatingContext({
          anchorEl: ref(childAnchor),
          floatingEl: ref(childFloating),
          open: childOpen,
          parentContext: rootContext,
        });

        childCollection = useCollection({ values: ["pdf", "png"] });

        // Note: No custom onExit passed to child
        useListNavigation(childContext, {
          collection: childCollection,
          orientation: "vertical",
        });
      });

      childCollection.setActiveValue("pdf");

      let focused = false;
      childAnchor.addEventListener("focus", () => {
        focused = true;
      });

      dispatchKey(childFloating, "ArrowLeft");

      expect(childOpen.value).toBe(false);
      expect(focused).toBe(true);
    });

    it("sets collection.activeValue when items register asynchronously upon opening via arrow key", async () => {
      scope = effectScope();
      const anchorEl = document.createElement("button");
      const floatingEl = document.createElement("div");
      document.body.appendChild(anchorEl);
      document.body.appendChild(floatingEl);
      elementsToCleanUp.push(anchorEl, floatingEl);

      const openRef = ref(false);
      const registeredIds = ref<string[]>([]);
      let collection!: ReturnType<typeof useCollection>;

      scope.run(() => {
        const context = useFloatingContext({
          anchorEl: ref(anchorEl),
          floatingEl: ref(floatingEl),
          open: openRef,
        });

        collection = useCollection({ values: registeredIds });

        useListNavigation(context, {
          collection,
          orientation: "vertical",
        });
      });

      expect(collection.activeValue.value).toBeNull();

      dispatchKey(anchorEl, "ArrowDown");
      expect(openRef.value).toBe(true);

      // Simulate child items mounting asynchronously during nextTick
      registeredIds.value = ["item-1", "item-2"];
      await nextTick();

      expect(collection.activeValue.value).toBe("item-1");
    });
  });
});
