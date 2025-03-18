import { MaybeRefOrGetter, toValue } from "vue";
import {
  Boundary,
  Middleware,
  RootBoundary,
  shift as shiftMiddleware,
} from "@floating-ui/dom";

/**
 * Options for the shift middleware
 */
export interface ShiftOptions {
  /**
   * The main axis to shift along
   * @default true
   */
  mainAxis?: MaybeRefOrGetter<boolean>;

  /**
   * The cross axis to shift along
   * @default false
   */
  crossAxis?: MaybeRefOrGetter<boolean>;

  /**
   * Limit shifting to this many pixels
   */
  limiter?: MaybeRefOrGetter<{
    fn: (state: any) => any;
    options?: any;
  }>;

  /**
   * What boundary elements to check
   */
  boundary?: MaybeRefOrGetter<Boundary>;

  /**
   * The root boundary of the floating element
   */
  rootBoundary?: MaybeRefOrGetter<RootBoundary>;

  /**
   * Virtual padding around the boundary
   */
  padding?: MaybeRefOrGetter<number | Partial<Record<string, number>>>;
}

/**
 * Creates a shift middleware that moves the floating element to keep it in view
 * @param options - Options for the shift middleware
 * @returns A middleware to be consumed by useFloating
 * @see https://floating-ui.com/docs/shift
 */
export function shift(options: ShiftOptions = {}): Middleware {
  return {
    name: "shift",
    options,
    fn(args) {
      const {
        mainAxis = true,
        crossAxis = false,
        limiter,
        boundary = "clippingAncestors",
        rootBoundary = "viewport",
        padding = 0,
      } = options;

      return shiftMiddleware({
        mainAxis: toValue(mainAxis),
        crossAxis: toValue(crossAxis),
        limiter: toValue(limiter),
        boundary: toValue(boundary),
        rootBoundary: toValue(rootBoundary),
        padding: toValue(padding),
      }).fn(args);
    },
  };
}
