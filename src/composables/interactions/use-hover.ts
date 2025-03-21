import {
  type MaybeRefOrGetter,
  type Ref,
  computed,
  onScopeDispose,
  toValue,
  watchEffect,
} from "vue";
import type { FloatingContext } from "../use-floating";

export interface UseHoverOptions {
  /**
   * Whether hover event listeners are enabled
   * @default true
   */
  enabled?: MaybeRefOrGetter<boolean>;

  /**
   * Delay in milliseconds before showing/hiding the floating element
   */
  delay?: MaybeRefOrGetter<number | { open?: number; close?: number }>;

  /**
   * Whether to keep the floating element open when hovering over it
   * @default true
   */
  handleFloatingHover?: MaybeRefOrGetter<boolean>;

  /**
   * Whether to register move events
   * @default false
   */
  move?: MaybeRefOrGetter<boolean>;

  /**
   * For use with FloatingDelayGroup
   * @internal
   */
  restMs?: number;
}

export interface UseHoverReturn {
  /**
   * Reference element props that enable hover functionality
   */
  getReferenceProps: () => {
    onMouseenter: (event: MouseEvent) => void;
    onMouseleave: (event: MouseEvent) => void;
    onMousemove?: (event: MouseEvent) => void;
    onFocus: (event: FocusEvent) => void;
    onBlur: (event: FocusEvent) => void;
  };

  /**
   * Floating element props that enable hover functionality
   */
  getFloatingProps: () => {
    onMouseenter: (event: MouseEvent) => void;
    onMouseleave: (event: MouseEvent) => void;
  };
}

/**
 * Enables showing/hiding the floating element when hovering the reference element
 */
export function useHover(
  context: FloatingContext & {
    open: Ref<boolean>;
    onOpenChange: (open: boolean) => void;
  },
  options: UseHoverOptions = {}
): UseHoverReturn {
  const {
    open,
    onOpenChange,
    refs,
    elements: { floating, reference },
  } = context;

  const { enabled = true, delay = 0, handleFloatingHover = true, move = false } = options;

  let timeoutId: number | null = null;
  let handlerRef: ((event: MouseEvent) => void) | null = null;

  const closeWithDelay = (runCallback = true) => {
    const closeDelay = getDelay("close");

    if (closeDelay) {
      clearTimeout(timeoutId!);
      timeoutId = window.setTimeout(() => {
        if (runCallback) {
          onOpenChange(false);
        }
      }, closeDelay);
    } else if (runCallback) {
      onOpenChange(false);
    }
  };

  const clearPointerEvents = () => {
    if (handlerRef && reference) {
      reference.removeEventListener("mousemove", handlerRef);
      handlerRef = null;
    }
  };

  const getDelay = (type: "open" | "close"): number => {
    const delayValue = toValue(delay);

    if (typeof delayValue === "number") {
      return delayValue;
    }

    return delayValue?.[type] ?? 0;
  };

  // Cleanup timeouts on unmount
  onScopeDispose(() => {
    clearTimeout(timeoutId!);
    clearPointerEvents();
  });

  // Determine if the component is enabled
  const isEnabled = computed(() => toValue(enabled));

  // Reset timeout when component is disabled
  watchEffect(() => {
    if (!isEnabled.value && timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  });

  return {
    getReferenceProps: () => ({
      onMouseenter: (_event: MouseEvent) => {
        if (!isEnabled.value) return;

        clearTimeout(timeoutId!);

        const openDelay = getDelay("open");

        if (openDelay) {
          timeoutId = window.setTimeout(() => {
            onOpenChange(true);
          }, openDelay);
        } else {
          onOpenChange(true);
        }

        if (toValue(move) && !handlerRef) {
          handlerRef = () => {
            if (open.value) return;

            onOpenChange(true);
          };

          reference?.addEventListener("mousemove", handlerRef);
        }
      },
      onMouseleave: (event: MouseEvent) => {
        if (!isEnabled.value) return;

        clearPointerEvents();

        if (!handleFloatingHover || !floating || !event.relatedTarget) {
          closeWithDelay();
          return;
        }

        // Check if hovered element is the floating element or its children
        let targetIsNotInsideFloating = true;
        let node = event.relatedTarget as Node | null;
        while (node) {
          if (node === floating) {
            targetIsNotInsideFloating = false;
            break;
          }
          node = node.parentNode;
        }

        if (targetIsNotInsideFloating) {
          closeWithDelay();
        }
      },
      ...(toValue(move) && {
        onMousemove: (event: MouseEvent) => {
          if (!isEnabled.value || !handlerRef) return;
          handlerRef(event);
        },
      }),
      onFocus: (_event: FocusEvent) => {
        if (!isEnabled.value) return;

        onOpenChange(true);
      },
      onBlur: (event: FocusEvent) => {
        if (!isEnabled.value) return;

        if (!floating) {
          onOpenChange(false);
          return;
        }

        if (event.relatedTarget && floating.contains(event.relatedTarget as Node)) {
          return;
        }

        onOpenChange(false);
      },
    }),

    getFloatingProps: () => ({
      onMouseenter: (_event: MouseEvent) => {
        if (!isEnabled.value || !handleFloatingHover) return;

        clearTimeout(timeoutId!);
      },
      onMouseleave: (_event: MouseEvent) => {
        if (!isEnabled.value || !handleFloatingHover) return;

        closeWithDelay();
      },
    }),
  };
}
