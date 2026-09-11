import { describe, expect, it } from "vitest";
import * as VFloat from "@/index";

describe("Public API Surface", () => {
  it("only exports approved runtime symbols", () => {
    const exportedKeys = Object.keys(VFloat).sort();

    const expectedKeys = [
      "arrow",
      "autoPlacement",
      "createCustomVirtualAdapter",
      "createTanStackVirtualAdapter",
      "flip",
      "hide",
      "inline",
      "offset",
      "shift",
      "size",
      "useAriaActivedescendant",
      "useArrow",
      "useClick",
      "useClientPoint",
      "useCollection",
      "useFloatingNode",
      "useFloatingTree",
      "useFocus",
      "useDismiss",
      "useFocusTrap",
      "useHover",
      "usePosition",
      "useRole",
      "useRovingFocus",
      "useTypeahead",
    ].sort();

    expect(exportedKeys).toEqual(expectedKeys);
  });

  it("does not expose internal utilities, classes, or singletons", () => {
    const forbidden = [
      "floatingTree",
      "FloatingTree",
      "FloatingTreeNode",
      "floatingInternals",
      "FloatingInternalsRegistry",
      "getFloatingInternals",
      "setFloatingInternals",
      "patchFloatingInternals",
      "useComposition",
      "useEscapeKey",
      "useOutsideClick",
      "isUsingKeyboard",
      "resolveKeyboardIntent",
      "useActiveDescendant",
      "useRtl",
    ];

    for (const key of forbidden) {
      expect(key in VFloat).toBe(false);
    }
  });
});
