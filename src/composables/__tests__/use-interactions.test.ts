import { describe, expect, it } from "vitest";
import { useClick } from "../interactions/use-click";
import { useFocus } from "../interactions/use-focus";
import { useInteractions } from "../interactions/use-interactions";

describe("useInteractions", () => {
  it("should combine multiple interaction handlers", () => {
    const click = useClick();
    const focus = useFocus();

    const { getReferenceProps, getFloatingProps } = useInteractions([click, focus]);

    expect(getReferenceProps).toBeDefined();
    expect(getFloatingProps).toBeDefined();
  });

  it("should merge refs from multiple interactions", () => {
    const click = useClick();
    const focus = useFocus();

    const { getReferenceProps } = useInteractions([click, focus]);
    const props = getReferenceProps();

    expect(props.ref).toBeDefined();
  });

  it("should handle empty interactions array", () => {
    const { getReferenceProps, getFloatingProps } = useInteractions([]);

    expect(getReferenceProps).toBeDefined();
    expect(getFloatingProps).toBeDefined();
  });
});
