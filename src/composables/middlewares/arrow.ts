import type { Middleware, Padding } from "@floating-ui/dom"
import { arrow as FloatingUIArrow } from "@floating-ui/dom"
import { type Ref, toValue } from "vue"

//=======================================================================================
// 📌 Types & Interfaces
//=======================================================================================

/**
 * Options for configuring arrow positioning within floating elements
 */
export interface ArrowMiddlewareOptions {
  /**
   * Padding to apply around the arrow element
   */
  padding?: Padding

  /**
   * Reference to the arrow element
   */
  element: Ref<HTMLElement | null>
}

//=======================================================================================
// 📌 Main Logic / Primary Export(s)
//=======================================================================================

/**
 * Positions an inner element of the floating element such that it is centered to the anchor element.
 *
 * This middleware is used to position arrow elements within floating elements.
 *
 * @param options - The arrow options including padding and element reference
 * @returns A middleware function for arrow positioning
 */
export function arrow(options: ArrowMiddlewareOptions): Middleware {
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
