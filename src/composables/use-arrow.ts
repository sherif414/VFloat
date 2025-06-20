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

/**
 * Options for the useArrow composable
 */
export interface UseArrowOptions {
  /**
   * The offset for the arrow positioning.
   * Defaults to "-12px" if not provided.
   */
  offset?: string
}

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
 * @param options - Optional configuration for the arrow, e.g., offset
 * @returns Computed arrow positions and CSS styles
 *
 * @example
 * ```ts
 * const { arrowStyles } = useArrow(floatingContext, { offset: "-10px" })
 * ```
 */
export function useArrow(context: FloatingContext, options: UseArrowOptions = {}): UseArrowReturn {
  const { middlewareData, placement } = context
  const { offset = "-12px" } = options

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
      [staticSide]: offset,
    }
  })

  return {
    arrowX,
    arrowY,
    arrowStyles,
  }
}
