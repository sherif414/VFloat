import type { FocusStrategy } from "./types";

//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * Creates an item DOM element registry and focus/scroll synchronization controller.
 *
 * @param getContainerEl - Accessor function returning the container or combobox input element.
 * @returns Element registry methods and strategy-specific focus synchronizer.
 */
export function createFocusStrategyController(
  getContainerEl: () => HTMLElement | null,
): FocusStrategyController {
  const itemElements = new Map<number, HTMLElement>();

  function registerItemElement(el: HTMLElement | null, index: number): void {
    if (el) {
      itemElements.set(index, el);
    } else {
      itemElements.delete(index);
    }
  }

  function getItemElement(index: number): HTMLElement | null {
    return itemElements.get(index) ?? null;
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
export function resolveItemTabindex(
  index: number,
  activeIndex: number,
  strategy: FocusStrategy,
): number {
  if (strategy === "activedescendant") {
    return -1;
  }

  // In roving tabindex: active item is 0, all others are -1.
  // If no item is active (activeIndex === -1), index 0 is focusable as entry point.
  const targetIndex = activeIndex >= 0 ? activeIndex : 0;
  return index === targetIndex ? 0 : -1;
}

//=======================================================================================
// 📌 Types
//=======================================================================================

export interface FocusStrategyController {
  /**
   * Registers or unregisters an item's DOM element by its index.
   */
  registerItemElement: (el: HTMLElement | null, index: number) => void;

  /**
   * Retrieves the DOM element for a specific item index.
   */
  getItemElement: (index: number) => HTMLElement | null;

  /**
   * Clears all registered item elements.
   */
  clearElements: () => void;

  /**
   * Synchronizes DOM focus or active-descendant/scroll alignment for the given active index.
   */
  syncFocus: (index: number, strategy: FocusStrategy, activeId?: string | null) => void;
}
