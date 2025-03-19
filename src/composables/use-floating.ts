import { getDPR, roundByDPR } from "@/utils";
import type {
  Middleware,
  MiddlewareData,
  MiddlewareState,
  Padding,
  Placement,
  Strategy,
  VirtualElement,
} from "@floating-ui/dom";
import {
  arrow,
  computePosition,
  flip,
  autoUpdate as floatingUIAutoUpdate,
  offset,
  shift,
  size,
} from "@floating-ui/dom";
import type { ComputedRef, MaybeRefOrGetter, Ref, StyleValue } from "vue";
import { computed, onScopeDispose, ref, shallowRef, toRef, toValue, watch } from "vue";

export interface FloatingStyles {
  position: Strategy;
  top: string;
  left: string;
  transform?: string;
  "will-change"?: "transform";
}

export interface Elements {
  reference?: MaybeRefOrGetter<HTMLElement | VirtualElement | null>;
  floating?: MaybeRefOrGetter<HTMLElement | null>;
}

export interface UseFloatingOptions {
  /**
   * Where to place the floating element relative to its reference element.
   * @default 'bottom'
   */
  placement?: MaybeRefOrGetter<Placement | undefined>;

  /**
   * The type of CSS positioning to use.
   * @default 'absolute'
   */
  strategy?: MaybeRefOrGetter<Strategy | undefined>;

  /**
   * Whether to use CSS transform instead of top/left positioning
   * @default true
   */
  transform?: MaybeRefOrGetter<boolean | undefined>;

  /**
   * These are plain objects that modify the positioning coordinates in some fashion, or provide useful data for the consumer to use.
   */
  middleware?: MaybeRefOrGetter<Middleware[]>;

  /**
   * Object containing the reference and floating elements
   */
  elements?: Elements;

  /**
   * Function called when both the reference and floating elements are mounted
   */
  whileElementsMounted?: (
    reference: Element | VirtualElement,
    floating: HTMLElement,
    update: () => void
  ) => void | (() => void);

  /**
   * Whether the floating element is open
   * @default false
   */
  open?: MaybeRefOrGetter<boolean>;

  /**
   * Function called when the open state changes
   */
  onOpenChange?: (open: boolean) => void;
}

export interface UseFloatingReturn {
  /** The x-coordinate of the floating element */
  x: Readonly<Ref<number>>;

  /** The y-coordinate of the floating element */
  y: Readonly<Ref<number>>;

  /** The strategy used for positioning */
  strategy: Readonly<Ref<Strategy>>;

  /** The placement of the floating element */
  placement: Readonly<Ref<Placement>>;

  /** Data from middleware for additional customization */
  middlewareData: Readonly<Ref<MiddlewareData>>;

  /** Whether the floating element has been positioned */
  isPositioned: Readonly<Ref<boolean>>;

  /** Computed styles to apply to the floating element */
  floatingStyles: ComputedRef<Record<string, any>>;

  /** Function to manually update the position */
  update: () => void;

  /** The refs object containing reference to reference and floating elements */
  refs: {
    reference: Ref<Element | VirtualElement | null>;
    floating: Ref<HTMLElement | null>;
  };

  /** The current elements if they exist */
  elements: {
    reference: Element | VirtualElement | null;
    floating: HTMLElement | null;
  };

  /** Whether the floating element is open */
  open: Readonly<Ref<boolean>>;

  /** Function to update the open state */
  onOpenChange: (open: boolean) => void;
}

export function useFloating(options: UseFloatingOptions = {}): UseFloatingReturn {
  const {
    placement: initialPlacement = "bottom",
    strategy: initialStrategy = "absolute",
    transform = true,
    middleware: middlewareOption = [],
    whileElementsMounted,
    open: controlledOpen,
    onOpenChange,
    elements: elementsOption,
  } = options;

  // Element refs
  const referenceRef = ref<Element | VirtualElement | null>(null);
  const floatingRef = ref<HTMLElement | null>(null);

  // Get elements from options if provided
  if (elementsOption?.reference) {
    watch(
      () => toValue(elementsOption.reference),
      (el) => {
        if (el) referenceRef.value = el;
      },
      { immediate: true }
    );
  }

  if (elementsOption?.floating) {
    watch(
      () => toValue(elementsOption.floating),
      (el) => {
        if (el) floatingRef.value = el;
      },
      { immediate: true }
    );
  }

  // Position state
  const x = ref(0);
  const y = ref(0);
  const strategy = ref(toValue(initialStrategy) as Strategy);
  const placement = ref(toValue(initialPlacement) as Placement);
  const middlewareData = shallowRef<MiddlewareData>({});
  const isPositioned = ref(false);

  // Open state handling
  const internalOpen = ref(toValue(controlledOpen) ?? false);
  const open = controlledOpen ? toRef(controlledOpen) : internalOpen;

  // Update function
  const update = async () => {
    if (!referenceRef.value || !floatingRef.value) return;

    const result = await computePosition(referenceRef.value, floatingRef.value, {
      placement: toValue(initialPlacement),
      strategy: toValue(initialStrategy),
      middleware: toValue(middlewareOption),
    });

    x.value = result.x;
    y.value = result.y;
    placement.value = result.placement;
    strategy.value = result.strategy;
    middlewareData.value = result.middlewareData;
    isPositioned.value = true;
  };

  // Watch for changes that should trigger an update
  watch(
    [
      () => toValue(initialPlacement),
      () => toValue(initialStrategy),
      () => toValue(middlewareOption),
    ],
    update,
    { deep: true }
  );

  // Auto-update when both elements are mounted and open
  let cleanup: (() => void) | undefined;

  watch(
    [referenceRef, floatingRef, open],
    ([reference, floating, isOpen]) => {
      cleanup?.();
      cleanup = undefined;

      if (!isOpen || !reference || !floating) return;

      if (whileElementsMounted) {
        const cleanupFn = whileElementsMounted(reference, floating, update);
        // Only assign if the returned value is a function
        if (typeof cleanupFn === "function") {
          cleanup = cleanupFn;
        }
      } else {
        cleanup = floatingUIAutoUpdate(reference, floating, update);
      }
    },
    { immediate: true }
  );

  // Cleanup on scope dispose
  onScopeDispose(() => cleanup?.());

  // Reset isPositioned when closed
  watch(open, (isOpen) => {
    if (!isOpen) {
      isPositioned.value = false;
    }
  });

  // Handle controlled open state
  const handleOpenChange = (value: boolean) => {
    if (onOpenChange) {
      onOpenChange(value);
    } else {
      internalOpen.value = value;
    }
  };

  // Computed floating styles
  const floatingStyles = computed(() => {
    const initialStyles = {
      position: strategy.value,
      left: "0",
      top: "0",
    };

    if (!isPositioned.value || !floatingRef.value) {
      return initialStyles;
    }

    if (transform) {
      const xVal = roundByDPR(floatingRef.value, x.value);
      const yVal = roundByDPR(floatingRef.value, y.value);

      return {
        ...initialStyles,
        transform: `translate(${xVal}px, ${yVal}px)`,
        ...(getDPR(floatingRef.value) >= 1.5 && {
          willChange: "transform",
        }),
      };
    }

    return {
      ...initialStyles,
      left: `${x.value}px`,
      top: `${y.value}px`,
    };
  });

  return {
    x,
    y,
    strategy,
    placement,
    middlewareData,
    isPositioned,
    floatingStyles,
    update,
    refs: {
      reference: referenceRef,
      floating: floatingRef,
    },
    elements: {
      get reference() {
        return referenceRef.value;
      },
      get floating() {
        return floatingRef.value;
      },
    },
    open,
    onOpenChange: handleOpenChange,
  };
}

// ----------------------------------------------------------------------------------------------------
// 📌 arrow
// ----------------------------------------------------------------------------------------------------

export interface ArrowOptions {
  element: MaybeRefOrGetter<HTMLElement | null>;
  padding?: Padding;
}

/**
 * Creates an arrow middleware to position an arrow element
 * @param options Options for the arrow middleware
 * @see https://floating-ui.com/docs/arrow
 */
export function arrowMiddleware(options: ArrowOptions) {
  const { element, padding } = options;

  return arrow({
    element: toValue(element),
    padding,
  });
}

/**
 * Auto-update function to use with `whileElementsMounted` option
 */
export function autoUpdate(
  reference: Element | VirtualElement,
  floating: HTMLElement,
  update: () => void,
  options = {}
) {
  return floatingUIAutoUpdate(reference, floating, update, options);
}
