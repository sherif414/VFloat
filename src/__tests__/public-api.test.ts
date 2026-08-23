import { describe, expect, it } from "vitest";
import * as VFloat from "@/index";

describe("Public API Surface", () => {
  it("only exports approved runtime symbols", () => {
    const exportedKeys = Object.keys(VFloat).sort();

    const expectedKeys = [
      "arrow",
      "autoPlacement",
      "flip",
      "hide",
      "inline",
      "offset",
      "shift",
      "size",
      "useArrow",
      "useClick",
      "useClientPoint",
      "useCollection",
      "useEscapeKey",
      "useFloatingContext",
      "useFocus",
      "useFocusManager",
      "useHover",
      "useListNavigation",
      "useOutsideClick",
      "usePosition",
      "useRole",
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
