import type { ComputedRef, MaybeRefOrGetter, Ref } from "vue";

export type FocusStrategy = "roving" | "activedescendant";
export type NavigationOrientation = "vertical" | "horizontal";

/**
 * Standard item representation for list navigation.
 */
export interface ListNavigationItem {
  /**
   * Unique identifier for the item.
   * If omitted, a deterministic auto-generated ID is assigned.
   */
  id?: string;
  /**
   * Accessible text label used for typeahead search matching.
   */
  label?: string;
  /**
   * Whether this item is disabled and should be skipped by keyboard navigation.
   */
  disabled?: boolean;
  /**
   * Custom underlying value or payload associated with the item.
   */
  value?: unknown;
}

/**
 * Options for configuring `useListNavigation`.
 */
export interface UseListNavigationOptions<T = ListNavigationItem | string> {
  /**
   * Ref or getter pointing to the container or input DOM element.
   * Event listeners (keyboard, click delegation, hover delegation) and ARIA attributes
   * are attached directly to this element.
   */
  containerEl?: MaybeRefOrGetter<HTMLElement | null>;

  /**
   * Optional ref or getter pointing to an array of item DOM elements (e.g. from `ref="itemEls"` in `v-for`).
   * When omitted, items are resolved via `registerItemElement` or queried from `containerEl`.
   */
  itemEls?: MaybeRefOrGetter<readonly (HTMLElement | null)[] | null | undefined>;

  /**
   * CSS selector used to query item elements inside `containerEl` when neither `itemEls`
   * nor `registerItemElement` are explicitly provided.
   * @default '[role="option"], [role="menuitem"], [role="tab"], [data-vfloat-item], li'
   */
  itemSelector?: string;

  /**
   * Focus management strategy:
   * - `'roving'`: Uses roving tabindex (`tabindex="0"` on active, `-1` on inactive) and calls `el.focus()`.
   * - `'activedescendant'`: Focus remains on the container/input; sets `aria-activedescendant` and calls `el.scrollIntoView()`.
   * @default 'roving'
   */
  strategy?: MaybeRefOrGetter<FocusStrategy>;

  /**
   * Navigation axis:
   * - `'vertical'`: ArrowUp/ArrowDown navigate items.
   * - `'horizontal'`: ArrowLeft/ArrowRight navigate items (inverting in RTL).
   * @default 'vertical'
   */
  orientation?: MaybeRefOrGetter<NavigationOrientation>;

  /**
   * If true, navigation wraps around list boundaries (end-to-start and vice versa).
   * @default false
   */
  loop?: MaybeRefOrGetter<boolean>;

  /**
   * Whether typing printable characters activates typeahead search.
   * @default true
   */
  typeahead?: MaybeRefOrGetter<boolean>;

  /**
   * Duration in milliseconds before the typed buffer is reset.
   * @default 500
   */
  typeaheadTimeout?: MaybeRefOrGetter<number>;

  /**
   * Whether moving the pointer over an item activates it via event delegation.
   * @default true
   */
  focusOnHover?: MaybeRefOrGetter<boolean>;

  /**
   * If true, changing the active index via navigation automatically triggers `onSelect`.
   * @default false
   */
  selectOnFocus?: MaybeRefOrGetter<boolean>;

  /**
   * Whether navigation behavior is enabled.
   * @default true
   */
  enabled?: MaybeRefOrGetter<boolean>;

  /**
   * Explicit RTL layout override.
   * When omitted, direction is inferred from the DOM context.
   */
  rtl?: MaybeRefOrGetter<boolean>;

  /**
   * Custom extractor for item ID.
   */
  getItemId?: (item: T, index: number) => string;

  /**
   * Custom extractor for item label (used in typeahead search).
   */
  getItemLabel?: (item: T, index: number) => string;

  /**
   * Custom predicate for disabled items.
   */
  isItemDisabled?: (item: T, index: number) => boolean;

  /**
   * Callback fired when an item is committed/selected via Enter, Space, click, or `selectOnFocus`.
   */
  onSelect?: (item: T, index: number, event: Event) => void;

  /**
   * Callback fired when the active item index changes.
   */
  onActiveChange?: (item: T | undefined, index: number) => void;
}

/**
 * Return shape for `useListNavigation`.
 */
export interface UseListNavigationReturn<T = ListNavigationItem | string> {
  /**
   * Currently active item index (-1 if none is active).
   */
  activeIndex: Ref<number>;

  /**
   * Currently active item reference.
   */
  activeItem: ComputedRef<T | undefined>;

  /**
   * Sets the active index directly.
   */
  setActiveIndex: (index: number) => void;

  /**
   * Moves to the next enabled item.
   */
  next: () => void;

  /**
   * Moves to the previous enabled item.
   */
  prev: () => void;

  /**
   * Jumps to the first enabled item.
   */
  first: () => void;

  /**
   * Jumps to the last enabled item.
   */
  last: () => void;

  /**
   * Callback to register individual item DOM elements (`:ref="el => registerItemElement(el, index)"`).
   * Primarily used for virtualized lists (e.g. `@tanstack/vue-virtual`).
   */
  registerItemElement: (el: HTMLElement | null, index: number) => void;

  /**
   * Stops all watchers, timers, and listeners.
   */
  cleanup: () => void;
}
