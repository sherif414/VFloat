import { type MaybeRefOrGetter, type Ref, computed, toValue } from "vue";
import type { FloatingContext } from "../use-floating";

export interface UseClickOptions {
  /**
   * Whether click event listeners are enabled
   * @default true
   */
  enabled?: MaybeRefOrGetter<boolean>;

  /**
   * Whether to toggle or just set the open state on click
   * @default true
   */
  toggle?: MaybeRefOrGetter<boolean>;

  /**
   * The event to listen for
   * @default 'click'
   */
  event?: MaybeRefOrGetter<"mousedown" | "mouseup" | "click">;

  /**
   * Handle clicking on the reference element
   * @default true
   */
  ignoreMouse?: MaybeRefOrGetter<boolean>;
}

export interface UseClickReturn {
  /**
   * Reference element props that enable click functionality
   */
  getReferenceProps: () => {
    onClick?: (event: MouseEvent) => void;
    onMousedown?: (event: MouseEvent) => void;
    onMouseup?: (event: MouseEvent) => void;
  };
}

/**
 * Enables showing/hiding the floating element when clicking the reference element
 */
export function useClick(
  context: FloatingContext & {
    open: Ref<boolean>;
    onOpenChange: (open: boolean) => void;
  },
  options: UseClickOptions = {}
): UseClickReturn {
  const { open, onOpenChange } = context;

  const { enabled = true, toggle = true, event = "click", ignoreMouse = false } = options;

  const isEnabled = computed(() => toValue(enabled));

  const eventHandler = (event: MouseEvent) => {
    if (!isEnabled.value) return;

    if (toValue(ignoreMouse) && event.type.includes("mouse") && event.button !== 0) {
      return;
    }

    if (toValue(toggle)) {
      onOpenChange(!open.value);
    } else {
      onOpenChange(true);
    }
  };

  return {
    getReferenceProps: () => {
      const clickEvent = toValue(event);

      switch (clickEvent) {
        case "mousedown":
          return { onMousedown: eventHandler };
        case "mouseup":
          return { onMouseup: eventHandler };
        default:
          return { onClick: eventHandler };
      }
    },
  };
}
