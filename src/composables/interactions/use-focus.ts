import { type MaybeRefOrGetter, type Ref, computed, toValue } from "vue";
import type { FloatingContext } from "../use-floating";

export interface UseFocusOptions {
  /**
   * Whether focus event listeners are enabled
   * @default true
   */
  enabled?: MaybeRefOrGetter<boolean>;

  /**
   * Only show the floating element when the reference element has keyboard focus
   * @default false
   */
  visibleOnly?: MaybeRefOrGetter<boolean>;
}

export interface UseFocusReturn {
  /**
   * Reference element props that enable focus functionality
   */
  getReferenceProps: () => {
    onFocus: (event: FocusEvent) => void;
    onBlur: (event: FocusEvent) => void;
  };
}

/**
 * Enables showing/hiding the floating element when focusing the reference element
 */
export function useFocus(
  context: FloatingContext & {
    open: Ref<boolean>;
    onOpenChange: (open: boolean) => void;
  },
  options: UseFocusOptions = {}
): UseFocusReturn {
  const {
    onOpenChange,
    elements: { floating },
  } = context;

  const { enabled = true, visibleOnly = false } = options;

  const isEnabled = computed(() => toValue(enabled));

  return {
    getReferenceProps: () => ({
      onFocus: (event: FocusEvent) => {
        if (!isEnabled.value) return;

        // Only focus events originating from keyboard navigation, not clicks
        const isKeyboardFocus =
          !toValue(visibleOnly) ||
          (event.target === event.currentTarget && event.relatedTarget !== null);

        if (isKeyboardFocus) {
          onOpenChange(true);
        }
      },
      onBlur: (event: FocusEvent) => {
        if (!isEnabled.value) return;

        if (!floating) {
          onOpenChange(false);
          return;
        }

        // Don't close if focus moved to floating element
        if (event.relatedTarget && floating.contains(event.relatedTarget as Node)) {
          return;
        }

        onOpenChange(false);
      },
    }),
  };
}
