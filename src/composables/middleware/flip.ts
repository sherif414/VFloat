import {
  type Boundary,
  type Middleware,
  type RootBoundary,
  flip as flipMiddleware,
} from "@floating-ui/dom";
import { type MaybeRefOrGetter, toValue } from "vue";

/**
 * Options for the flip middleware
 */
export interface FlipOptions {
  /**
   * The axis that runs along the alignment of the floating element
   * @default true
   */
  mainAxis?: MaybeRefOrGetter<boolean>;

  /**
   * The axis that runs along the side of the floating element
   * @default true
   */
  crossAxis?: MaybeRefOrGetter<boolean>;

  /**
   * Placements that are allowed when flipping
   */
  fallbackPlacements?: MaybeRefOrGetter<string[]>;

  /**
   * Placements to try sequentially if the preferred placement doesn't fit
   */
  fallbackStrategy?: MaybeRefOrGetter<"bestFit" | "initialPlacement">;

  /**
   * Whether to flip to placements with different alignment
   */
  flipAlignment?: MaybeRefOrGetter<boolean>;

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
 * Creates a flip middleware that changes the placement of the floating element to keep it in view
 * @param options - Options for the flip middleware
 * @returns A middleware to be consumed by useFloating
 * @see https://floating-ui.com/docs/flip
 */
export function flip(options: FlipOptions = {}): Middleware {
  return {
    name: "flip",
    options,
    fn(args) {
      const {
        mainAxis = true,
        crossAxis = true,
        fallbackPlacements,
        fallbackStrategy = "bestFit",
        flipAlignment = true,
        boundary = "clippingAncestors",
        rootBoundary = "viewport",
        padding = 0,
      } = options;

      return flipMiddleware({
        mainAxis: toValue(mainAxis),
        crossAxis: toValue(crossAxis),
        fallbackPlacements: toValue(fallbackPlacements),
        fallbackStrategy: toValue(fallbackStrategy),
        flipAlignment: toValue(flipAlignment),
        boundary: toValue(boundary),
        rootBoundary: toValue(rootBoundary),
        padding: toValue(padding),
      }).fn(args);
    },
  };
}
