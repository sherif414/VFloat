import { describe, expect, it } from "vitest";
import * as VFloat from "@/index";

describe("Feature: VFloat Public API Surface", () => {
  describe("Scenario: Public symbol boundary and encapsulation", () => {
    it("Given the library index entrypoint, When inspected, Then it exports only approved public runtime symbols", () => {
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
        "useEscapeKey",
        "useFloatingNode",
        "useFocus",
        "useFocusTrap",
        "useHover",
        "useOutsideClick",
        "usePosition",
        "useRole",
        "useRovingFocus",
        "useTypeahead",
      ].sort();

      expect(exportedKeys).toEqual(expectedKeys);
    });

    it("Given the library index entrypoint, When checked for internal symbols, Then internal utilities, classes, and singletons remain unexported", () => {
      const forbidden = [
        "useFloatingTree",
        "floatingTree",
        "FloatingTree",
        "FloatingTreeNode",
        "floatingInternals",
        "FloatingInternalsRegistry",
        "getFloatingInternals",
        "setFloatingInternals",
        "patchFloatingInternals",
        "useComposition",
        "useDismiss",
        "isUsingKeyboard",
        "resolveKeyboardIntent",
        "useActiveDescendant",
        "useCollection",
        "useRtl",
      ];

      for (const key of forbidden) {
        expect(key in VFloat).toBe(false);
      }
    });
  });
});
