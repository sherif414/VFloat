import type { ComputedRef } from "vue";
import { computed, toValue } from "vue";
import type { FloatingContext } from "./use-floating";

interface UseArrowOptions extends Pick<FloatingContext, "middlewareData" | "placement"> {}

interface UseArrowReturn {
  /**
   * The computed X position of the arrow
   */
  arrowX: ComputedRef<number>;

  /**
   * The computed Y position of the arrow
   */
  arrowY: ComputedRef<number>;

  /**
   * The computed CSS styles for positioning the arrow
   */
  arrowStyles: ComputedRef<Record<string, string>>;
}

/**
 * Composable for getting arrow position styles
 * @param options - Configuration options for the arrow
 * @returns Computed arrow positions and styles
 */
export function useArrow(options: UseArrowOptions): UseArrowReturn {
  const { middlewareData, placement } = options;

  const arrowX = computed(() => middlewareData.value.arrow?.x ?? 0);
  const arrowY = computed(() => middlewareData.value.arrow?.y ?? 0);

  const arrowStyles = computed(() => {
    const staticSide = {
      top: "inset-block-end",
      right: "inset-inline-start",
      bottom: "inset-block-start",
      left: "inset-inline-end",
    }[toValue(placement).split("-")[0]] as string;

    const x = arrowX.value != null ? `${arrowX.value}px` : "";
    const y = arrowY.value != null ? `${arrowY.value}px` : "";

    return {
      "inset-inline-start": x,
      "inset-block-start": y,
      [staticSide]: "-12px", //FIXME: Default offset
    };
  });

  return {
    arrowX,
    arrowY,
    arrowStyles,
  };
}
