import type { FocusStrategy } from "./types";

//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * Creates an item DOM element resolver and focus/scroll synchronization controller.
 *
 * @param getContainerEl - Accessor function returning the container DOM element.
 * @param options - Configuration for element resolution.
 * @returns Element resolver, event delegation index finder, and focus synchronizer.
 */
export function createFocusStrategyController(
  getContainerEl: () => HTMLElement | null,
  options: FocusStrategyControllerOptions = {},
): FocusStrategyController {
  const { getItemEls } = options;

  function getItemElement(index: number): HTMLElement | null {
    if (!getItemEls) return null;
    const els = getItemEls();
    return els?.[index] ?? null;
  }

  function findItemIndex(target: HTMLElement | null): number | null {
    if (!target || !getItemEls) return null;
    const els = getItemEls();
    if (!els) return null;

    for (let i = 0; i < els.length; i++) {
      const el = els[i];
      if (el && (el === target || el.contains(target))) {
        return i;
      }
    }

    return null;
  }

  function syncFocus(index: number, strategy: FocusStrategy, activeId?: string | null): void {
    const container = getContainerEl();

    if (index < 0) {
      if (strategy === "activedescendant" && container) {
        container.removeAttribute("aria-activedescendant");
      }
      return;
    }

    const itemEl = getItemElement(index);
    if (!itemEl) {
      return;
    }

    if (strategy === "roving") {
      itemEl.focus();
    } else if (strategy === "activedescendant") {
      if (container && (activeId || itemEl.id)) {
        container.setAttribute("aria-activedescendant", activeId || itemEl.id);
      }

      if (typeof itemEl.scrollIntoView === "function") {
        itemEl.scrollIntoView({
          block: "nearest",
          inline: "nearest",
        });
      }
    }
  }

  return {
    getItemElement,
    findItemIndex,
    syncFocus,
  };
}

//=======================================================================================
// 📌 Helpers
//=======================================================================================

/**
 * Resolves the tabindex for a list item based on the active strategy and active index.
 */
export function getItemTabindex(
  index: number,
  activeIndex: number,
  strategy: FocusStrategy,
): number {
  if (strategy === "activedescendant") {
    return -1;
  }

  const targetIndex = activeIndex >= 0 ? activeIndex : 0;
  return index === targetIndex ? 0 : -1;
}

//=======================================================================================
// 📌 Types
//=======================================================================================

export interface FocusStrategyControllerOptions {
  /**
   * Accessor returning an array of item DOM elements (e.g. from `ref="itemEls"` in `v-for`).
   */
  getItemEls?: () => readonly (HTMLElement | null)[] | null | undefined;
}

export interface FocusStrategyController {
  /**
   * Retrieves the DOM element for a specific item index.
   */
  getItemElement: (index: number) => HTMLElement | null;

  /**
   * Resolves the list index for a given event target element by matching against known item elements.
   */
  findItemIndex: (target: HTMLElement | null) => number | null;

  /**
   * Synchronizes DOM focus or active-descendant/scroll alignment for the given active index.
   */
  syncFocus: (index: number, strategy: FocusStrategy, activeId?: string | null) => void;
}
