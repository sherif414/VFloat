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
   * Controls the offset of the arrow from the edge of the floating element.
   *
   * A positive value moves the arrow further into the floating element,
   * while a negative value creates a gap between the arrow and the element.
   * This is useful for preventing the arrow from overlapping borders or shadows.
   *
   * The value must be a valid CSS length (e.g., '5px', '-0.5rem').
   *
   * @default '-4px'
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
  const { offset = "-4px" } = options

  const arrowX = computed(() => middlewareData.value.arrow?.x ?? 0)
  const arrowY = computed(() => middlewareData.value.arrow?.y ?? 0)

  const arrowStyles = computed(() => {
    const side = toValue(placement).split("-")[0] as "top" | "bottom" | "left" | "right"

    const x = arrowX.value
    const y = arrowY.value

    if (side === "bottom") {
      return {
        "inset-inline-start": `${x}px`,
        "inset-block-start": offset,
      }
    }
    if (side === "top") {
      return {
        "inset-inline-start": `${x}px`,
        "inset-block-end": offset,
      }
    }
    if (side === "right") {
      return {
        "inset-block-start": `${y}px`,
        "inset-inline-start": offset,
      }
    }
    if (side === "left") {
      return {
        "inset-block-start": `${y}px`,
        "inset-inline-end": offset,
      }
    }

    return {}
  }) as unknown as ComputedRef<Record<string, string>>

  return {
    arrowX,
    arrowY,
    arrowStyles,
  }
}
