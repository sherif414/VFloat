import type { FocusStrategy } from "./types";

//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * Creates an item DOM element resolver and focus/scroll synchronization controller.
 *
 * Supports both standard lists (via `itemEls` array) and virtualized lists
 * (via `registerItemElement` map).
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
  const itemElements = new Map<number, HTMLElement>();

  function registerItemElement(el: HTMLElement | null, index: number): void {
    if (el) {
      itemElements.set(index, el);
    } else {
      itemElements.delete(index);
    }
  }

  function getItemElement(index: number): HTMLElement | null {
    if (itemElements.has(index)) {
      return itemElements.get(index) ?? null;
    }

    if (getItemEls) {
      const els = getItemEls();
      if (els && els[index]) {
        return els[index] ?? null;
      }
    }

    return null;
  }

  function findItemIndex(target: HTMLElement | null): number | null {
    if (!target) return null;

    // 1. Check registered elements map (virtual lists & dynamic registrations)
    for (const [idx, el] of itemElements.entries()) {
      if (el && (el === target || el.contains(target))) {
        return idx;
      }
    }

    // 2. Check item elements array (standard lists)
    if (getItemEls) {
      const els = getItemEls();
      if (els) {
        for (let i = 0; i < els.length; i++) {
          const el = els[i];
          if (el && (el === target || el.contains(target))) {
            return i;
          }
        }
      }
    }

    return null;
  }

  function clearElements(): void {
    itemElements.clear();
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
    registerItemElement,
    getItemElement,
    findItemIndex,
    clearElements,
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
   * Registers or unregisters an item's DOM element by its index (e.g. for virtual lists).
   */
  registerItemElement: (el: HTMLElement | null, index: number) => void;

  /**
   * Retrieves the DOM element for a specific item index.
   */
  getItemElement: (index: number) => HTMLElement | null;

  /**
   * Resolves the list index for a given event target element by matching against known item elements.
   */
  findItemIndex: (target: HTMLElement | null) => number | null;

  /**
   * Clears all registered item elements.
   */
  clearElements: () => void;

  /**
   * Synchronizes DOM focus or active-descendant/scroll alignment for the given active index.
   */
  syncFocus: (index: number, strategy: FocusStrategy, activeId?: string | null) => void;
}
