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
   * Whether moving the pointer over an item activates it.
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
 * Attributes and event handlers to spread onto each list item element.
 */
export interface ItemProps {
  id: string;
  tabindex: number;
  "aria-disabled"?: boolean;
  onClick: (event: MouseEvent) => void;
  onPointermove: (event: PointerEvent) => void;
}

/**
 * Attributes and event handlers to spread onto the container or combobox input element.
 */
export interface ContainerProps {
  tabindex: number;
  "aria-activedescendant"?: string;
  "aria-orientation"?: "vertical" | "horizontal";
  onKeydown: (event: KeyboardEvent) => void;
  onFocus: (event: FocusEvent) => void;
  onBlur: (event: FocusEvent) => void;
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
   * Reactive bindings to spread onto the container or combobox input element (`v-bind="containerProps"`).
   */
  containerProps: ComputedRef<ContainerProps>;

  /**
   * Bindings generator for each list item (`v-bind="getItemProps(item, index)"`).
   */
  getItemProps: (item: T, index: number) => ItemProps;

  /**
   * Ref to register or track the container DOM element.
   */
  containerEl: Ref<HTMLElement | null>;

  /**
   * Callback to register individual item DOM elements (`:ref="el => registerItemElement(el, index)"`).
   */
  registerItemElement: (el: HTMLElement | null, index: number) => void;

  /**
   * Stops all watchers, timers, and listeners.
   */
  cleanup: () => void;
}
