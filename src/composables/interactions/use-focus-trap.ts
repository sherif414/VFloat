import { createFocusTrap, type FocusTrap } from "focus-trap";
import {
  type ComputedRef,
  computed,
  type MaybeRefOrGetter,
  nextTick,
  shallowRef,
  toValue,
  watchPostEffect,
} from "vue";
import type { FloatingContext } from "@/composables/positioning/floating-context";
import { tryOnScopeDispose } from "@/shared/lifecycle";
import type { OpenChangeReason } from "@/types";
import { resolveTreeInteraction } from "./internal/tree-interaction";

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
const isDev = import.meta.env.DEV;
const sharedTrapStack: FocusTrap[] = [];

type TrapIsolationMode = false | "inert" | "aria-hidden";
type CloseRequest = {
  reason: OpenChangeReason;
  event?: Event;
};

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
  const tree = resolveTreeInteraction(context);

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
  const shouldReturnFocus = computed(() => !!toValue(returnFocus));
  const shouldPreventScroll = computed(() => !!toValue(preventScroll));
  const isolationMode = computed(() =>
    resolveIsolationMode(isModal.value, shouldInertOutside.value),
  );

  // Use shallowRef for trap instance (don't need deep reactivity)
  const trapRef = shallowRef<FocusTrap | null>(null);
  const trapIsActive = shallowRef(false);
  const isActive = computed(() => trapIsActive.value);

  // Guard to prevent double-deactivation
  let isDeactivating = false;
  let pendingCloseRequest: CloseRequest | null = null;

  /**
   * Deactivates the focus trap and cleans up state.
   */
  const deactivateTrap = (options: { returnFocus?: boolean; closeRequest?: CloseRequest } = {}) => {
    if (isDeactivating) return;

    pendingCloseRequest = options.closeRequest ?? null;

    if (!trapRef.value) {
      trapIsActive.value = false;

      if (options.closeRequest && open.value) {
        const { reason, event } = options.closeRequest;
        pendingCloseRequest = null;
        if (tree.isTree) {
          tree.closeCurrent(reason, event);
        } else {
          setOpen(false, reason, event);
        }
      }

      return;
    }

    isDeactivating = true;
    try {
      trapRef.value.deactivate({
        returnFocus: options.returnFocus ?? shouldReturnFocus.value,
      });
      trapRef.value = null;
      trapIsActive.value = false;
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
        trapIsActive.value = true;
      },
      onPause: () => {
        trapIsActive.value = false;
      },
      onUnpause: () => {
        trapIsActive.value = true;
      },
      onDeactivate: () => {
        trapRef.value = null;
        trapIsActive.value = false;

        const closeRequest = pendingCloseRequest;
        pendingCloseRequest = null;

        if (closeRequest) {
          if (tree.isTree) {
            tree.closeCurrent(closeRequest.reason, closeRequest.event);
          } else {
            setOpen(false, closeRequest.reason, closeRequest.event);
          }
        }
      },
      initialFocus: resolveInitialFocus(initialFocus),
      fallbackFocus: () => container,
      returnFocusOnDeactivate: shouldReturnFocus.value,
      clickOutsideDeactivates: (event) => {
        if (tree.isTargetWithinBranch(event?.target ?? null)) {
          return false;
        }

        if (!shouldCloseOnFocusOut.value) return false;
        pendingCloseRequest = {
          reason: "outside-pointer",
          event,
        };
        return true;
      },
      allowOutsideClick: (event) => {
        if (tree.isTargetWithinBranch(event?.target ?? null)) {
          return true;
        }

        return !isModal.value;
      },
      escapeDeactivates: false,
      preventScroll: shouldPreventScroll.value,
      isolateSubtrees: isolationMode.value,
      checkCanFocusTrap: () => nextTick(),
      checkCanReturnFocus: shouldReturnFocus.value ? () => nextTick() : undefined,
      trapStack: sharedTrapStack,
    });

    // Activate with proper error handling
    try {
      trapRef.value.activate();
    } catch (error) {
      // Ensure state is cleaned up even on error
      pendingCloseRequest = null;
      trapRef.value = null;
      trapIsActive.value = false;

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
    void shouldCloseOnFocusOut.value;
    void shouldReturnFocus.value;
    void shouldPreventScroll.value;
    void isolationMode.value;

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
    deactivate: () =>
      deactivateTrap({
        closeRequest: {
          reason: "programmatic",
        },
      }),
  };
}
