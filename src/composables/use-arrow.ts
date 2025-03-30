import type { ComputedRef } from "vue"
import { computed, toValue } from "vue"
import type { FloatingContext } from "./use-floating"

//=======================================================================================
// 📌 Types & Interfaces
//=======================================================================================

/**
 * Return value of the useArrow composable
 */
export interface UseArrowReturn {
  /**
   * The computed X position of the arrow
   */
  arrowX: ComputedRef<number>

  /**
   * The computed Y position of the arrow
   */
  arrowY: ComputedRef<number>

  /**
   * The computed CSS styles for positioning the arrow
   */
  arrowStyles: ComputedRef<Record<string, string>>
}

//=======================================================================================
// 📌 Constants
//=======================================================================================

const DEFAULT_ARROW_OFFSET = "-12px"

//=======================================================================================
// 📌 Main Logic / Primary Export(s)
//=======================================================================================

/**
 * Composable for computing arrow position styles for floating elements
 *
 * This composable calculates the position and styles for an arrow element
 * based on the placement and middleware data from a floating element.
 *
 * @param context - The floating context containing middleware data and placement information
 * @returns Computed arrow positions and CSS styles
 *
 * @example
 * ```ts
 * const { arrowStyles } = useArrow(floatingContext)
 * ```
 */
export function useArrow(context: FloatingContext): UseArrowReturn {
  const { middlewareData, placement } = context

  const arrowX = computed(() => middlewareData.value.arrow?.x ?? 0)
  const arrowY = computed(() => middlewareData.value.arrow?.y ?? 0)

  const arrowStyles = computed(() => {
    const staticSide = {
      top: "inset-block-end",
      right: "inset-inline-start",
      bottom: "inset-block-start",
      left: "inset-inline-end",
    }[toValue(placement).split("-")[0]] as string

    const x = arrowX.value != null ? `${arrowX.value}px` : ""
    const y = arrowY.value != null ? `${arrowY.value}px` : ""

    return {
      "inset-inline-start": x,
      "inset-block-start": y,
      [staticSide]: DEFAULT_ARROW_OFFSET,
    }
  })

  return {
    arrowX,
    arrowY,
    arrowStyles,
  }
}
