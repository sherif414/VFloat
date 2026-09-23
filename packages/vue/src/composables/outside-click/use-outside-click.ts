import { computed, type MaybeRefOrGetter, onWatcherCleanup, toValue, watch } from "vue";
import type { FloatingNode, FloatingNodeId } from "@/composables/floating-node";
import { getEventTarget, isClickOnScrollbar, isHTMLElement, isNode } from "@/shared/dom";
import { getDocument, getWindow } from "@/shared/env";
import { tryOnScopeDispose } from "@/shared/lifecycle";
import { createStackManager } from "@/shared/stack-manager";

interface ResolvedOutsideClickOptions {
  event: "pointerdown" | "mousedown" | "click";
  capture: boolean;
  leafFirst: boolean;
  ignoreScrollbar: boolean;
  ignoreDrag: boolean;
  shouldIgnore?: OutsideClickPredicate;
  onOutsideClick?: (event: MouseEvent, info: OutsideClickInfo) => void;
}

interface OutsideClickInfo {
  reason: "pointer" | "iframe-blur";
  target: EventTarget | null;
}

interface OutsideClickEntry {
  node: FloatingNode;
  capture: boolean;
  getOptions: () => ResolvedOutsideClickOptions;
}

interface DocumentOutsideClickManager {
  stack: OutsideClickEntry[];
  listeners: Map<string, { eventName: string; listener: (event: Event) => void }[]>;
  dragListenersAttached: boolean;
  onMouseDown: ((event: MouseEvent) => void) | null;
  onMouseUp: ((event: MouseEvent) => void) | null;
  onBlur: ((event: FocusEvent) => void) | null;
  dragStartedEntries: Set<FloatingNodeId>;
  dragEndedEntries: Set<FloatingNodeId>;
  dragResetTimeoutId: number | undefined;
  blurTimeoutId: number | undefined;
}

const stackManager = createStackManager<OutsideClickEntry, DocumentOutsideClickManager>(
  () => ({
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
  }),
  syncDocumentListeners,
);
const eventOpenChildren = new WeakMap<Event, Map<FloatingNodeId, boolean>>();

//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * Closes a floating node when pointer input lands outside its floating family.
 *
 * Supports nested tree hierarchies, scrollbar filtering, drag suppression,
 * iframe blur dismissal, and configurable event triggers.
 * @param node - The floating node with refs and open state.
 * @param options - Configuration options for outside-click dismissal.
 * @example
 * ```ts
 * useOutsideClick(node, { leafFirst: true });
 * ```
 */
export function useOutsideClick(node: FloatingNode, options: UseOutsideClickOptions = {}): void {
  const enabled = computed(() => toValue(options.enabled) ?? true);
  const ownerDocument = computed(
    () =>
      node.refs.floatingEl.value?.ownerDocument ??
      (node.refs.anchorEl.value && "ownerDocument" in node.refs.anchorEl.value
        ? node.refs.anchorEl.value.ownerDocument
        : undefined) ??
      getDocument(),
  );
  const event = options.event ?? "pointerdown";
  const entry: OutsideClickEntry = {
    node,
    capture: options.capture ?? true,
    getOptions: () => ({
      event,
      capture: options.capture ?? true,
      leafFirst: toValue(options.leafFirst) ?? false,
      ignoreScrollbar: options.ignoreScrollbar ?? true,
      ignoreDrag: options.ignoreDrag ?? true,
      shouldIgnore: options.shouldIgnore,
      onOutsideClick: options.onOutsideClick,
    }),
  };

  // --- Outside Click Registration ----------------------------------------------

  watch(
    [enabled, node.open, ownerDocument],
    ([enabled, open, doc]) => {
      if (!enabled || !open || !doc) return;
      stackManager.push(doc, entry);

      onWatcherCleanup(() => {
        stackManager.remove(doc, entry);
      });
    },
    { immediate: true, flush: "sync" },
  );

  tryOnScopeDispose(() => {
    const doc = ownerDocument.value;
    if (doc) stackManager.remove(doc, entry);
  });
}

//=======================================================================================
// 📌 Helpers
//=======================================================================================

function syncDocumentListeners(doc: Document, manager: DocumentOutsideClickManager): void {
  const neededEvents = new Map<string, { eventName: string; capture: boolean }>();
  const needsDragTracking = manager.stack.some(
    (entry) => entry.getOptions().event === "click" && entry.getOptions().ignoreDrag,
  );

  for (const entry of manager.stack) {
    const eventName = entry.getOptions().event;
    const key = `${eventName}:${entry.capture ? "capture" : "bubble"}`;
    neededEvents.set(key, { eventName, capture: entry.capture });
  }
  for (const [key, records] of manager.listeners) {
    if (neededEvents.has(key)) continue;
    for (const { eventName, listener } of records) {
      doc.removeEventListener(eventName, listener, key.endsWith(":capture"));
    }
    manager.listeners.delete(key);
  }
  for (const [key, { eventName, capture }] of neededEvents) {
    if (manager.listeners.has(key)) continue;
    const listener = (event: Event) =>
      dispatchOutsideClick(doc, event as MouseEvent, eventName, capture);
    doc.addEventListener(eventName, listener, capture);
    manager.listeners.set(key, [{ eventName, listener }]);
  }

  if (needsDragTracking && !manager.dragListenersAttached) {
    manager.onMouseDown = (event) => {
      if (event.button !== 0) return;
      const target = getEventTarget(event);
      if (!isNode(target)) return;
      const win = getWindow(target) ?? doc.defaultView;
      clearDragTimeout(manager, win);
      manager.dragStartedEntries.clear();
      manager.dragEndedEntries.clear();
      for (const entry of manager.stack) {
        if (entry.node.contains(target)) manager.dragStartedEntries.add(entry.node.id);
      }
    };
    manager.onMouseUp = (event) => {
      if (event.button !== 0) return;
      const target = getEventTarget(event);
      if (!isNode(target)) return;
      const win = getWindow(target) ?? doc.defaultView;
      manager.dragEndedEntries.clear();
      for (const entry of manager.stack) {
        if (entry.node.contains(target)) manager.dragEndedEntries.add(entry.node.id);
      }
      clearDragTimeout(manager, win);
      manager.dragResetTimeoutId = win?.setTimeout(() => {
        manager.dragStartedEntries.clear();
        manager.dragEndedEntries.clear();
        manager.dragResetTimeoutId = undefined;
      }, 0);
    };
    doc.addEventListener("mousedown", manager.onMouseDown, true);
    doc.addEventListener("mouseup", manager.onMouseUp, true);
    manager.dragListenersAttached = true;
  } else if (!needsDragTracking && manager.dragListenersAttached) {
    if (manager.onMouseDown) doc.removeEventListener("mousedown", manager.onMouseDown, true);
    if (manager.onMouseUp) doc.removeEventListener("mouseup", manager.onMouseUp, true);
    clearDragTimeout(manager, doc.defaultView);
    manager.dragStartedEntries.clear();
    manager.dragEndedEntries.clear();
    manager.onMouseDown = null;
    manager.onMouseUp = null;
    manager.dragListenersAttached = false;
  }

  if (manager.stack.length > 0 && !manager.onBlur && doc.defaultView) {
    manager.onBlur = () => {
      clearBlurTimeout(manager, doc.defaultView);
      manager.blurTimeoutId = doc.defaultView?.setTimeout(() => {
        manager.blurTimeoutId = undefined;
        const target = doc.activeElement;
        if (isHTMLElement(target) && target.tagName === "IFRAME") {
          dispatchIframeBlur(doc, manager, target);
        }
      }, 0);
    };
    doc.defaultView.addEventListener("blur", manager.onBlur);
  } else if (manager.stack.length === 0 && manager.onBlur && doc.defaultView) {
    doc.defaultView.removeEventListener("blur", manager.onBlur);
    manager.onBlur = null;
    clearBlurTimeout(manager, doc.defaultView);
  }
}

function dispatchOutsideClick(
  doc: Document,
  event: MouseEvent,
  eventName: string,
  capture: boolean,
): void {
  if (event.button !== 0) return;
  const manager = stackManager.get(doc);
  if (!manager?.stack.length) return;
  const target = getEventTarget(event);
  if (!target || !isNode(target) || !target.isConnected) return;
  dispatchCandidates(manager, event, target, eventName, capture, { reason: "pointer", target });
}

function dispatchIframeBlur(
  doc: Document,
  manager: DocumentOutsideClickManager,
  iframe: HTMLElement,
): void {
  const win = getWindow(iframe) ?? doc.defaultView;
  // Use the iframe's realm so consumers can safely test against its MouseEvent constructor.
  const event = new (win?.MouseEvent ?? MouseEvent)("click", { bubbles: false, cancelable: true });
  dispatchCandidates(manager, event, iframe, "click", null, {
    reason: "iframe-blur",
    target: iframe,
  });
}

function dispatchCandidates(
  manager: DocumentOutsideClickManager,
  event: MouseEvent,
  target: EventTarget,
  eventName: string,
  capture: boolean | null,
  info: OutsideClickInfo,
): void {
  const openEntries = manager.stack.filter((entry) => entry.node.open.value);
  const candidates = openEntries
    .map((entry, index) => ({ entry, index, resolved: entry.getOptions() }))
    .filter(
      ({ entry, resolved }) =>
        info.reason === "iframe-blur" ||
        (resolved.event === eventName && entry.capture === capture),
    );
  let openChildren = eventOpenChildren.get(event);
  if (!openChildren) {
    openChildren = new Map<FloatingNodeId, boolean>();
    for (const { node } of openEntries) openChildren.set(node.id, node.hasOpenChild());
    eventOpenChildren.set(event, openChildren);
  }
  const depths = new Map<FloatingNodeId, number>();
  for (const { entry } of candidates) depths.set(entry.node.id, entry.node.getDepth());
  // Phase-first ordering makes the reactive capture option an ordering hint, not listener policy.
  candidates.sort(
    (a, b) =>
      Number(b.entry.capture) - Number(a.entry.capture) ||
      (depths.get(b.entry.node.id) ?? 0) - (depths.get(a.entry.node.id) ?? 0) ||
      b.index - a.index,
  );

  for (const { entry, resolved } of candidates) {
    const { node } = entry;
    if (!node.open.value) continue;
    const scrollbarTarget = isHTMLElement(target)
      ? target
      : isNode(target) && target.nodeType === 9
        ? (target as Document).documentElement
        : null;
    if (
      info.reason === "pointer" &&
      resolved.ignoreScrollbar &&
      scrollbarTarget &&
      isClickOnScrollbar(event, scrollbarTarget)
    )
      continue;
    if (node.contains(target)) continue;
    if (
      info.reason === "pointer" &&
      eventName === "click" &&
      resolved.ignoreDrag &&
      (manager.dragStartedEntries.has(node.id) || manager.dragEndedEntries.has(node.id))
    ) {
      // Consuming both marks prevents a single drag gesture from shielding a later click.
      manager.dragStartedEntries.delete(node.id);
      manager.dragEndedEntries.delete(node.id);
      continue;
    }
    if (resolved.shouldIgnore?.(event, target, info)) continue;
    if (
      resolved.leafFirst &&
      openChildren.get(node.id) &&
      !node.isTargetWithinAncestorElements(target)
    )
      continue;
    if (resolved.onOutsideClick) resolved.onOutsideClick(event, info);
    else node.open.value = false;
  }
}

function clearDragTimeout(manager: DocumentOutsideClickManager, win: Window | null): void {
  if (manager.dragResetTimeoutId !== undefined) {
    win?.clearTimeout(manager.dragResetTimeoutId);
    manager.dragResetTimeoutId = undefined;
  }
}

function clearBlurTimeout(manager: DocumentOutsideClickManager, win: Window | null): void {
  if (manager.blurTimeoutId !== undefined) {
    win?.clearTimeout(manager.blurTimeoutId);
    manager.blurTimeoutId = undefined;
  }
}

//=======================================================================================
// 📌 Types
//=======================================================================================

/** Predicate used to decide whether an outside interaction should be skipped. */
export type OutsideClickPredicate = (
  event: MouseEvent,
  target: EventTarget | null,
  info: OutsideClickInfo,
) => boolean;

/** Options for configuring outside-click dismissal. */
export interface UseOutsideClickOptions {
  /**
   * Whether outside-click detection is enabled.
   * Reactive: can be dynamically toggled (e.g., during form submission or modal states).
   * @default true
   */
  enabled?: MaybeRefOrGetter<boolean>;
  /**
   * Whether to unwind nested floating trees one level at a time (leaf-first).
   * When `true`, a parent node with open children will not dismiss until
   * its children dismiss first.
   * Reactive: can be bound to component props or dynamic workflow states.
   * @default false
   */
  leafFirst?: MaybeRefOrGetter<boolean>;
  /**
   * Which document event triggers dismissal.
   * Static configuration determined by the component's UX pattern.
   * @default "pointerdown"
   */
  event?: "pointerdown" | "mousedown" | "click";
  /**
   * Which document event phase handles dismissal.
   * Static: read once during listener setup. Changing it mid-open takes
   * effect on close/re-open.
   * @default true
   */
  capture?: boolean;
  /**
   * Whether clicks on scrollbar gutters are ignored.
   * @default true
   */
  ignoreScrollbar?: boolean;
  /**
   * For `event: "click"`, whether to ignore mouseup outside when the drag
   * started inside the floating surface.
   * @default true
   */
  ignoreDrag?: boolean;
  /**
   * Custom predicate to ignore specific outside interactions.
   * Evaluated after the composite node family check.
   */
  shouldIgnore?: OutsideClickPredicate;
  /**
   * Custom callback invoked when an outside interaction occurs.
   * When provided, replaces default `node.open.value = false`.
   */
  onOutsideClick?: (event: MouseEvent, info: OutsideClickInfo) => void;
}
