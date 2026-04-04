import { type ComputedRef, computed, type Ref, toValue, watch } from "vue";
import { getFloatingInternals } from "./floating-context";
import { arrow } from "../middlewares";
import type { FloatingContext } from "./floating-context";

export interface UseArrowReturn {
  arrowX: ComputedRef<number>;
  arrowY: ComputedRef<number>;
  arrowStyles: ComputedRef<Record<string, string>>;
}

export interface UseArrowOptions {
  /**
   * Arrow element that should be measured and positioned by middleware.
   */
  element: Ref<HTMLElement | null>;

  /**
   * Offset applied to the static side of the arrow.
   * Useful when the arrow visually overlaps the floating panel border.
   */
  offset?: string;
}

/**
 * Connects an arrow element to the current floating context and exposes
 * the computed coordinates/styles needed to place it.
 */
export function useArrow(context: FloatingContext, options: UseArrowOptions): UseArrowReturn {
  const { element: arrowEl, offset = "-4px" } = options;
  const { refs } = context;
  const { middlewareData, placement } = context.position;

  watch(
    arrowEl,
    (element) => {
      refs.setArrow(element);
    },
    { immediate: true },
  );

  const internals = getFloatingInternals(context);
  internals?.middlewareRegistry.register(
    computed(() => {
      if (!arrowEl.value) {
        return null;
      }

      return arrow({ element: arrowEl });
    }),
  );

  const arrowX = computed(() => middlewareData.value.arrow?.x ?? 0);
  const arrowY = computed(() => middlewareData.value.arrow?.y ?? 0);

  const arrowStyles = computed(() => {
    const arrowElement = arrowEl.value || refs.arrowEl.value;

    if (!arrowElement || !middlewareData.value.arrow) {
      return {};
    }

    // The arrow is positioned on the opposite side of the resolved placement.
    const side = toValue(placement).split("-")[0] as "top" | "bottom" | "left" | "right";

    if (side === "bottom") {
      return {
        "inset-inline-start": `${arrowX.value}px`,
        "inset-block-start": offset,
      };
    }

    if (side === "top") {
      return {
        "inset-inline-start": `${arrowX.value}px`,
        "inset-block-end": offset,
      };
    }

    if (side === "right") {
      return {
        "inset-block-start": `${arrowY.value}px`,
        "inset-inline-start": offset,
      };
    }

    return {
      "inset-block-start": `${arrowY.value}px`,
      "inset-inline-end": offset,
    };
  }) as ComputedRef<Record<string, string>>;

  return {
    arrowX,
    arrowY,
    arrowStyles,
  };
}
