import { type MaybeRefOrGetter, toValue } from "vue";
import type { FloatingNode, FloatingNodeId } from "@/composables/floating-node";
import { getEventTarget, isClickOnScrollbar, isHTMLElement, isNode } from "@/shared/dom";
import { isTargetWithinElements } from "@/shared/elements";

interface DocumentOutsideClickManager {
  stack: OutsideClickEntry[];
  listeners: Map<string, (event: Event) => void>;
  dragListenersAttached: boolean;
  onMouseDown: ((event: MouseEvent) => void) | null;
  onMouseUp: ((event: MouseEvent) => void) | null;
  onBlur: ((event: FocusEvent) => void) | null;
  dragStartedEntries: Set<FloatingNodeId>;
  dragEndedEntries: Set<FloatingNodeId>;
  dragResetTimeoutId: ReturnType<typeof setTimeout> | number | undefined;
  blurTimeoutId: ReturnType<typeof setTimeout> | number | undefined;
}

const documentManagers = new WeakMap<Document, DocumentOutsideClickManager>();
const eventSnapshots = new WeakMap<Event, Map<FloatingNodeId, boolean>>();

//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * Pushes an open floating node onto the document's outside-click stack
 * and synchronizes document-level listeners.
 */
export function pushOutsideClickEntry(doc: Document, entry: OutsideClickEntry): void {
  const manager = getDocumentManager(doc);
  const existingIdx = manager.stack.indexOf(entry);
  if (existingIdx !== -1) {
    manager.stack.splice(existingIdx, 1);
  }
  manager.stack.push(entry);
  syncDocumentListeners(doc, manager);
}

/**
 * Removes a floating node from the document's outside-click stack
 * and tears down listeners when empty.
 */
export function removeOutsideClickEntry(doc: Document, entry: OutsideClickEntry): void {
  const manager = documentManagers.get(doc);
  if (!manager) return;
  const idx = manager.stack.indexOf(entry);
  if (idx !== -1) {
    manager.stack.splice(idx, 1);
  }
  syncDocumentListeners(doc, manager);
}

/**
 * Retrieves or lazily creates the manager state for a specific document realm.
 */
function getDocumentManager(doc: Document): DocumentOutsideClickManager {
  let manager = documentManagers.get(doc);
  if (!manager) {
    manager = {
      stack: [],
      listeners: new Map(),
      dragListenersAttached: false,
      onMouseDown: null,
      onMouseUp: null,
      onBlur: null,
      dragStartedEntries: new Set(),
      dragEndedEntries: new Set(),
      dragResetTimeoutId: undefined,
      blurTimeoutId: undefined,
    };
    documentManagers.set(doc, manager);
  }
  return manager;
}

/**
 * Clears any pending drag reset timeout on the owner window.
 */
function clearDragTimeout(manager: DocumentOutsideClickManager, win: Window | null): void {
  if (manager.dragResetTimeoutId != null) {
    win?.clearTimeout(manager.dragResetTimeoutId as number);
    manager.dragResetTimeoutId = undefined;
  }
}

/**
 * Clears any pending iframe blur timeout on the owner window.
 */
function clearBlurTimeout(manager: DocumentOutsideClickManager, win: Window | null): void {
  if (manager.blurTimeoutId != null) {
    win?.clearTimeout(manager.blurTimeoutId as number);
    manager.blurTimeoutId = undefined;
  }
}

/**
 * Synchronizes document-level and window-level event listeners with the active stack entries.
 */
function syncDocumentListeners(doc: Document, manager: DocumentOutsideClickManager): void {
  const win = doc.defaultView;

  // 1. Determine which (eventName, capture) listeners are required
  const neededListeners = new Map<string, { eventName: string; capture: boolean }>();
  let needsDragTracking = false;

  for (const entry of manager.stack) {
    const eventName = toValue(entry.options?.event ?? "pointerdown");
    // `capture` is a static setup option: read once per sync so listener keys stay
    // stable while the overlay is open. Changing it takes effect on close/re-open.
    const capture = Boolean(entry.options?.capture ?? true);
    const key = `${eventName}:${capture ? "capture" : "bubble"}`;
    if (!neededListeners.has(key)) {
      neededListeners.set(key, { eventName, capture });
    }

    if (eventName === "click" && toValue(entry.options?.ignoreDrag ?? true)) {
      needsDragTracking = true;
    }
  }

  // Detach listeners that are no longer needed
  for (const [key, listener] of manager.listeners) {
    if (!neededListeners.has(key)) {
      const [eventName, phase] = key.split(":");
      doc.removeEventListener(eventName, listener, phase === "capture");
      manager.listeners.delete(key);
    }
  }

  // Attach newly needed listeners
  for (const [key, { eventName, capture }] of neededListeners) {
    if (!manager.listeners.has(key)) {
      const listener = (event: Event) => {
        dispatchOutsideClick(doc, event as MouseEvent, eventName, capture);
      };
      doc.addEventListener(eventName, listener, capture);
      manager.listeners.set(key, listener);
    }
  }

  // 2. Drag Tracking (capture phase on document)
  if (needsDragTracking && !manager.dragListenersAttached) {
    const onMouseDown = (event: MouseEvent) => {
      if (event.button !== 0) return;
      const target = getEventTarget(event);
      if (!isNode(target)) return;

      clearDragTimeout(manager, win);
      manager.dragStartedEntries.clear();
      manager.dragEndedEntries.clear();
      for (const entry of manager.stack) {
        if (entry.node.contains(target)) {
          manager.dragStartedEntries.add(entry.node.id);
        }
      }
    };

    const onMouseUp = (event: MouseEvent) => {
      if (event.button !== 0) return;
      const target = getEventTarget(event);
      if (!isNode(target)) return;

      manager.dragEndedEntries.clear();
      for (const entry of manager.stack) {
        if (entry.node.contains(target)) {
          manager.dragEndedEntries.add(entry.node.id);
        }
      }

      clearDragTimeout(manager, win);
      manager.dragResetTimeoutId = win?.setTimeout(() => {
        manager.dragStartedEntries.clear();
        manager.dragEndedEntries.clear();
        manager.dragResetTimeoutId = undefined;
      }, 0);
    };

    doc.addEventListener("mousedown", onMouseDown, true);
    doc.addEventListener("mouseup", onMouseUp, true);
    manager.onMouseDown = onMouseDown;
    manager.onMouseUp = onMouseUp;
    manager.dragListenersAttached = true;
  } else if (!needsDragTracking && manager.dragListenersAttached) {
    if (manager.onMouseDown) {
      doc.removeEventListener("mousedown", manager.onMouseDown, true);
      manager.onMouseDown = null;
    }
    if (manager.onMouseUp) {
      doc.removeEventListener("mouseup", manager.onMouseUp, true);
      manager.onMouseUp = null;
    }
    clearDragTimeout(manager, win);
    manager.dragStartedEntries.clear();
    manager.dragEndedEntries.clear();
    manager.dragListenersAttached = false;
  }

  // 3. Iframe Blur Detection (attached to window)
  const hasEntries = manager.stack.length > 0;
  if (hasEntries && !manager.onBlur && win) {
    const onBlur = () => {
      clearBlurTimeout(manager, win);
      manager.blurTimeoutId = win.setTimeout(() => {
        manager.blurTimeoutId = undefined;
        const activeEl = doc.activeElement;
        if (!activeEl || !isHTMLElement(activeEl) || activeEl.tagName !== "IFRAME") {
          return;
        }
        dispatchIframeBlur(doc, manager, activeEl);
      }, 0);
    };
    win.addEventListener("blur", onBlur);
    manager.onBlur = onBlur;
  } else if (!hasEntries && manager.onBlur && win) {
    win.removeEventListener("blur", manager.onBlur);
    manager.onBlur = null;
    clearBlurTimeout(manager, win);
  }
}

/**
 * Dispatches outside click dismissal to eligible open stack entries in leaf-first hierarchy order.
 */
function dispatchOutsideClick(
  doc: Document,
  event: MouseEvent,
  phaseEventName: string,
  isCapture: boolean,
): void {
  // Only primary mouse button can dismiss
  if (event.button !== 0) {
    return;
  }

  const manager = documentManagers.get(doc);
  if (!manager || manager.stack.length === 0) return;

  const target = getEventTarget(event);
  if (!target || !isNode(target)) return;

  // Guard against elements detached from the DOM during click processing
  if (!target.isConnected) return;

  // Gather matching open entries for this event phase
  const candidates: OutsideClickEntry[] = [];
  for (const entry of manager.stack) {
    if (!entry.node.open.value) continue;
    const entryEvent = toValue(entry.options?.event ?? "pointerdown");
    const entryCapture = Boolean(entry.options?.capture ?? true);
    if (entryEvent === phaseEventName && entryCapture === isCapture) {
      candidates.push(entry);
    }
  }

  if (candidates.length === 0) return;

  // Retrieve or initialize event-scoped open children snapshot across all stack entries
  let initiallyOpenChildMap = eventSnapshots.get(event);
  if (!initiallyOpenChildMap) {
    initiallyOpenChildMap = new Map<FloatingNodeId, boolean>();
    for (const entry of manager.stack) {
      if (!entry.node.open.value) continue;
      let hasOpenChild = false;
      for (const child of entry.node.children.value) {
        if (child.open.value) {
          hasOpenChild = true;
          break;
        }
      }
      initiallyOpenChildMap.set(entry.node.id, hasOpenChild);
    }
    eventSnapshots.set(event, initiallyOpenChildMap);
  }

  // Sort candidates leaf-first (deepest descendants first, stack order tie-breaker)
  candidates.sort((a, b) => {
    const depthDiff = getNodeDepth(b.node) - getNodeDepth(a.node);
    if (depthDiff !== 0) return depthDiff;
    return manager.stack.indexOf(b) - manager.stack.indexOf(a);
  });

  for (const entry of candidates) {
    const { node, options } = entry;

    const scrollbarTarget = isHTMLElement(target)
      ? target
      : isNode(target) && target.nodeType === 9
        ? ((target as Document).documentElement as HTMLElement | null)
        : null;

    // 1. Scrollbar click check
    if (
      toValue(options?.ignoreScrollbar ?? true) &&
      scrollbarTarget &&
      isClickOnScrollbar(event, scrollbarTarget)
    ) {
      continue;
    }

    // 2. Family containment check (checks self, anchor, and open descendants)
    if (node.contains(target)) {
      continue;
    }

    // 3. Drag gesture check (only when event is "click" and ignoreDrag is true)
    if (phaseEventName === "click" && toValue(options?.ignoreDrag ?? true)) {
      if (manager.dragStartedEntries.has(node.id) || manager.dragEndedEntries.has(node.id)) {
        manager.dragStartedEntries.delete(node.id);
        manager.dragEndedEntries.delete(node.id);
        continue;
      }
    }

    // 4. Ignore predicate
    if (options?.ignoreClick?.(event, target)) {
      continue;
    }

    // 5. Bubbling control: if bubbles is false and node had open children, let child dismiss first.
    // Exception: when clicking directly on an ancestor's elements, the user is intentionally interacting
    // with an upper layer of the hierarchy, so descendant branches must unwind immediately.
    const isInsideAncestor = isTargetWithinAncestor(node, target);
    if (options?.bubbles === false && initiallyOpenChildMap.get(node.id) && !isInsideAncestor) {
      continue;
    }

    // 6. Dismiss
    if (options?.onClick) {
      options.onClick(event);
    } else {
      node.open.value = false;
    }
  }
}

/**
 * Dismisses open floating nodes when window focus transitions to an external iframe.
 */
function dispatchIframeBlur(
  doc: Document,
  manager: DocumentOutsideClickManager,
  iframe: HTMLElement,
): void {
  const fakeEvent = new MouseEvent("click", { bubbles: false, cancelable: true });

  const candidates: OutsideClickEntry[] = [];
  for (const entry of manager.stack) {
    if (entry.node.open.value) {
      candidates.push(entry);
    }
  }

  candidates.sort((a, b) => {
    const depthDiff = getNodeDepth(b.node) - getNodeDepth(a.node);
    if (depthDiff !== 0) return depthDiff;
    return manager.stack.indexOf(b) - manager.stack.indexOf(a);
  });

  for (const entry of candidates) {
    if (entry.node.contains(iframe)) {
      continue;
    }

    if (entry.options?.ignoreClick?.(fakeEvent, iframe)) {
      continue;
    }

    if (entry.options?.onClick) {
      entry.options.onClick(fakeEvent);
    } else {
      entry.node.open.value = false;
    }

    if (entry.options?.bubbles === false) {
      break;
    }
  }
}

//=======================================================================================
// 📌 Helpers
//=======================================================================================

/**
 * Computes the hierarchical depth of a floating node relative to its root ancestor.
 */
function getNodeDepth(node: FloatingNode): number {
  let depth = 0;
  let current = node.parent.value;
  while (current) {
    depth++;
    current = current.parent.value;
  }
  return depth;
}

/**
 * Checks whether the click target is contained directly within any ancestor node's
 * anchor element or floating panel.
 */
function isTargetWithinAncestor(node: FloatingNode, target: EventTarget | null): boolean {
  if (!target) return false;
  let current = node.parent.value;
  while (current) {
    if (
      isTargetWithinElements(current.refs.anchorEl.value, current.refs.floatingEl.value, target)
    ) {
      return true;
    }
    current = current.parent.value;
  }
  return false;
}

//=======================================================================================
// 📌 Types
//=======================================================================================

/**
 * Predicate used by `ignoreClick` to decide whether an outside click should be skipped.
 */
export type OutsideClickPredicate = (event: MouseEvent, target: EventTarget | null) => boolean;

/**
 * Options accepted by each entry on the outside-click stack.
 */
export interface OutsideClickEntryOptions {
  enabled?: MaybeRefOrGetter<boolean>;
  event?: MaybeRefOrGetter<"pointerdown" | "mousedown" | "click">;
  /**
   * Which document event phase handles dismissal.
   * Static: read once during listener setup. Changing it mid-open takes
   * effect on close/re-open.
   * @default true
   */
  capture?: boolean;
  bubbles?: boolean;
  ignoreScrollbar?: MaybeRefOrGetter<boolean>;
  ignoreDrag?: MaybeRefOrGetter<boolean>;
  ignoreClick?: OutsideClickPredicate;
  onClick?: (event: MouseEvent) => void;
}

/**
 * An entry on the document-level outside-click stack.
 */
export interface OutsideClickEntry {
  node: FloatingNode;
  readonly options?: OutsideClickEntryOptions;
}
