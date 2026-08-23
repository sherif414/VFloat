import type { FocusStrategy } from "./types";

export const DEFAULT_ITEM_SELECTOR =
  '[role="option"], [role="menuitem"], [role="tab"], [data-vfloat-item], li';

//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * Creates a hybrid item DOM element resolver and focus/scroll synchronization controller.
 *
 * Lookup Priority:
 * 1. Explicitly registered item elements (`registerItemElement`)
 * 2. Item elements array (`itemEls`)
 * 3. Automatic DOM query inside `containerEl` using `itemSelector`
 *
 * @param getContainerEl - Accessor function returning the container DOM element.
 * @param options - Configuration for element resolution.
 * @returns Element resolver, event delegation index finder, and focus synchronizer.
 */
export function createFocusStrategyController(
  getContainerEl: () => HTMLElement | null,
  options: FocusStrategyControllerOptions = {},
): FocusStrategyController {
  const { getItemEls, itemSelector = DEFAULT_ITEM_SELECTOR } = options;
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

    const container = getContainerEl();
    if (container) {
      const queried = container.querySelectorAll<HTMLElement>(itemSelector);
      if (queried && queried[index]) {
        return queried[index];
      }
    }

    return null;
  }

  function findItemIndex(target: HTMLElement | null): number | null {
    if (!target) return null;

    // 1. Check explicit map entries
    for (const [idx, el] of itemElements.entries()) {
      if (el === target || el.contains(target)) {
        return idx;
      }
    }

    // 2. Check item elements array
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

    // 3. Fallback to DOM closest query inside container
    const container = getContainerEl();
    if (container) {
      const itemEl = target.closest<HTMLElement>(itemSelector);
      if (itemEl && container.contains(itemEl)) {
        const queried = Array.from(container.querySelectorAll<HTMLElement>(itemSelector));
        const idx = queried.indexOf(itemEl);
        if (idx !== -1) {
          return idx;
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
   * Accessor returning an array of item DOM elements.
   */
  getItemEls?: () => readonly (HTMLElement | null)[] | null | undefined;

  /**
   * Selector for querying items in the container element.
   */
  itemSelector?: string;
}

export interface FocusStrategyController {
  /**
   * Registers or unregisters an item's DOM element by its index.
   */
  registerItemElement: (el: HTMLElement | null, index: number) => void;

  /**
   * Retrieves the DOM element for a specific item index using the hybrid resolution strategy.
   */
  getItemElement: (index: number) => HTMLElement | null;

  /**
   * Resolves the list index for a given event target element via DOM hierarchy inspection.
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
