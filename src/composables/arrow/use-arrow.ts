import type { Padding } from "@floating-ui/dom";
import {
  type ComputedRef,
  computed,
  getCurrentInstance,
  isRef,
  type MaybeRef,
  type MaybeRefOrGetter,
  onMounted,
  onWatcherCleanup,
  toValue,
  watchPostEffect,
} from "vue";
import type { FloatingNode } from "@/composables/floating-node";
import {
  floatingInternals,
  type FloatingInternals,
} from "@/composables/floating-node/use-floating-node";
import { isServer } from "@/shared/env";
import { tryOnScopeDispose } from "@/shared/lifecycle";
import { arrow } from "../middlewares";

const staticSideMap: Record<string, string> = {
  top: "bottom",
  right: "left",
  bottom: "top",
  left: "right",
};

//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * Connects an arrow element to the current floating node and exposes computed coordinates and inline styles.
 *
 * This composable handles arrow registration inside the floating position's middleware registry,
 * computes reactive physical styles (`top`, `bottom`, `left`, `right`) pointing to the anchor,
 * and automatically synchronizes them to the arrow DOM element by default.
 *
 * @param node - The shared floating node.
 * @param options - Configuration options for arrow positioning.
 * @returns An object containing computed coordinates and styles for the arrow.
 *
 * @example Basic usage in `<script setup>`
 * ```vue
 * <script setup lang="ts">
 * import { ref } from "vue";
 * import { useArrow, useFloatingNode, usePosition } from "v-float";
 *
 * const anchorEl = ref<HTMLElement | null>(null);
 * const floatingEl = ref<HTMLElement | null>(null);
 * const arrowEl = ref<HTMLElement | null>(null);
 *
 * const node = useFloatingNode({
 *   anchorEl,
 *   floatingEl,
 *   arrowEl,
 * });
 * usePosition(node, { placement: "top" });
 * useArrow(node);
 * </script>
 *
 * <template>
 *   <button ref="anchorEl">Anchor</button>
 *   <div ref="floatingEl">
 *     Tooltip content
 *     <div ref="arrowEl" style="position: absolute" />
 *   </div>
 * </template>
 * ```
 */
export function useArrow(node: FloatingNode, options: UseArrowOptions = {}): UseArrowReturn {
  const { refs } = node;
  const { arrowEl } = refs;

  // Resolved lazily or on mount in case useArrow is called before usePosition.
  let internals: FloatingInternals | undefined = floatingInternals.get(node.id);
  let unregisterArrow: (() => void) | undefined;

  function registerArrow() {
    if (unregisterArrow || !internals?.middlewareRegistry) return;
    unregisterArrow = internals.middlewareRegistry.register(
      computed(() => {
        if (!arrowEl.value) return null;
        return arrow({ element: arrowEl, padding: toValue(options.padding) });
      }),
    );
  }

  function getInternals(): FloatingInternals | undefined {
    if (!internals) {
      internals = floatingInternals.get(node.id);
      if (internals) {
        registerArrow();
      }
    }
    return internals;
  }

  registerArrow();

  if (getCurrentInstance()) {
    onMounted(() => {
      if (!internals) {
        getInternals();
      }
    });
  }

  tryOnScopeDispose(() => {
    unregisterArrow?.();
  });

  const arrowX = computed(() => getInternals()?.middlewareData?.value.arrow?.x ?? 0);
  const arrowY = computed(() => getInternals()?.middlewareData?.value.arrow?.y ?? 0);

  const arrowStyles = computed<Record<string, string>>(() => {
    const activeInternals = getInternals();
    if (!arrowEl.value || !activeInternals?.middlewareData?.value.arrow) {
      return {};
    }

    const offset = toValue(options.offset ?? "-4px");

    // The arrow is positioned on the opposite side of the resolved placement.
    const placement = activeInternals.placement ? toValue(activeInternals.placement) : "bottom";
    const side = placement.split("-")[0] as "top" | "bottom" | "left" | "right";
    const staticSide = staticSideMap[side];

    const styles: Record<string, string> =
      side === "top" || side === "bottom"
        ? {
            left: `${arrowX.value}px`,
            [staticSide]: offset,
          }
        : {
            top: `${arrowY.value}px`,
            [staticSide]: offset,
          };

    return styles;
  });

  // --- DOM Style Synchronization --------------------------------------------

  let lastEl: HTMLElement | null = null;
  let appliedKeys: string[] = [];

  watchPostEffect(() => {
    if (isServer) return;

    const el = arrowEl.value;
    const rawApplyStyles = options.applyStyles;
    const applyOption = isRef(rawApplyStyles)
      ? (rawApplyStyles.value ?? true)
      : (rawApplyStyles ?? true);

    // Clean up previous element if element changed or applyStyles turned off
    if (lastEl && (lastEl !== el || !applyOption)) {
      for (const key of appliedKeys) {
        lastEl.style.removeProperty(key);
      }
      appliedKeys = [];
    }

    lastEl = el;

    if (!el || !applyOption) return;

    const currentStyles = arrowStyles.value;

    if (typeof applyOption === "function") {
      const cleanup = applyOption(el, currentStyles);
      if (typeof cleanup === "function") {
        onWatcherCleanup(cleanup);
      }
      return;
    }

    // Remove any stale properties from previous runs or properties whose new value is nullish
    for (const key of appliedKeys) {
      const val = currentStyles[key];
      if (!(key in currentStyles) || val == null) {
        el.style.removeProperty(key);
      }
    }

    // Apply new/updated styles in-place and track non-null keys
    const nextAppliedKeys: string[] = [];
    for (const [key, val] of Object.entries(currentStyles)) {
      if (val != null) {
        el.style.setProperty(key, String(val));
        nextAppliedKeys.push(key);
      }
    }

    appliedKeys = nextAppliedKeys;
  });

  tryOnScopeDispose(() => {
    if (lastEl && appliedKeys.length > 0) {
      for (const key of appliedKeys) {
        lastEl.style.removeProperty(key);
      }
      appliedKeys = [];
    }
  });

  return {
    arrowX,
    arrowY,
    arrowStyles,
  };
}

//=======================================================================================
// 📌 Types
//=======================================================================================

/**
 * Context required by `useArrow`.
 */
export type UseArrowContext = FloatingNode;

/**
 * Custom style applicator function to override automatic arrow styling.
 *
 * Receives the target arrow HTMLElement and the resolved positioning styles.
 * Can optionally return a cleanup function that runs before the next update or on unmount.
 */
export type ApplyArrowStylesFn = (
  element: HTMLElement,
  styles: Record<string, string>,
) => void | (() => void);

/**
 * Computed arrow coordinates and styles returned by `useArrow()`.
 */
export interface UseArrowReturn {
  /**
   * The computed horizontal coordinate of the arrow relative to the floating element.
   */
  arrowX: ComputedRef<number>;

  /**
   * The computed vertical coordinate of the arrow relative to the floating element.
   */
  arrowY: ComputedRef<number>;

  /**
   * Computed CSS inline styles (`top`, `bottom`, `left`, `right`) to apply to the arrow element.
   * Based on the active placement, coordinates are positioned on the matching edge.
   */
  arrowStyles: ComputedRef<Record<string, string>>;
}

/**
 * Options for positioning the node-owned arrow element.
 */
export interface UseArrowOptions {
  /**
   * Offset applied to the static side of the arrow (e.g. overlapping borders).
   * @default "-4px"
   */
  offset?: MaybeRefOrGetter<string>;

  /**
   * The padding in pixels between the arrow element and the floating element edges
   * to prevent the arrow from overflowing rounded corners.
   */
  padding?: MaybeRefOrGetter<Padding>;

  /**
   * Controls whether arrow positioning styles are automatically applied to the arrow element.
   * - `true` (default): Automatically synchronizes computed styles to `node.refs.arrowEl.value.style`.
   * - `false`: Disables automatic style application, allowing manual template `:style="arrowStyles"` binding.
   * - Function: A custom applicator callback `(element, styles) => void | (() => void)` to override how styles are applied.
   * @default true
   */
  applyStyles?: MaybeRef<boolean | undefined> | ApplyArrowStylesFn;
}
