import { createFocusTrap, type FocusTrap } from "focus-trap";
import {
  type ComputedRef,
  computed,
  type MaybeRefOrGetter,
  shallowRef,
  toValue,
  watchPostEffect,
} from "vue";
import type { FloatingContext } from "@/composables/positioning/floating-context";
import { tryOnScopeDispose } from "@/shared/lifecycle";

//=======================================================================================
// 📌 Types
//=======================================================================================

export interface UseFocusTrapContext {
  refs: FloatingContext["refs"];
  state: FloatingContext["state"];
}

export interface UseFocusTrapOptions {
  /**
   * Determines if the focus trap should be enabled.
   * When `true`, the focus trap is active.
   * @default true
   */
  enabled?: MaybeRefOrGetter<boolean>;
  /**
   * When `true`, content outside the trap will be hidden from accessibility
   * trees (via `aria-hidden`) and potentially made inert (via `inert` attribute
   * if `outsideElementsInert` is `true` and supported).
   * This mimics modal behavior.
   * @default false
   */
  modal?: MaybeRefOrGetter<boolean>;
  /**
   * Specifies the element that should receive initial focus when the trap is activated.
   * - `undefined` or omitted: Focuses the first tabbable element within the trap.
   * - CSS selector string: Queries and focuses the first matching element.
   * - `HTMLElement`: Focuses the specific provided HTML element.
   * - `Function`: A function that returns an `HTMLElement` or `false`. The returned
   *   element will receive focus.
   * - `false`: Prevents any initial focus from being set by the trap.
   */
  initialFocus?: HTMLElement | (() => HTMLElement | false) | string | false;
  /**
   * When `true`, focus will be returned to the element that was focused
   * immediately before the trap was activated, upon deactivation.
   * @default true
   */
  returnFocus?: MaybeRefOrGetter<boolean>;
  /**
   * When `true` and the trap is not `modal`, the trap will deactivate (and potentially close
   * the associated component) if focus moves outside the defined trap elements.
   * @default false
   */
  closeOnFocusOut?: MaybeRefOrGetter<boolean>;
  /**
   * Controls whether the browser should scroll to the focused element.
   * Passed directly to the `focus()` method's `preventScroll` option.
   * @default true
   */
  preventScroll?: MaybeRefOrGetter<boolean>;
  /**
   * When `true` and `modal` is `true`, applies the `inert` attribute (if supported
   * by the browser) to elements outside the focus trap to prevent user interaction
   * and assistive technology access.
   * @default false
   */
  outsideElementsInert?: MaybeRefOrGetter<boolean>;
  /**
   * An optional error handler function that will be called if there's an
   * issue during the focus trap activation process.
   * @param error - The error object.
   */
  onError?: (error: unknown) => void;
}

export interface UseFocusTrapReturn {
  /** Check if the focus trap is currently active */
  isActive: ComputedRef<boolean>;
  /** Manually activate the focus trap (if enabled and open) */
  activate: () => void;
  /** Manually deactivate the focus trap */
  deactivate: () => void;
}

//=======================================================================================
// 📌 Constants & State Management
//=======================================================================================

// Check for inert support
const supportsInert = typeof HTMLElement !== "undefined" && "inert" in HTMLElement.prototype;
const isDev =
  (
    globalThis as typeof globalThis & {
      process?: { env?: { NODE_ENV?: string } };
    }
  ).process?.env?.NODE_ENV !== "production";

type TrapIsolationMode = false | "inert" | "aria-hidden";

/**
 * Normalizes focus-trap's flexible `initialFocus` option into a callback.
 */
function resolveInitialFocus(initialFocus: UseFocusTrapOptions["initialFocus"]) {
  return () => (typeof initialFocus === "function" ? initialFocus() : initialFocus);
}

/**
 * Picks the strongest outside-world isolation mode the environment can support.
 */
function resolveIsolationMode(modal: boolean, outsideElementsInert: boolean): TrapIsolationMode {
  if (!modal) return false;
  if (outsideElementsInert && supportsInert) return "inert";
  return "aria-hidden";
}

//=======================================================================================
// 📌 Main Composable
//=======================================================================================

/**
 * Creates a focus trap for a floating element using focus-trap library.
 * Manages focus containment, modal behavior, and accessibility features.
 *
 * @param context - Floating context containing floating element refs
 * @param options - Configuration options for the focus trap
 * @returns Object with isActive state, and manual control methods
 */
export function useFocusTrap(
  context: UseFocusTrapContext,
  options: UseFocusTrapOptions = {},
): UseFocusTrapReturn {
  const { floatingEl } = context.refs;
  const { open, setOpen } = context.state;

  // Normalize options with defaults
  const {
    enabled = true,
    modal = false,
    initialFocus,
    returnFocus = true,
    closeOnFocusOut = false,
    preventScroll = true,
    outsideElementsInert = false,
    onError,
  } = options;

  // Lazy-evaluated computed values (only created once)
  const isEnabled = computed(() => !!toValue(enabled));
  const isModal = computed(() => !!toValue(modal));
  const shouldCloseOnFocusOut = computed(() => !isModal.value && !!toValue(closeOnFocusOut));
  const shouldInertOutside = computed(() => !!toValue(outsideElementsInert));

  // Use shallowRef for trap instance (don't need deep reactivity)
  const trapRef = shallowRef<FocusTrap | null>(null);
  const isActive = computed(() => trapRef.value !== null);

  // Tracks whether the current deactivation should close the floating surface,
  // which lets us distinguish explicit closes from internal trap refreshes.
  let shouldCloseOnDeactivate = false;

  // Guard to prevent double-deactivation
  let isDeactivating = false;

  /**
   * Deactivates the focus trap and cleans up state.
   */
  const deactivateTrap = (options: { returnFocus?: boolean; closeFloating?: boolean } = {}) => {
    if (isDeactivating || !trapRef.value) return;

    isDeactivating = true;
    if (options.closeFloating) {
      shouldCloseOnDeactivate = true;
    }
    try {
      trapRef.value.deactivate({
        returnFocus: options.returnFocus ?? toValue(returnFocus),
      });
      trapRef.value = null;
    } finally {
      isDeactivating = false;
    }
  };

  /**
   * Creates and activates the focus trap.
   */
  const createTrap = () => {
    if (!isEnabled.value || !open.value) return;

    // Deactivate existing trap first without side effects from a real close.
    deactivateTrap({ returnFocus: false });

    const container = floatingEl.value;
    if (!container) {
      if (isDev) {
        console.warn("[useFocusTrap] No floating element available for focus trap");
      }
      return;
    }

    // Create the focus trap instance
    trapRef.value = createFocusTrap(container, {
      onActivate: () => {
        shouldCloseOnDeactivate = false;
      },
      onDeactivate: () => {
        trapRef.value = null;
        if (shouldCloseOnDeactivate) {
          shouldCloseOnDeactivate = false;
          setOpen(false);
        }
      },
      initialFocus: resolveInitialFocus(initialFocus),
      fallbackFocus: () => container,
      returnFocusOnDeactivate: toValue(returnFocus),
      clickOutsideDeactivates: () => {
        if (!shouldCloseOnFocusOut.value) return false;
        // Mark this as a real "dismiss" so `onDeactivate` can close the surface.
        shouldCloseOnDeactivate = true;
        return true;
      },
      allowOutsideClick: !isModal.value,
      escapeDeactivates: false,
      preventScroll: toValue(preventScroll),
      isolateSubtrees: resolveIsolationMode(isModal.value, shouldInertOutside.value),
      tabbableOptions: { displayCheck: "none" },
    });

    // Activate with proper error handling
    try {
      trapRef.value.activate();
    } catch (error) {
      // Ensure state is cleaned up even on error
      shouldCloseOnDeactivate = false;
      trapRef.value = null;

      // Call custom error handler if provided
      if (onError) {
        onError(error);
      } else if (isDev) {
        console.error("[useFocusTrap] Failed to activate focus trap:", error);
      }
    }
  };

  // Single watcher to manage trap lifecycle
  watchPostEffect(() => {
    if (isEnabled.value && open.value && floatingEl.value) {
      createTrap();
    } else {
      deactivateTrap();
    }
  });

  // Cleanup on scope disposal
  tryOnScopeDispose(() => {
    deactivateTrap();
  });

  return {
    isActive,
    activate: createTrap,
    deactivate: () => deactivateTrap({ closeFloating: true }),
  };
}
