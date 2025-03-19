import {
  type Boundary,
  type Middleware,
  type RootBoundary,
  size as sizeMiddleware,
} from "@floating-ui/dom";
import { type MaybeRefOrGetter, toValue } from "vue";

/**
 * Options for the size middleware
 */
export interface SizeOptions {
  /**
   * Whether to apply sizing to the main axis
   */
  apply?: MaybeRefOrGetter<
    (state: {
      availableWidth: number;
      availableHeight: number;
      elements: {
        reference: Element;
        floating: HTMLElement;
      };
      rects: {
        reference: { width: number; height: number };
        floating: { width: number; height: number };
      };
    }) => void
  >;

  /**
   * Whether to apply sizing to the main axis
   * @default true
   */
  mainAxis?: MaybeRefOrGetter<boolean>;

  /**
   * Whether to apply sizing to the cross axis
   * @default true
   */
  crossAxis?: MaybeRefOrGetter<boolean>;

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
 * Creates a size middleware that resizes the floating element
 * @param options - Options for the size middleware
 * @returns A middleware to be consumed by useFloating
 * @see https://floating-ui.com/docs/size
 */
export function size(options: SizeOptions = {}): Middleware {
  return {
    name: "size",
    options,
    fn(args) {
      const {
        apply,
        mainAxis = true,
        crossAxis = true,
        boundary = "clippingAncestors",
        rootBoundary = "viewport",
        padding = 0,
      } = options;

      return sizeMiddleware({
        apply: apply && ((state) => toValue(apply)(state)),
        mainAxis: toValue(mainAxis),
        crossAxis: toValue(crossAxis),
        boundary: toValue(boundary),
        rootBoundary: toValue(rootBoundary),
        padding: toValue(padding),
      }).fn(args);
    },
  };
}
