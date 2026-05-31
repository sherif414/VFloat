import { type ComputedRef, computed, toValue } from "vue";
import { getFloatingInternals } from "@/composables/floating-context";
import { arrow } from "../middlewares";
import type { FloatingContext } from "@/composables/floating-context";
import type { FloatingPosition } from "@/composables/position";
import type { Padding } from "@floating-ui/dom";

//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * Connects an arrow element to the current floating context and exposes computed coordinates and inline styles.
 *
 * This composable handles arrow registration inside the floating position's middleware registry
 * and returns the reactive styles and offsets needed to render a floating arrow pointing to the anchor.
 *
 * @param context - The shared floating context.
 * @param position - The resolved positioning and layout data.
 * @param options - Configuration options for arrow positioning.
 * @returns An object containing computed coordinates and styles for the arrow.
 *
 * @example Basic usage in `<script setup>`
 * ```vue
 * <script setup lang="ts">
 * import { ref } from "vue";
 * import { useArrow, useFloatingContext, usePosition } from "v-float";
 *
 * const anchorEl = ref<HTMLElement | null>(null);
 * const floatingEl = ref<HTMLElement | null>(null);
 * const arrowEl = ref<HTMLElement | null>(null);
 *
 * const context = useFloatingContext({
 *   refs: { anchorEl, floatingEl, arrowEl },
 * });
 * const position = usePosition(context, { placement: "top" });
 * const { arrowStyles } = useArrow(context, position);
 * </script>
 *
 * <template>
 *   <button ref="anchorEl">Anchor</button>
 *   <div ref="floatingEl" :style="position.styles.value">
 *     Tooltip content
 *     <div ref="arrowEl" style="position: absolute" :style="arrowStyles.value" />
 *   </div>
 * </template>
 * ```
 */
export function useArrow(
  context: FloatingContext,
  position: FloatingPosition,
  options: UseArrowOptions = {},
): UseArrowReturn {
  const { refs } = context;
  const { middlewareData, placement } = position;
  const { arrowEl } = refs;
  const { offset = "-4px", padding } = options;

  const internals = getFloatingInternals(position);
  internals?.middlewareRegistry?.register(
    computed(() => {
      if (!arrowEl.value) return null;
      return arrow({ element: arrowEl, padding });
    }),
  );

  const arrowX = computed(() => middlewareData.value.arrow?.x ?? 0);
  const arrowY = computed(() => middlewareData.value.arrow?.y ?? 0);

  const arrowStyles = computed(() => {
    if (!arrowEl.value || !middlewareData.value.arrow) {
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

//=======================================================================================
// 📌 Types
//=======================================================================================

/**
 * Computed arrow coordinates and styles returned by `useArrow()`.
 */
export interface UseArrowReturn {
  /**
   * The computed horizontal coordinate of the arrow relative to the floating element.
   */
  arrowX: ComputedRef<number>;

  /**
   * The computed vertical coordinate of the arrow relative to the floating element.
   */
  arrowY: ComputedRef<number>;

  /**
   * Computed CSS inline styles (inset properties) to apply to the arrow element.
   * Position coordinates are converted into logical properties (e.g. `inset-inline-start`,
   * `inset-block-start`) based on the active placement.
   */
  arrowStyles: ComputedRef<Record<string, string>>;
}

/**
 * Options for positioning the context-owned arrow element.
 */
export interface UseArrowOptions {
  /**
   * Offset applied to the static side of the arrow (e.g. overlapping borders).
   * @default "-4px"
   */
  offset?: string;

  /**
   * The padding in pixels between the arrow element and the floating element edges
   * to prevent the arrow from overflowing rounded corners.
   */
  padding?: Padding;
}
