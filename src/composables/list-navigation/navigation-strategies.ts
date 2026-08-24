//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * Base abstract strategy for list navigation focus and DOM synchronization.
 */
export abstract class NavigationStrategy {
  /**
   * The unique name identifying the navigation strategy.
   */
  abstract readonly name: NavigationStrategyType;

  /**
   * Synchronizes focus or scroll position on the active item and target element.
   */
  abstract syncFocus(context: NavigationSyncContext): void;

  /**
   * Resolves the HTML `tabindex` attribute for an item at the given index.
   */
  abstract getItemTabindex(index: number, activeIndex: number): number;

  /**
   * Lifecycle hook invoked when target element or orientation updates.
   */
  onTargetUpdate?(targetEl: HTMLElement | null, orientation: NavigationOrientation): void;
}

/**
 * Roving tabindex navigation strategy.
 *
 * Sets `tabindex="0"` on the active item (`-1` on others) and moves physical DOM focus
 * directly to the active item via `.focus()`.
 */
export class RovingFocusNavigationStrategy extends NavigationStrategy {
  readonly name = "roving" as const;

  syncFocus(context: NavigationSyncContext): void {
    const { index, itemEl } = context;
    if (index >= 0 && itemEl && typeof itemEl.focus === "function") {
      itemEl.focus();
    }
  }

  getItemTabindex(index: number, activeIndex: number): number {
    const targetIndex = activeIndex >= 0 ? activeIndex : 0;
    return index === targetIndex ? 0 : -1;
  }
}

/**
 * Active descendant navigation strategy.
 *
 * Keeps physical DOM focus on the target element (e.g. `<input>` or container),
 * updates `aria-activedescendant` to match the active item ID, and calls `.scrollIntoView()`.
 */
export class ActiveDescendantNavigationStrategy extends NavigationStrategy {
  readonly name = "activedescendant" as const;

  syncFocus(context: NavigationSyncContext): void {
    const { index, itemEl, targetEl, activeId } = context;

    if (index < 0) {
      if (targetEl) {
        targetEl.removeAttribute("aria-activedescendant");
      }
      return;
    }

    if (!itemEl) {
      return;
    }

    if (targetEl && (activeId || itemEl.id)) {
      targetEl.setAttribute("aria-activedescendant", activeId || itemEl.id);
    }

    if (typeof itemEl.scrollIntoView === "function") {
      itemEl.scrollIntoView({
        block: "nearest",
        inline: "nearest",
      });
    }
  }

  getItemTabindex(_index?: number, _activeIndex?: number): number {
    return -1;
  }

  onTargetUpdate(targetEl: HTMLElement | null, orientation: NavigationOrientation): void {
    if (!targetEl) return;

    if (
      !targetEl.hasAttribute("tabindex") &&
      targetEl.tagName !== "INPUT" &&
      targetEl.tagName !== "TEXTAREA"
    ) {
      targetEl.setAttribute("tabindex", "0");
    }
    targetEl.setAttribute("aria-orientation", orientation);
  }
}

/**
 * Creates a navigation strategy instance based on the strategy type name.
 */
export function createNavigationStrategy(type: NavigationStrategyType): NavigationStrategy {
  if (type === "activedescendant") {
    return new ActiveDescendantNavigationStrategy();
  } else {
    return new RovingFocusNavigationStrategy();
  }
}

/**
 * Creates an item DOM element resolver and navigation controller.
 *
 * @param getTargetEl - Accessor function returning the target DOM element.
 * @param getItems - Accessor function returning the array of item DOM elements.
 * @returns Element resolver, event delegation index finder, and focus synchronizer.
 */
export function createNavigationController(
  getTargetEl: () => HTMLElement | null,
  getItems: () => readonly (HTMLElement | null)[] | null | undefined,
): NavigationController {
  function getItemElement(index: number): HTMLElement | null {
    const items = getItems();
    return items?.[index] ?? null;
  }

  function findItemIndex(target: HTMLElement | null): number | null {
    if (!target) return null;
    const items = getItems();
    if (!items) return null;

    for (let i = 0; i < items.length; i++) {
      const itemEl = items[i];
      if (itemEl && (itemEl === target || itemEl.contains(target))) {
        return i;
      }
    }

    return null;
  }

  function syncFocus(index: number, strategy: NavigationStrategy, activeId?: string | null): void {
    const targetEl = getTargetEl();
    const itemEl = getItemElement(index);

    strategy.syncFocus({
      index,
      itemEl,
      targetEl,
      activeId,
    });
  }

  return {
    getItemElement,
    findItemIndex,
    syncFocus,
  };
}

//=======================================================================================
// 📌 Types
//=======================================================================================

export type NavigationStrategyType = "roving" | "activedescendant";

/**
 * Backwards compatibility alias for `NavigationStrategyType`.
 */
export type FocusStrategy = NavigationStrategyType;

export type NavigationOrientation = "vertical" | "horizontal";

export interface NavigationSyncContext {
  /**
   * The active item index (-1 when inactive).
   */
  index: number;

  /**
   * The DOM element for the active item, or null if off-screen/unmounted.
   */
  itemEl: HTMLElement | null;

  /**
   * The target container or input element.
   */
  targetEl: HTMLElement | null;

  /**
   * The resolved active item ID (used for aria-activedescendant).
   */
  activeId?: string | null;
}

export interface NavigationController {
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
  syncFocus: (index: number, strategy: NavigationStrategy, activeId?: string | null) => void;
}
