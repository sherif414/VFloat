import type { ComputedRef, Ref } from "vue"
import { computed, toValue } from "vue"
import type { FloatingContext } from "./use-floating"
import type { Middleware, Padding } from "@floating-ui/dom"
import { arrow as FloatingUIArrow } from "@floating-ui/dom"

//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * Positions an inner element of the floating element such that it is centered to the reference element.
 *
 * This middleware is used to position arrow elements within floating elements.
 *
 * @param options - The arrow options including padding and element reference
 * @returns A middleware function for arrow positioning
 * @see https://floating-ui.com/docs/arrow
 */
export function arrow(options: ArrowOptions): Middleware {
  return {
    name: "arrow",
    options,
    fn(args) {
      const element = toValue(options.element)

      if (element == null) {
        return {}
      }

      return FloatingUIArrow({ element, padding: options.padding }).fn(args)
    },
  }
}

/**
 * Composable for computing arrow position styles for floating elements
 *
 * This composable calculates the position and styles for an arrow element
 * based on the placement and middleware data from a floating element.
 *
 * @param options - Configuration options for the arrow positioning
 * @returns Computed arrow positions and CSS styles
 *
 * @example
 * ```ts
 * const { arrowStyles } = useArrow({
 *   middlewareData: floating.middlewareData,
 *   placement: floating.placement
 * })
 * ```
 */
export function useArrow(options: UseArrowOptions): UseArrowReturn {
  const { middlewareData, placement } = options

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
      [staticSide]: "-12px", //FIXME: Default offset
    }
  })

  return {
    arrowX,
    arrowY,
    arrowStyles,
  }
}

//=======================================================================================
// 📌 Types
//=======================================================================================

/**
 * Options for configuring arrow positioning within floating elements
 */
export interface ArrowOptions {
  /**
   * Padding to apply around the arrow element
   */
  padding?: Padding
  /**
   * Reference to the arrow element
   */
  element: Ref<HTMLElement | null>
}

/**
 * Context for arrow elements within floating elements
 */
export interface ArrowContext extends Pick<FloatingContext, "middlewareData" | "placement"> {
  /**
   * Reference to the arrow element
   */
  arrowRef: Ref<HTMLElement | SVGAElement | null>
}

/**
 * Options for the useArrow composable
 */
export interface UseArrowOptions extends Pick<FloatingContext, "middlewareData" | "placement"> {}

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
