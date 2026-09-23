import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { effectScope } from "vue";
import { isImeComposing, useComposition } from "../composition-state";

const SAFARI_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";

describe("Feature: Shared IME composition state", () => {
  const originalUserAgent = window.navigator.userAgent;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    Object.defineProperty(window.navigator, "userAgent", {
      configurable: true,
      value: originalUserAgent,
    });
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe("Scenario: Standard and browser-specific composition lifecycle", () => {
    it("Given a standard browser environment, When compositionstart and compositionend fire, Then composition state updates and resets synchronously", () => {
      const scope = effectScope();
      let isComposingRef!: ReturnType<typeof useComposition>["isComposing"];

      scope.run(() => {
        const { isComposing } = useComposition();
        isComposingRef = isComposing;
      });

      expect(isComposingRef.value).toBe(false);
      expect(isImeComposing()).toBe(false);

      document.dispatchEvent(new CompositionEvent("compositionstart"));
      expect(isComposingRef.value).toBe(true);
      expect(isImeComposing()).toBe(true);

      document.dispatchEvent(new CompositionEvent("compositionend"));
      // Spec-compliant browsers (Chrome, Firefox) reset synchronously (W3C UI Events § 3.6.5)
      expect(isComposingRef.value).toBe(false);
      expect(isImeComposing()).toBe(false);

      scope.stop();
    });

    it("Given a WebKit/Safari user agent, When compositionend fires, Then state remains true during the 5ms debounce window and resets after", () => {
      Object.defineProperty(window.navigator, "userAgent", {
        configurable: true,
        value: SAFARI_USER_AGENT,
      });

      const scope = effectScope();
      let isComposingRef!: ReturnType<typeof useComposition>["isComposing"];

      scope.run(() => {
        const { isComposing } = useComposition();
        isComposingRef = isComposing;
      });

      document.dispatchEvent(new CompositionEvent("compositionstart"));
      expect(isComposingRef.value).toBe(true);
      expect(isImeComposing()).toBe(true);

      document.dispatchEvent(new CompositionEvent("compositionend"));
      expect(isComposingRef.value).toBe(true);
      expect(isImeComposing()).toBe(true);

      vi.advanceTimersByTime(4);
      expect(isComposingRef.value).toBe(true);
      expect(isImeComposing()).toBe(true);

      vi.advanceTimersByTime(1);
      expect(isComposingRef.value).toBe(false);
      expect(isImeComposing()).toBe(false);

      scope.stop();
    });

    it("Given a WebKit/Safari debounce window in progress, When a new compositionstart fires, Then the pending reset timer is cancelled", () => {
      Object.defineProperty(window.navigator, "userAgent", {
        configurable: true,
        value: SAFARI_USER_AGENT,
      });

      const scope = effectScope();
      let isComposingRef!: ReturnType<typeof useComposition>["isComposing"];

      scope.run(() => {
        const { isComposing } = useComposition();
        isComposingRef = isComposing;
      });

      document.dispatchEvent(new CompositionEvent("compositionstart"));
      document.dispatchEvent(new CompositionEvent("compositionend"));
      expect(isComposingRef.value).toBe(true);

      vi.advanceTimersByTime(2);
      // User starts composing again within 2ms
      document.dispatchEvent(new CompositionEvent("compositionstart"));
      expect(isComposingRef.value).toBe(true);

      // After remaining time would have elapsed, it must still be true
      vi.advanceTimersByTime(10);
      expect(isComposingRef.value).toBe(true);

      scope.stop();
    });
  });

  describe("Scenario: Interruption and blur handling", () => {
    it("Given active composition, When the window blurs, Then composition state resets immediately", () => {
      const scope = effectScope();
      let isComposingRef!: ReturnType<typeof useComposition>["isComposing"];

      scope.run(() => {
        const { isComposing } = useComposition();
        isComposingRef = isComposing;
      });

      document.dispatchEvent(new CompositionEvent("compositionstart"));
      expect(isComposingRef.value).toBe(true);

      window.dispatchEvent(new Event("blur"));
      expect(isComposingRef.value).toBe(false);

      scope.stop();
    });

    it("Given active composition, When document visibility changes to hidden, Then composition state resets immediately", () => {
      const scope = effectScope();
      let isComposingRef!: ReturnType<typeof useComposition>["isComposing"];

      scope.run(() => {
        const { isComposing } = useComposition();
        isComposingRef = isComposing;
      });

      document.dispatchEvent(new CompositionEvent("compositionstart"));
      expect(isComposingRef.value).toBe(true);

      Object.defineProperty(document, "hidden", {
        configurable: true,
        value: true,
      });

      document.dispatchEvent(new Event("visibilitychange"));
      expect(isComposingRef.value).toBe(false);

      Object.defineProperty(document, "hidden", {
        configurable: true,
        value: false,
      });

      scope.stop();
    });
  });

  describe("Scenario: Shared singleton consumer counting and scope disposal", () => {
    it("Given usage outside an active effect scope, When scoped consumers are stopped, Then it does not leak references and re-creates cleanly", () => {
      // Calling outside a scope should work safely without incrementing consumers
      const { isComposing: compOutside } = useComposition();
      expect(compOutside.value).toBe(false);

      const scope = effectScope();
      let compInside!: ReturnType<typeof useComposition>;

      scope.run(() => {
        compInside = useComposition();
      });

      document.dispatchEvent(new CompositionEvent("compositionstart"));
      expect(compOutside.value).toBe(true);
      expect(compInside.isComposing.value).toBe(true);

      // Disposing the only scoped consumer should cleanly tear down the shared state
      scope.stop();

      // Re-invoking in a new scope gets a clean fresh state
      const newScope = effectScope();
      let compNew!: ReturnType<typeof useComposition>;
      newScope.run(() => {
        compNew = useComposition();
      });
      expect(compNew.isComposing.value).toBe(false);
      newScope.stop();
    });

    it("Given multiple active effect scopes, When one scope stops, Then shared state persists until all scopes are disposed", () => {
      const scope1 = effectScope();
      const scope2 = effectScope();

      let comp1!: ReturnType<typeof useComposition>;
      let comp2!: ReturnType<typeof useComposition>;

      scope1.run(() => {
        comp1 = useComposition();
      });

      scope2.run(() => {
        comp2 = useComposition();
      });

      expect(comp1.isComposing).toBe(comp2.isComposing);

      document.dispatchEvent(new CompositionEvent("compositionstart"));
      expect(comp1.isComposing.value).toBe(true);
      expect(comp2.isComposing.value).toBe(true);

      scope1.stop();
      expect(comp2.isComposing.value).toBe(true);

      document.dispatchEvent(new CompositionEvent("compositionend"));
      expect(comp2.isComposing.value).toBe(false);

      scope2.stop();
    });
  });

  describe("Scenario: isImeComposing heuristic evaluation with KeyboardEvent", () => {
    it("Given a KeyboardEvent with isComposing true, When isImeComposing is checked, Then it returns true", () => {
      const event = new KeyboardEvent("keydown", { key: "Enter" });
      Object.defineProperty(event, "isComposing", { value: true });

      expect(isImeComposing(event)).toBe(true);
    });

    it("Given a KeyboardEvent with keyCode 229, When isImeComposing is checked, Then it returns true", () => {
      const event = new KeyboardEvent("keydown", { keyCode: 229 } as any);
      expect(isImeComposing(event)).toBe(true);
    });

    it("Given a KeyboardEvent with key 'Process', When isImeComposing is checked, Then it returns true", () => {
      const event = new KeyboardEvent("keydown", { key: "Process" });
      expect(isImeComposing(event)).toBe(true);
    });

    it("Given WebKit trailing keydown during debounce window, When isImeComposing is evaluated, Then it returns true until debounce elapses", () => {
      Object.defineProperty(window.navigator, "userAgent", {
        configurable: true,
        value: SAFARI_USER_AGENT,
      });

      const scope = effectScope();
      scope.run(() => {
        useComposition();
      });

      document.dispatchEvent(new CompositionEvent("compositionstart"));
      document.dispatchEvent(new CompositionEvent("compositionend"));

      // In WebKit, trailing keydown arrives with isComposing: false
      const event = new KeyboardEvent("keydown", { key: "Enter" });
      expect(event.isComposing).toBe(false);
      expect(isImeComposing(event)).toBe(true);

      vi.advanceTimersByTime(5);
      expect(isImeComposing(event)).toBe(false);

      scope.stop();
    });
  });
});
