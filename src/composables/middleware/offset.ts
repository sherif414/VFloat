import { MaybeRefOrGetter, toValue } from "vue";
import { Middleware, offset as offsetMiddleware } from "@floating-ui/dom";

/**
 * Options for the offset middleware
 */
export type OffsetOptions =
  | MaybeRefOrGetter<number>
  | MaybeRefOrGetter<{
      mainAxis?: number;
      crossAxis?: number;
      alignmentAxis?: number | null;
    }>;

/**
 * Creates an offset middleware that displaces the floating element from its reference element
 * @param options - Options for the offset middleware
 * @returns A middleware to be consumed by useFloating
 * @see https://floating-ui.com/docs/offset
 */
export function offset(options: OffsetOptions = 0): Middleware {
  return {
    name: "offset",
    options,
    fn(args) {
      const resolvedOptions = toValue(options);

      return offsetMiddleware(
        typeof resolvedOptions === "number"
          ? resolvedOptions
          : {
              mainAxis: resolvedOptions.mainAxis ?? 0,
              crossAxis: resolvedOptions.crossAxis ?? 0,
              alignmentAxis: resolvedOptions.alignmentAxis ?? null,
            }
      ).fn(args);
    },
  };
}
