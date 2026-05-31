import { describe, expect, it } from "vite-plus/test";
import { ref } from "vue";
import { useCollection } from "@/composables/collection/use-collection";

describe("useCollection", () => {
  it("moves through flat values", () => {
    const collection = useCollection({ values: ["open", "rename", "delete"] });

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
    const collection = useCollection({ values: ["open", "rename"] });

    collection.setLast();
    collection.setNext({ loop: true });
    expect(collection.activeValue.value).toBe("open");

    collection.setPrevious({ loop: true });
    expect(collection.activeValue.value).toBe("rename");
  });

  it("skips disabled values", () => {
    const collection = useCollection({
      values: ["open", "rename", "delete"],
      isValueDisabled: (value) => value === "rename",
    });

    collection.setFirst();
    expect(collection.activeValue.value).toBe("open");

    collection.setNext();
    expect(collection.activeValue.value).toBe("delete");

    collection.setActiveValue("rename");
    expect(collection.activeValue.value).toBe("delete");
  });

  it("clears stale active values when values change", () => {
    const values = ref(["open", "rename"]);
    const collection = useCollection({ values });

    collection.setActiveValue("rename");
    values.value = ["open"];

    expect(collection.activeValue.value).toBe(null);
  });
});
