import type { Ref } from "vue";

//=======================================================================================
// 📌 Types
//=======================================================================================

/**
 * Target destination or directional step for navigation actions.
 *
 * Can be an exact item index or a semantic directional keyword.
 */
export type NavigationTargetValue =
  | number
  | "next"
  | "prev"
  | "previous"
  | "first"
  | "last"
  | "page-up"
  | "page-down"
  | "reset";

/**
 * Options configuring a programmatic navigation action.
 */
export interface NavigationTargetOptions {
  /**
   * Whether to prevent scrolling the newly focused element into view.
   * @default false
   */
  preventScroll?: boolean;
}

/**
 * Minimal public protocol implemented by keyboard navigation composables
 * (`useRovingFocus` and `useAriaActivedescendant`).
 *
 * Allows auxiliary composables like `useTypeahead` to coordinate navigation
 * seamlessly without tight coupling.
 */
export interface NavigationTarget {
  /**
   * Currently active or focused item index (-1 when unfocused / idle).
   */
  readonly activeIndex: Readonly<Ref<number>>;

  /**
   * Polymorphic navigation method to activate a specific item or move directionally.
   *
   * Accepts an index number, `"reset"` / `-1`, or semantic directional keywords
   * (`"next"`, `"prev"`, `"previous"`, `"first"`, `"last"`, `"page-up"`, `"page-down"`).
   */
  focusIndex: (target: NavigationTargetValue, options?: NavigationTargetOptions) => void;
}
