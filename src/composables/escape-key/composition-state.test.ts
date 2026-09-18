import { afterEach, describe, expect, it, vi } from "vitest";
import { effectScope } from "vue";
import { useComposition } from "./composition-state";

describe("useComposition", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it("reacts to compositionstart and compositionend events", () => {
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
    expect(isComposingRef.value).toBe(false);

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
    expect(comp2.isComposing.value).toBe(false);

    scope2.stop();
  });
});
