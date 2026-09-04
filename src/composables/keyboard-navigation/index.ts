/**
 * Headless keyboard navigation composables for VFloat.
 *
 * Provides two distinct navigation patterns based on continuous text input:
 * - {@link useAriaActivedescendant}: Virtual focus for text-input-driven components.
 * - {@link useRovingFocus}: Physical roving focus for standalone composite widgets.
 */

export type {
  AriaActivedescendantItemParam,
  UseAriaActivedescendantOptions,
  UseAriaActivedescendantReturn,
} from "./use-aria-activedescendant";
export { useAriaActivedescendant } from "./use-aria-activedescendant";

export type {
  RovingEntryFocusMode,
  UseRovingFocusOptions,
  UseRovingFocusReturn,
} from "./use-roving-focus";
export { useRovingFocus } from "./use-roving-focus";

export type { VirtualizerAdapter } from "./virtualizer-adapter";
export { createCustomVirtualAdapter, createTanStackVirtualAdapter } from "./virtualizer-adapter";
