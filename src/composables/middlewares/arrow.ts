import type { Middleware, Padding } from "@floating-ui/dom";
import { arrow as FloatingUIArrow } from "@floating-ui/dom";
import { type Ref, toValue } from "vue";

/**
 * Configures the arrow middleware used to position an inner element against the anchor.
 */
export interface ArrowMiddlewareOptions {
  /**
   * Padding to keep around the arrow when Floating UI measures the reference edge.
   */
  padding?: Padding;

  /**
   * Arrow element to measure and position.
   */
  element: Ref<HTMLElement | null>;
}

/**
 * Returns the Floating UI arrow middleware for the provided arrow element.
 */
export function arrow(options: ArrowMiddlewareOptions): Middleware {
  return {
    name: "arrow",
    options,
    fn(args) {
      const element = toValue(options.element);

      if (element == null) {
        return {};
      }

      return FloatingUIArrow({ element, padding: options.padding }).fn(args);
    },
  };
}
