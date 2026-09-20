import type { FloatingNode } from "@/composables/floating-node";
import { getEventTarget, isNode } from "@/shared/dom";
import { isImeComposing } from "@/shared/composition-state";

export interface EscapeEntryOptions {
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

export interface EscapeEntry {
  node: FloatingNode;
  readonly options?: EscapeEntryOptions;
}

interface DocumentEscapeManager {
  stack: EscapeEntry[];
  captureListener: ((event: KeyboardEvent) => void) | null;
  bubbleListener: ((event: KeyboardEvent) => void) | null;
}

//=======================================================================================
// 📌 Main
//=======================================================================================

const documentManagers = new WeakMap<Document, DocumentEscapeManager>();
const handledEscapeEvents = new WeakSet<KeyboardEvent>();

/**
 * Retrieves or initializes the document escape manager for a specific document.
 */
function getDocumentManager(doc: Document): DocumentEscapeManager {
  let manager = documentManagers.get(doc);
  if (!manager) {
    manager = {
      stack: [],
      captureListener: null,
      bubbleListener: null,
    };
    documentManagers.set(doc, manager);
  }
  return manager;
}

/**
 * Synchronizes capture and bubble document keydown listeners based on stack entries.
 * Attaches listeners when entries exist and detaches them when empty.
 */
function syncDocumentListeners(doc: Document, manager: DocumentEscapeManager): void {
  const needsCapture = manager.stack.some((entry) => Boolean(entry.options?.capture));
  const needsBubble = manager.stack.some((entry) => !entry.options?.capture);

  if (needsCapture && !manager.captureListener) {
    const listener = (event: KeyboardEvent) => {
      dispatchEscape(doc, event, "capture");
    };
    manager.captureListener = listener;
    doc.addEventListener("keydown", listener, true);
  } else if (!needsCapture && manager.captureListener) {
    doc.removeEventListener("keydown", manager.captureListener, true);
    manager.captureListener = null;
  }

  if (needsBubble && !manager.bubbleListener) {
    const listener = (event: KeyboardEvent) => {
      dispatchEscape(doc, event, "bubble");
    };
    manager.bubbleListener = listener;
    doc.addEventListener("keydown", listener, false);
  } else if (!needsBubble && manager.bubbleListener) {
    doc.removeEventListener("keydown", manager.bubbleListener, false);
    manager.bubbleListener = null;
  }
}

/**
 * Handles Escape key events centrally per document.
 */
function dispatchEscape(doc: Document, event: KeyboardEvent, phase: "capture" | "bubble"): void {
  // Ignore Escape when IME (Input Method Editor) text composition is active,
  // when default is prevented by an inner element, or if already handled.
  if (
    event.key !== "Escape" ||
    event.defaultPrevented ||
    isImeComposing(event) ||
    handledEscapeEvents.has(event)
  ) {
    return;
  }

  const manager = documentManagers.get(doc);
  if (!manager || manager.stack.length === 0) return;

  const activeEntry = resolveActiveEscapeEntry(manager, getEventTarget(event));
  if (!activeEntry) return;

  const isCapture = Boolean(activeEntry.options?.capture);

  // If this entry requested capture phase, it must only execute during capture phase.
  // If it requested bubble phase, it must only execute during bubble phase.
  if (phase === "capture" && !isCapture) {
    return;
  }
  if (phase === "bubble" && isCapture) {
    return;
  }

  handledEscapeEvents.add(event);

  const { options, node } = activeEntry;

  if (options?.preventDefault) {
    event.preventDefault();
  }

  // Once an entry claims the event it is fully consumed: stop propagation for both
  // the default close path and custom onEscape handlers so the keypress never leaks
  // to outer UI (native <dialog>, route-level key handlers, etc.).
  event.stopPropagation();
  event.stopImmediatePropagation();

  if (options?.onEscape) {
    options.onEscape(event);
    return;
  }

  node.open.value = false;
}

/**
 * Pushes an open, escape-enabled floating node onto the document's escape stack
 * and synchronizes shared document listeners.
 */
export function pushEscapeEntry(doc: Document, entry: EscapeEntry): void {
  const manager = getDocumentManager(doc);
  const existingIdx = manager.stack.indexOf(entry);
  if (existingIdx !== -1) {
    manager.stack.splice(existingIdx, 1);
  }
  manager.stack.push(entry);
  syncDocumentListeners(doc, manager);
}

/**
 * Removes a floating node from the document's escape stack and cleans up
 * listeners if no active entries remain.
 */
export function removeEscapeEntry(doc: Document, entry: EscapeEntry): void {
  const manager = documentManagers.get(doc);
  if (!manager) return;
  const idx = manager.stack.indexOf(entry);
  if (idx !== -1) {
    manager.stack.splice(idx, 1);
  }
  syncDocumentListeners(doc, manager);
}

/**
 * Resolves which escape entry should handle the Escape key for a given event target.
 *
 * 1. If target is contained within a registered open hierarchy, resolves to that hierarchy's
 *    deepest open descendant (or its closest registered ancestor if the descendant did not
 *    invoke `useEscapeKey`).
 * 2. If target is outside all open hierarchies (e.g. document body or headless tests),
 *    resolves using the topmost open entry on the LIFO stack and its open subtree.
 */
function resolveActiveEscapeEntry(
  manager: DocumentEscapeManager,
  target: EventTarget | null,
): EscapeEntry | null {
  const { stack } = manager;
  if (stack.length === 0) return null;

  const targetNode = isNode(target) ? target : null;

  if (targetNode) {
    // Check from topmost (latest opened) entry downward to find target's hierarchy
    for (let i = stack.length - 1; i >= 0; i--) {
      const { node } = stack[i];
      let root = node;
      while (root.parent?.value) {
        root = root.parent.value;
      }

      if (root.contains(targetNode)) {
        const owner = findTargetOwner(root, targetNode);
        const deepest = findDeepestOpenDescendant(owner, stack) ?? owner;
        const entry = findEntryForNode(manager, deepest);
        if (entry) return entry;
      }
    }
  }

  // Fallback when target is outside all known hierarchies (or document/body):
  // Resolve using the topmost open entry in the stack and unwind its open subtree.
  for (let i = stack.length - 1; i >= 0; i--) {
    const candidate = stack[i].node;
    if (candidate.open.value) {
      const deepest = findDeepestOpenDescendant(candidate, stack) ?? candidate;
      const entry = findEntryForNode(manager, deepest);
      if (entry) return entry;
    }
  }

  return null;
}

//=======================================================================================
// 📌 Helpers
//=======================================================================================

/**
 * Finds the EscapeEntry for a given node, or walks up its ancestor chain until finding
 * the nearest registered ancestor entry on the stack.
 *
 * This ensures that if an intermediate or leaf node in a tree hierarchy did not call
 * `useEscapeKey`, Escape gracefully unwinds to the nearest enclosing registered overlay
 * rather than silently dropping the event.
 */
function findEntryForNode(
  manager: DocumentEscapeManager,
  startNode: FloatingNode,
): EscapeEntry | null {
  let curr: FloatingNode | null = startNode;
  while (curr) {
    for (let i = manager.stack.length - 1; i >= 0; i--) {
      if (manager.stack[i].node.id === curr.id) {
        return manager.stack[i];
      }
    }
    curr = curr.parent?.value ?? null;
  }
  return null;
}

/**
 * Finds the deepest open descendant in a floating node subtree.
 *
 * Traverses top-down. If multiple nodes share the maximum depth (e.g. sibling branches),
 * ties are broken using the LIFO stack order (the one opened more recently wins).
 */
function findDeepestOpenDescendant(root: FloatingNode, stack?: EscapeEntry[]): FloatingNode | null {
  if (!root.open.value) return null;

  let deepest: FloatingNode = root;
  let maxDepth = 0;

  const getStackIndex = (node: FloatingNode): number => {
    if (!stack) return -1;
    for (let i = stack.length - 1; i >= 0; i--) {
      if (stack[i].node.id === node.id) return i;
    }
    return -1;
  };

  root.traverse((current, depth) => {
    if (!current.open.value) return "skip";
    if (depth > maxDepth) {
      maxDepth = depth;
      deepest = current;
    } else if (depth === maxDepth && depth > 0) {
      const currentIdx = getStackIndex(current);
      const deepestIdx = getStackIndex(deepest);
      // At equal depth, break ties in favor of the more recently opened node on the stack.
      // Nodes without a stack entry score -1 and always lose, which is deliberate:
      // registered entries are the dismissal candidates (unregistered nodes unwind to
      // their nearest registered ancestor afterwards via findEntryForNode).
      if (currentIdx > deepestIdx) {
        deepest = current;
      }
    }
  });

  return deepest;
}

/**
 * Descends through open children containing the target to find the subtree
 * owner: the deepest node whose family still encloses the event source.
 * The caller then unwinds that owner's deepest open descendant leaf-first.
 */
function findTargetOwner(current: FloatingNode, targetNode: Node): FloatingNode {
  for (const child of current.children.value) {
    if (child.open.value && child.contains(targetNode)) {
      return findTargetOwner(child, targetNode);
    }
  }

  return current;
}
