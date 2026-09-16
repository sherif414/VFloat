import { type MaybeRefOrGetter, toValue } from "vue";
import { useComposition } from "./composition-state";
import type { FloatingNode } from "@/composables/floating-node";
import {
  isTargetInOtherActiveHierarchy,
  registerActiveFloatingNode,
} from "@/composables/floating-node/active-nodes";
import { getDocument } from "@/shared/env";
import { tryOnScopeDispose } from "@/shared/lifecycle";
import { useEventListener } from "@/shared/use-event-listener";

//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * A composable to handle the escape key press with composition event handling.
 *
 * When triggered, it will close the floating element by setting open to false.
 *
 * @internal Consumed by `useDismiss`. Use `useDismiss(node, { escapeKey })` instead.
 *
 * @param node - The floating node with open state and change handler.
 * @param options - {@link UseEscapeKeyOptions}
 *
 * @example Basic usage
 * ```ts
 * const node = useFloatingNode(...)
 * useDismiss(node) // Closes the floating element on escape
 * ```
 *
 * @example Custom handler
 * ```ts
 * useDismiss(node, {
 *   escapeKey: {
 *     onEscape: (event) => {
 *       if (hasUnsavedChanges.value) {
 *         showConfirmDialog.value = true
 *       } else {
 *         node.open.value = false
 *       }
 *     },
 *   },
 * })
 * ```
 */
export function useEscapeKey(node: FloatingNode, options: UseEscapeKeyOptions = {}): void {
  const {
    enabled = true,
    capture = false,
    preventDefault = false,
    onEscape,
    ignoreEscapeKey,
  } = options;
  const { isComposing } = useComposition();
  const { open } = node;

  if (typeof window !== "undefined") {
    const unregister = registerActiveFloatingNode(node);
    tryOnScopeDispose(unregister);
  }

  const handleEscape = (event: KeyboardEvent) => {
    if (
      event.key !== "Escape" ||
      event.defaultPrevented ||
      !toValue(enabled) ||
      !open.value ||
      isComposing.value
    ) {
      return;
    }

    if (ignoreEscapeKey && ignoreEscapeKey(event)) {
      return;
    }

    // Leaf-first protocol:
    // 1. Ancestor nodes with open children NEVER consume Escape:
    //    they allow the event to pass through to the open leaf.
    const hasOpenChildren =
      node.children?.value && Array.from(node.children.value).some((child) => child.open.value);
    if (hasOpenChildren) {
      return;
    }

    // 2. Resolve root of this composite hierarchy
    let root: FloatingNode = node;
    while (root.parent?.value) {
      root = root.parent.value;
    }

    const target = event.target as Node | null;
    const isTargetWithinRoot =
      typeof (root as FloatingNode).contains === "function" &&
      target !== null &&
      (root as FloatingNode).contains(target);

    if (isTargetWithinRoot && target !== null) {
      // Event happened within this composite hierarchy.
      // Find the most specific node containing the target and resolve its deepest leaf.
      const targetOwner = findTargetOwner(root, target);
      const activeLeaf = findDeepestOpenDescendant(targetOwner) ?? targetOwner;

      if (activeLeaf && activeLeaf.id !== node.id && activeLeaf.open.value) {
        return;
      }
    } else {
      // Event target is outside this hierarchy.
      // If the target is inside another open floating hierarchy (e.g. an independent tree),
      // do not steal the escape event from that hierarchy.
      if (isTargetInOtherActiveHierarchy(node, target)) {
        return;
      }

      // Event target is outside or not spatially resolved (e.g. document body, external page element, or headless tests):
      // Resolve topologically using deepest open descendant of root.
      const deepest = findDeepestOpenDescendant(root);
      if (deepest && deepest.id !== node.id) {
        return;
      }
    }

    if (preventDefault) {
      event.preventDefault();
    }

    // Skip the default close behavior when the caller needs custom escape handling.
    if (onEscape) {
      onEscape(event);
      return;
    }

    event.stopPropagation();
    event.stopImmediatePropagation();
    node.open.value = false;
  };

  // Event listener setup
  useEventListener(() => getDocument(), "keydown", handleEscape, capture);
}

//=======================================================================================
// 📌 Helpers
//=======================================================================================

function findDeepestOpenDescendant(root: FloatingNode): FloatingNode | null {
  if (!root.open.value) return null;

  let deepest: FloatingNode = root;
  let maxDepth = 0;

  if (typeof root.traverse === "function") {
    root.traverse((current, depth) => {
      if (!current.open.value) return "skip";
      if (depth >= maxDepth) {
        maxDepth = depth;
        deepest = current;
      }
    });
  }

  return deepest;
}

function findTargetOwner(current: FloatingNode, targetNode: Node): FloatingNode {
  if (current.children?.value) {
    for (const child of Array.from(current.children.value)) {
      if (child.open.value && typeof child.contains === "function" && child.contains(targetNode)) {
        return findTargetOwner(child, targetNode);
      }
    }
  }
  return current;
}

//=======================================================================================
// 📌 Types
//=======================================================================================

/**
 * Context required by `useEscapeKey`.
 */
export type UseEscapeKeyContext = FloatingNode;

export interface UseEscapeKeyOptions {
  /**
   * Condition to enable the escape key listener.
   * @default true
   */
  enabled?: MaybeRefOrGetter<boolean>;

  /**
   * Whether to use capture phase for document event listeners.
   * @default false
   */
  capture?: boolean;

  /**
   * Whether to call preventDefault on the escape key event before handling it.
   * @default false
   */
  preventDefault?: boolean;

  /**
   * Custom callback function to be executed when the escape key is pressed.
   * When provided, overrides default behavior.
   */
  onEscape?: (event: KeyboardEvent) => void;

  /**
   * Predicate to determine if an escape key press should be ignored (e.g. to let a child handle it).
   * @param event - The keyboard event
   * @returns true if the escape key should be ignored
   */
  ignoreEscapeKey?: (event: KeyboardEvent) => boolean;
}
