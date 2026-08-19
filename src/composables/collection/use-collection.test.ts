import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { effectScope, ref } from "vue";
import { useCollection } from "@/composables/collection/use-collection";

describe("useCollection", () => {
  let scope: ReturnType<typeof effectScope> | undefined;

  beforeEach(() => {
    scope = effectScope();
  });

  afterEach(() => {
    scope?.stop();
    scope = undefined;
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it("moves through flat values", () => {
    let collection!: ReturnType<typeof useCollection>;
    scope?.run(() => {
      collection = useCollection({ values: ["open", "rename", "delete"] });
    });

    collection.setFirst();
    expect(collection.activeValue.value).toBe("open");

    collection.setNext();
    expect(collection.activeValue.value).toBe("rename");

    collection.setLast();
    expect(collection.activeValue.value).toBe("delete");

    collection.setPrevious();
    expect(collection.activeValue.value).toBe("rename");
  });

  it("loops at collection boundaries when requested", () => {
    let collection!: ReturnType<typeof useCollection>;
    scope?.run(() => {
      collection = useCollection({ values: ["open", "rename"] });
    });

    collection.setLast();
    collection.setNext({ loop: true });
    expect(collection.activeValue.value).toBe("open");

    collection.setPrevious({ loop: true });
    expect(collection.activeValue.value).toBe("rename");
  });

  it("does not loop when loop option is false at boundaries", () => {
    let collection!: ReturnType<typeof useCollection>;
    scope?.run(() => {
      collection = useCollection({ values: ["open", "rename"] });
    });

    collection.setLast();
    collection.setNext({ loop: false });
    expect(collection.activeValue.value).toBe("rename");

    collection.setFirst();
    collection.setPrevious({ loop: false });
    expect(collection.activeValue.value).toBe("open");
  });

  it("skips disabled values", () => {
    let collection!: ReturnType<typeof useCollection>;
    scope?.run(() => {
      collection = useCollection({
        values: ["open", "rename", "delete"],
        isValueDisabled: (value) => value === "rename",
      });
    });

    expect(collection.isItemDisabled("rename")).toBe(true);
    expect(collection.isItemDisabled("open")).toBe(false);

    collection.setFirst();
    expect(collection.activeValue.value).toBe("open");

    collection.setNext();
    expect(collection.activeValue.value).toBe("delete");

    collection.setActiveValue("rename");
    expect(collection.activeValue.value).toBe("delete");
  });

  it("handles empty and all-disabled collections gracefully", () => {
    let emptyCollection!: ReturnType<typeof useCollection>;
    let allDisabledCollection!: ReturnType<typeof useCollection>;
    scope?.run(() => {
      emptyCollection = useCollection({ values: [] });
      allDisabledCollection = useCollection({
        values: ["a", "b"],
        isValueDisabled: () => true,
      });
    });

    emptyCollection.setFirst();
    expect(emptyCollection.activeValue.value).toBeNull();
    emptyCollection.setNext({ loop: true });
    expect(emptyCollection.activeValue.value).toBeNull();

    allDisabledCollection.setFirst();
    expect(allDisabledCollection.activeValue.value).toBeNull();
    allDisabledCollection.setNext({ loop: true });
    expect(allDisabledCollection.activeValue.value).toBeNull();
  });

  it("clears stale active values when values change", () => {
    const values = ref(["open", "rename"]);
    let collection!: ReturnType<typeof useCollection>;
    scope?.run(() => {
      collection = useCollection({ values });
    });

    collection.setActiveValue("rename");
    values.value = ["open"];

    expect(collection.activeValue.value).toBe(null);
  });
});
