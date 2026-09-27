import { computed, type MaybeRefOrGetter, toValue, watchEffect } from "vue";
import type { FloatingNode } from "@/composables/floating-node";
import { useComposition } from "@/shared/composition-state";
import { getEventTarget, isNode } from "@/shared/dom";
import { getAnchorElement } from "@/shared/elements";
import { getDocument } from "@/shared/env";

interface EscapeEntry {
  node: FloatingNode;
  doc: Document;
  options: UseEscapeKeyOptions;
  isImeComposing: (event?: KeyboardEvent | null) => boolean;
}

interface DocumentListeners {
  captureListener: ((event: KeyboardEvent) => void) | null;
  bubbleListener: ((event: KeyboardEvent) => void) | null;
}

const handledEscapeEvents = new WeakSet<KeyboardEvent>();
const escapeStack: EscapeEntry[] = [];
const documentListeners = new WeakMap<Document, DocumentListeners>();

//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * Closes a floating node when the user presses the Escape key.
 *
 * Coordinates across nested tree hierarchies (leaf-first unwinding), stacked
 * independent overlays (LIFO order), and ignores Escape during IME text composition.
 *
 * @param node - The floating node with open state and element refs.
 * @param options - Configuration options for Escape key dismissal.
 *
 * @example Basic usage
 * ```ts
 * const node = useFloatingNode({ anchorEl, floatingEl });
 * useEscapeKey(node);
 * ```
 *
 * @example Custom handler
 * ```ts
 * useEscapeKey(node, {
 *   onEscape: (event) => {
 *     if (hasUnsavedChanges.value) {
 *       showConfirmDialog.value = true;
 *     } else {
 *       node.open.value = false;
 *     }
 *   },
 * });
 * ```
 */
export function useEscapeKey(node: FloatingNode, options: UseEscapeKeyOptions = {}): void {
  const isImeComposing = useComposition();

  const isEnabled = computed(() => toValue(options.enabled) ?? true);
  const ownerDoc = computed(
    () =>
      node.refs.floatingEl.value?.ownerDocument ??
      getAnchorElement(node.refs.anchorEl.value)?.ownerDocument ??
      getDocument(),
  );

  watchEffect(
    (onCleanup) => {
      const doc = ownerDoc.value;
      if (!isEnabled.value || !node.open.value || !doc) return;

      const entry: EscapeEntry = { node, doc, options, isImeComposing };
      pushEscapeEntry(entry);
      onCleanup(() => removeEscapeEntry(entry));
    },
    { flush: "sync" },
  );
}

// --- Document Listener & Stack Coordination ----------------------------------

function syncDocumentListeners(doc: Document): void {
  let listeners = documentListeners.get(doc);

  for (const capture of [true, false]) {
    const key = capture ? "captureListener" : "bubbleListener";
    const needed = escapeStack.some(
      (entry) => entry.doc === doc && Boolean(entry.options.capture) === capture,
    );

    if (needed && !listeners?.[key]) {
      if (!listeners) {
        listeners = { captureListener: null, bubbleListener: null };
        documentListeners.set(doc, listeners);
      }
      const listener = (event: KeyboardEvent) => {
        dispatchEscape(doc, event, capture ? "capture" : "bubble");
      };
      listeners[key] = listener;
      doc.addEventListener("keydown", listener, capture);
    } else if (!needed && listeners?.[key]) {
      doc.removeEventListener("keydown", listeners[key], capture);
      listeners[key] = null;
    }
  }

  if (listeners && !listeners.captureListener && !listeners.bubbleListener) {
    documentListeners.delete(doc);
  }
}

function removeEntryFromStack(node: FloatingNode): void {
  const index = escapeStack.findIndex((e) => e.node.id === node.id);
  if (index !== -1) {
    escapeStack.splice(index, 1);
  }
}

function pushEscapeEntry(entry: EscapeEntry): void {
  removeEntryFromStack(entry.node);
  escapeStack.push(entry);
  syncDocumentListeners(entry.doc);
}

function removeEscapeEntry(entry: EscapeEntry): void {
  removeEntryFromStack(entry.node);
  syncDocumentListeners(entry.doc);
}

function dispatchEscape(doc: Document, event: KeyboardEvent, phase: "capture" | "bubble"): void {
  if (event.key !== "Escape" || event.defaultPrevented || handledEscapeEvents.has(event)) {
    return;
  }

  const activeEntry = resolveActiveEscapeEntry(getEventTarget(event));
  if (!activeEntry || activeEntry.isImeComposing(event)) return;

  const isCapture = Boolean(activeEntry.options.capture);
  if ((phase === "capture") !== isCapture) {
    return;
  }

  handledEscapeEvents.add(event);

  const { options, node } = activeEntry;

  if (options.preventDefault) {
    event.preventDefault();
  }

  // Once an entry claims the event it is fully consumed: stop propagation for both
  // the default close path and custom onEscape handlers so the keypress never leaks
  // to outer UI (native <dialog>, route-level key handlers, etc.).
  event.stopImmediatePropagation();

  if (options.onEscape) {
    options.onEscape(event);
    return;
  }

  node.open.value = false;
}

function resolveActiveEscapeEntry(target: EventTarget | null): EscapeEntry | null {
  if (escapeStack.length === 0) return null;

  const targetNode = isNode(target) ? target : null;

  if (targetNode) {
    for (let i = escapeStack.length - 1; i >= 0; i--) {
      let root = escapeStack[i].node;
      while (root.parent?.value) {
        root = root.parent.value;
      }

      if (root.contains(targetNode)) {
        const owner = findTargetOwner(root, targetNode);
        const entry = resolveEntryForTree(owner);
        if (entry) return entry;
      }
    }
  }

  for (let i = escapeStack.length - 1; i >= 0; i--) {
    const candidate = escapeStack[i].node;
    if (candidate.open.value) {
      const entry = resolveEntryForTree(candidate);
      if (entry) return entry;
    }
  }

  return null;
}

function resolveEntryForTree(node: FloatingNode): EscapeEntry | null {
  return findEntryForNode(findDeepestOpenDescendant(node));
}

function findEntryForNode(startNode: FloatingNode): EscapeEntry | null {
  let curr: FloatingNode | null = startNode;
  while (curr) {
    const nodeId = curr.id;
    const entry = escapeStack.findLast((e) => e.node.id === nodeId);
    if (entry) return entry;
    curr = curr.parent?.value ?? null;
  }
  return null;
}

//=======================================================================================
// 📌 Helpers
//=======================================================================================

/**
 * Finds the deepest open descendant in a floating node subtree.
 *
 * Traverses top-down. If multiple nodes share the maximum depth, ties are broken
 * in favor of the more recently opened node on the runtime stack (LIFO order).
 */
function findDeepestOpenDescendant(root: FloatingNode): FloatingNode {
  let deepest: FloatingNode = root;
  let maxDepth = 0;

  root.traverse((current, depth) => {
    if (!current.open.value) return "skip";
    if (depth > maxDepth) {
      maxDepth = depth;
      deepest = current;
    } else if (depth === maxDepth && depth > 0) {
      const currentIdx = escapeStack.findLastIndex((e) => e.node.id === current.id);
      const deepestIdx = escapeStack.findLastIndex((e) => e.node.id === deepest.id);
      if (currentIdx > deepestIdx) {
        deepest = current;
      }
    }
  });

  return deepest;
}

/**
 * Descends through open children containing the target to find the subtree
 * owner whose family still encloses the event source.
 */
function findTargetOwner(current: FloatingNode, targetNode: Node): FloatingNode {
  const child = current.children.value.values().find((c) => c.open.value && c.contains(targetNode));
  return child ? findTargetOwner(child, targetNode) : current;
}

//=======================================================================================
// 📌 Types
//=======================================================================================

/**
 * Context required by `useEscapeKey`.
 */
export type UseEscapeKeyContext = FloatingNode;

/**
 * Options for configuring Escape key dismissal.
 */
export interface UseEscapeKeyOptions {
  /**
   * Condition to enable the escape key listener.
   * @default true
   */
  enabled?: MaybeRefOrGetter<boolean>;
  /**
   * Handle Escape during the document's capture phase instead of the bubble phase.
   * Capture intercepts the event before inner elements can stop its propagation.
   * @default false
   */
  capture?: boolean;
  /**
   * Calls `event.preventDefault()` on the keydown event when this entry claims it.
   * This prevents the browser default for the keyboard event; it does NOT prevent dismissal.
   * @default false
   */
  preventDefault?: boolean;
  /**
   * Custom handler invoked instead of the default close behavior.
   * The event is fully consumed before this runs (propagation is stopped),
   * so closing `node.open` is the handler's responsibility.
   */
  onEscape?: (event: KeyboardEvent) => void;
}
