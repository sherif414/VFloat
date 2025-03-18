import {
  MaybeRefOrGetter,
  Ref,
  computed,
  onMounted,
  onScopeDispose,
  toValue,
} from "vue";
import type { UseFloatingReturn } from "../use-floating";

export interface UseDismissOptions {
  /**
   * Whether dismiss event listeners are enabled
   * @default true
   */
  enabled?: MaybeRefOrGetter<boolean>;

  /**
   * Whether to dismiss when the escape key is pressed
   * @default true
   */
  escapeKey?: MaybeRefOrGetter<boolean>;

  /**
   * Whether to dismiss when the reference element is pressed
   * @default false
   */
  referencePress?: MaybeRefOrGetter<boolean>;

  /**
   * Whether to dismiss when clicking outside the floating element
   * @default true
   */
  outsidePress?: MaybeRefOrGetter<boolean | ((event: MouseEvent) => boolean)>;

  /**
   * Whether to dismiss when scrolling outside the floating element
   * @default false
   */
  ancestorScroll?: MaybeRefOrGetter<boolean>;

  /**
   * Whether click events should bubble
   */
  bubbles?: MaybeRefOrGetter<boolean>;

  /**
   * Whether to use capture phase for document event listeners
   * @default true
   */
  capture?: MaybeRefOrGetter<boolean>;

  /**
   * The event name to use for reference press
   * @default 'pointerdown'
   */
  referencePressEvent?: MaybeRefOrGetter<"pointerdown" | "mousedown" | "click">;

  /**
   * The event name to use for outside press
   * @default 'pointerdown'
   */
  outsidePressEvent?: MaybeRefOrGetter<"pointerdown" | "mousedown" | "click">;
}

export interface UseDismissReturn {
  /**
   * Reference element props related to dismissal
   */
  getReferenceProps: () => Record<string, (event: any) => void>;

  /**
   * Floating element props related to dismissal
   */
  getFloatingProps: () => Record<string, (event: any) => void>;
}

/**
 * Enables dismissing the floating element
 */
export function useDismiss(
  context: UseFloatingReturn & {
    open: Ref<boolean>;
    onOpenChange: (open: boolean) => void;
  },
  options: UseDismissOptions = {}
): UseDismissReturn {
  const {
    open,
    onOpenChange,
    elements: { reference, floating },
    refs,
  } = context;

  const {
    enabled = true,
    escapeKey = true,
    outsidePress = true,
    referencePress = false,
    ancestorScroll = false,
    bubbles,
    capture = true,
    referencePressEvent = "pointerdown",
    outsidePressEvent = "pointerdown",
  } = options;

  const isEnabled = computed(() => toValue(enabled));

  // Event handlers
  const closeOnEscapeKeyDown = (event: KeyboardEvent) => {
    if (!isEnabled.value || !toValue(escapeKey) || !open.value) return;

    if (event.key === "Escape") {
      event.preventDefault();
      onOpenChange(false);
    }
  };

  const closeOnPressOutside = (event: MouseEvent) => {
    if (
      !isEnabled.value ||
      !toValue(outsidePress) ||
      !open.value ||
      !floating ||
      !reference
    )
      return;

    const target = event.target as Node | null;

    if (target && floating.contains(target)) {
      return;
    }

    const outsidePressValue = toValue(outsidePress);

    if (typeof outsidePressValue === "function" && !outsidePressValue(event)) {
      return;
    }

    // Check for potential bubbling
    if (reference.contains(target)) {
      return;
    }

    const bubbling = toValue(bubbles);
    if (bubbling === false) {
      event.stopPropagation();
    }

    onOpenChange(false);
  };

  const closeOnReferencePress = (event: MouseEvent) => {
    if (!isEnabled.value || !toValue(referencePress) || !open.value) return;

    onOpenChange(false);
  };

  const closeOnScroll = () => {
    if (!isEnabled.value || !toValue(ancestorScroll) || !open.value) return;

    onOpenChange(false);
  };

  // Setup document event listeners
  let cleanup: (() => void) | undefined;

  const addDocumentEvents = () => {
    if (!isEnabled.value || !floating) return;

    const doc = floating.ownerDocument;
    const captureValue = toValue(capture);

    doc.addEventListener("keydown", closeOnEscapeKeyDown);
    doc.addEventListener(toValue(outsidePressEvent), closeOnPressOutside, {
      capture: captureValue,
    });

    if (toValue(ancestorScroll)) {
      scrollAncestors(floating).forEach((ancestor) => {
        ancestor.addEventListener("scroll", closeOnScroll, { passive: true });
      });

      if (reference) {
        scrollAncestors(reference).forEach((ancestor) => {
          ancestor.addEventListener("scroll", closeOnScroll, { passive: true });
        });
      }
    }

    return () => {
      doc.removeEventListener("keydown", closeOnEscapeKeyDown);
      doc.removeEventListener(toValue(outsidePressEvent), closeOnPressOutside, {
        capture: captureValue,
      });

      if (toValue(ancestorScroll)) {
        if (floating) {
          scrollAncestors(floating).forEach((ancestor) => {
            ancestor.removeEventListener("scroll", closeOnScroll);
          });
        }

        if (reference) {
          scrollAncestors(reference).forEach((ancestor) => {
            ancestor.removeEventListener("scroll", closeOnScroll);
          });
        }
      }
    };
  };

  onMounted(() => {
    cleanup = addDocumentEvents();
  });

  onScopeDispose(() => {
    cleanup?.();
  });

  return {
    getReferenceProps: () => {
      const refPressEvent = toValue(referencePressEvent);

      return {
        [refPressEvent === "pointerdown"
          ? "onPointerdown"
          : refPressEvent === "mousedown"
          ? "onMousedown"
          : "onClick"]: closeOnReferencePress,
      };
    },
    getFloatingProps: () => ({}),
  };
}

// Utility function to get all scroll ancestors
function scrollAncestors(element: Element): Element[] {
  const result: Element[] = [];

  function getScrollParent(node: Node | null): Element | null {
    if (!node || node === document.body) return document.body;

    if (node.nodeType === 1) {
      const el = node as Element;
      const { overflow, overflowX, overflowY } = window.getComputedStyle(el);
      if (/auto|scroll|overlay/.test(overflow + overflowY + overflowX)) {
        return el;
      }
    }

    return getScrollParent(node.parentNode);
  }

  let parent = getScrollParent(element);
  while (parent && parent !== document.body) {
    result.push(parent);
    parent = getScrollParent(parent.parentNode);
  }

  // Always add window
  result.push(window as unknown as Element);

  return result;
}
