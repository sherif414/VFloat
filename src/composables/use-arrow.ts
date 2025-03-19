import type { MiddlewareData, Placement } from "@floating-ui/dom";
import type { ComputedRef, MaybeRefOrGetter } from "vue";
import { computed, toValue } from "vue";

/**
 * Composable for getting arrow position styles
 */
export function useArrow(options: {
  element?: MaybeRefOrGetter<HTMLElement | null>;
  middlewareData: MaybeRefOrGetter<MiddlewareData>;
  placement: MaybeRefOrGetter<Placement>;
}) {
  const { element, middlewareData, placement } = options;

  const arrowX = computed(() => {
    const data = toValue(middlewareData)?.arrow;
    return data?.x ?? 0;
  });

  const arrowY = computed(() => {
    const data = toValue(middlewareData)?.arrow;
    return data?.y ?? 0;
  });

  const arrowStyles = computed(() => {
    const staticSide = {
      top: "bottom",
      right: "left",
      bottom: "top",
      left: "right",
    }[toValue(placement).split("-")[0]] as string;

    const el = toValue(element);
    const x = arrowX.value != null ? `${arrowX.value}px` : "";
    const y = arrowY.value != null ? `${arrowY.value}px` : "";

    return {
      left: x,
      top: y,
      [staticSide]: "-4px", // Default offset
    };
  });

  return {
    arrowX,
    arrowY,
    arrowStyles,
  };
}