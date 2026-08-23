import { computed, type ComputedRef, type MaybeRefOrGetter, ref, toValue } from "vue";
import { getDocument } from "@/shared/env";
import { tryOnScopeDispose } from "@/shared/lifecycle";

//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * Internal utility to detect whether an element is in a Right-to-Left (RTL) reading layout.
 *
 * @param target - A DOM element, or reactive ref/getter resolving to an Element.
 * @param options - Configuration options for overrides.
 * @returns A computed boolean ref representing the active RTL state.
 *
 * @internal
 */
export function useRtl(target?: UseRtlTarget, options: UseRtlOptions = {}): ComputedRef<boolean> {
  const { rtl: rtlOption } = options;

  if (rtlOption !== undefined) {
    return computed(() => toValue(rtlOption));
  }

  const doc = getDocument();
  if (!doc) {
    return computed(() => false);
  }

  const root = doc.documentElement ?? doc.body;
  const domRevision = ref(0);

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "attributes" && mutation.attributeName === "dir") {
        domRevision.value++;
        break;
      }
    }
  });

  if (root && typeof MutationObserver !== "undefined") {
    observer.observe(root, {
      attributes: true,
      attributeFilter: ["dir"],
      subtree: true,
    });
  }

  tryOnScopeDispose(() => observer.disconnect());

  return computed(() => {
    void domRevision.value;
    return resolveRTL(toValue(target) ?? null, doc);
  });
}

//=======================================================================================
// 📌 Helpers
//=======================================================================================

/**
 * Fast-path check for RTL using DOM attributes.
 */
export function resolveRTL(element: Element | null, doc: Document): boolean {
  // 1. Element-level closest [dir] check (O(depth) attribute lookup, zero layout thrashing)
  if (element && typeof element.closest === "function") {
    const dirElement = element.closest("[dir]");
    if (dirElement) {
      const dirAttr = dirElement.getAttribute("dir")?.toLowerCase();
      if (dirAttr === "rtl") return true;
      if (dirAttr === "ltr") return false;
    }
  }

  // 2. Document-level dir check (W3C/ARIA recommends direction on documentElement)
  const docDir = (doc.documentElement?.getAttribute("dir") || doc.dir || "ltr").toLowerCase();

  return docDir === "rtl";
}

//=======================================================================================
// 📌 Types
//=======================================================================================

export type UseRtlTarget = MaybeRefOrGetter<Element | null | undefined>;

export interface UseRtlOptions {
  /**
   * Explicit RTL override.
   * When supplied, this takes precedence over DOM inspection.
   */
  rtl?: MaybeRefOrGetter<boolean>;
}
