import { describe, expect, it } from "vitest";
import { ref } from "vue";
import { useMergeRefs } from "../interactions/use-merge-refs";

describe("useMergeRefs", () => {
  it("should merge multiple refs", () => {
    const ref1 = ref(null);
    const ref2 = ref(null);
    const element = document.createElement("div");

    const mergedRef = useMergeRefs([ref1, ref2]);
    mergedRef(element);

    expect(ref1.value).toBe(element);
    expect(ref2.value).toBe(element);
  });

  it("should handle empty refs array", () => {
    const mergedRef = useMergeRefs([]);
    const element = document.createElement("div");

    expect(() => mergedRef(element)).not.toThrow();
  });

  it("should handle null refs", () => {
    const ref1 = ref(null);
    const ref2 = null;
    const element = document.createElement("div");

    const mergedRef = useMergeRefs([ref1, ref2]);
    mergedRef(element);

    expect(ref1.value).toBe(element);
  });
});
