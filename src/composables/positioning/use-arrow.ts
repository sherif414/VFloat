import { type ComputedRef, computed, type Ref, toValue, watch } from "vue";
import { getFloatingPosition, getFloatingRefs } from "@/core/floating-accessors";
import { getFloatingInternals } from "@/core/floating-internals";
import { arrow } from "../middlewares";
import type { FloatingContext } from "./use-floating";

export interface UseArrowReturn {
  arrowX: ComputedRef<number>;
  arrowY: ComputedRef<number>;
  arrowStyles: ComputedRef<Record<string, string>>;
}

export interface UseArrowOptions {
  element?: Ref<HTMLElement | null>;
  offset?: string;
}

export function useArrow(
  context: FloatingContext,
  options: UseArrowOptions & { element: Ref<HTMLElement | null> },
): UseArrowReturn;
export function useArrow(
  arrowEl: Ref<HTMLElement | null>,
  context: FloatingContext,
  options?: Omit<UseArrowOptions, "element">,
): UseArrowReturn;
export function useArrow(
  contextOrArrow: FloatingContext | Ref<HTMLElement | null>,
  contextOrOptions?: FloatingContext | UseArrowOptions,
  maybeOptions: Omit<UseArrowOptions, "element"> = {},
): UseArrowReturn {
  const normalized = normalizeArrowArgs(contextOrArrow, contextOrOptions, maybeOptions);
  const { context, arrowEl, options } = normalized;
  const { refs } = context;
  const { middlewareData, placement } = getFloatingPosition(context);
  const { offset = "-4px" } = options;

  watch(
    arrowEl,
    (element) => {
      refs.setArrow(element);
    },
    { immediate: true },
  );

  const internals = getFloatingInternals(context);
  internals?.middlewareRegistry.register(
    computed(() => {
      if (!arrowEl.value) {
        return null;
      }

      return arrow({ element: arrowEl });
    }),
  );

  const arrowX = computed(() => middlewareData.value.arrow?.x ?? 0);
  const arrowY = computed(() => middlewareData.value.arrow?.y ?? 0);

  const arrowStyles = computed(() => {
    const arrowElement = arrowEl.value || refs.arrowEl.value;

    if (!arrowElement || !middlewareData.value.arrow) {
      return {};
    }

    const side = toValue(placement).split("-")[0] as "top" | "bottom" | "left" | "right";

    if (side === "bottom") {
      return {
        "inset-inline-start": `${arrowX.value}px`,
        "inset-block-start": offset,
      };
    }

    if (side === "top") {
      return {
        "inset-inline-start": `${arrowX.value}px`,
        "inset-block-end": offset,
      };
    }

    if (side === "right") {
      return {
        "inset-block-start": `${arrowY.value}px`,
        "inset-inline-start": offset,
      };
    }

    return {
      "inset-block-start": `${arrowY.value}px`,
      "inset-inline-end": offset,
    };
  }) as ComputedRef<Record<string, string>>;

  return {
    arrowX,
    arrowY,
    arrowStyles,
  };
}

function normalizeArrowArgs(
  contextOrArrow: FloatingContext | Ref<HTMLElement | null>,
  contextOrOptions?: FloatingContext | UseArrowOptions,
  maybeOptions: Omit<UseArrowOptions, "element"> = {},
) {
  if (isFloatingContext(contextOrArrow)) {
    const context = contextOrArrow;
    const options = (contextOrOptions ?? {}) as UseArrowOptions;

    if (!options.element) {
      throw new Error(
        "[useArrow] `options.element` is required when calling useArrow(context, options).",
      );
    }

    getFloatingRefs(context);

    return {
      context,
      arrowEl: options.element,
      options,
    };
  }

  const arrowEl = contextOrArrow;
  const context = contextOrOptions as FloatingContext;

  return {
    context,
    arrowEl,
    options: maybeOptions,
  };
}

function isFloatingContext(value: unknown): value is FloatingContext {
  return typeof value === "object" && value !== null && "refs" in value;
}
