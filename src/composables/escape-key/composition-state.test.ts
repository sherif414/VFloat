import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { effectScope } from "vue";
import { useComposition } from "./composition-state";

const SAFARI_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";

describe("useComposition", () => {
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

  it("reacts to compositionstart immediately and delays compositionend reset", () => {
    const scope = effectScope();
    let isComposingRef!: ReturnType<typeof useComposition>["isComposing"];

    scope.run(() => {
      const { isComposing } = useComposition();
      isComposingRef = isComposing;
    });

    expect(isComposingRef.value).toBe(false);

    document.dispatchEvent(new CompositionEvent("compositionstart"));
    expect(isComposingRef.value).toBe(true);

    document.dispatchEvent(new CompositionEvent("compositionend"));
    // Immediately after compositionend, isComposing remains true to protect trailing keydown events
    // (WebKit Bug 165004 / UI Events § 3.5.3.3)
    expect(isComposingRef.value).toBe(true);

    vi.runAllTimers();
    expect(isComposingRef.value).toBe(false);

    scope.stop();
  });

  it("applies 5ms debounce window for WebKit/Safari", () => {
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

    document.dispatchEvent(new CompositionEvent("compositionend"));
    expect(isComposingRef.value).toBe(true);

    vi.advanceTimersByTime(4);
    expect(isComposingRef.value).toBe(true);

    vi.advanceTimersByTime(1);
    expect(isComposingRef.value).toBe(false);

    scope.stop();
  });

  it("cancels pending reset if a new compositionstart fires before delay elapses", () => {
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

  it("shares state across multiple consumers and disposes when all scopes stop", () => {
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
    expect(comp2.isComposing.value).toBe(true);

    vi.runAllTimers();
    expect(comp2.isComposing.value).toBe(false);

    scope2.stop();
  });
});
