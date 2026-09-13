# RFC 0001: Intent-Driven Coordinator with Explicit Tree Binding

- **Start Date**: 2026-09-13
- **Status**: Superseded by [RFC 0002: Unified Composite Node with Role-Gated Discovery](0002-unified-composite-node.md)
- **Target Version**: N/A
- **Relevant Subsystems**: `floating-tree`, `dismiss`, `hover`, `focus-trap`, `keyboard-navigation`

> [!WARNING]
> **This RFC has been superseded by [RFC 0002: Unified Composite Node with Role-Gated Discovery](0002-unified-composite-node.md).**
> The external tree coordinator and global event tracking concepts proposed here were discarded in favor of a lean, Vue-native Composite Node architecture.

---

## 1. Summary

This RFC proposes a refined architectural evolution for **VFloat**: transitioning from "Composable Anarchy" (where every composable acts as an independent listener, decider, and state mutator) to an **Intent-Driven Coordinator with Explicit Tree Binding**.

The proposal consists of five core pillars:
1. **Explicit Tree Binding at Node Initialization**: `useFloatingNode({ tree, parentId })` automatically registers the node with the tree, eliminating repetitive `{ tree }` prop-drilling across all interaction composables.
2. **Read-Only Spatial Reflection on the Node**: `FloatingNode` exposes `node.tree` and a standard `node.isWithinFamily(target)` method, giving sensors immediate spatial awareness without manual tree plumbing.
3. **The Event-Claiming Mechanism**: Prevents the **Escape Key Avalanche** and multi-listener race conditions across nested menu hierarchies.
4. **State Gatekeeping & Interception (`onBeforeOpenChange`)**: Centralizes state transition approval and provides consumer-level cancellation (e.g. dirty form confirmations before popovers close).
5. **Deferred Tree Linking & Safe Detachment**: Hardens `useFloatingTree` against Vue 3.5's out-of-order component mounting and removes the dangerous "Grandparent Adoption" anti-pattern in `removeNode()`.

---

## 2. Motivation & Problem Statement

### 2.1 The Developer Experience (DX) Tax Today
Today, coordinating a nested floating hierarchy (such as a dropdown menu with submenus) requires excessive boilerplate:

```ts
// Status Quo: Passing `tree` 8+ times
const tree = useFloatingTree();
const rootNode = useFloatingNode({ anchorEl, floatingEl });
const subNode = useFloatingNode({ anchorEl: subAnchorEl, floatingEl: subFloatingEl });

tree.addNode(rootNode);
tree.addNode(subNode, rootNode.id);

useDismiss(rootNode, { tree });
useHover(rootNode, { tree });
useRovingFocus(rootNode, { tree });

useDismiss(subNode, { tree });
useHover(subNode, { tree });
useRovingFocus(subNode, { tree });
```

Developers must manually register nodes into the tree and thread `{ tree }` into every behavior composable. Forgetting `{ tree }` in even one composable introduces subtle, hard-to-debug bugs where submenus close their parents prematurely.

### 2.2 Composable Anarchy & Duplicated Logic
Because `node.setOpen` currently acts as a passive setter with zero arbitration capability, every interaction composable has had to become its own bodyguard:
- `useOutsideClick` duplicates tree queries via `treeOption?.isTargetWithin(node, target) ?? isTargetWithinElements(...)`.
- `useEscapeKey` duplicates tree depth resolution via `treeOption?.getDeepestOpenContext(node) ?? node`.
- `useHover` duplicates family containment checks via `treeOption?.isTargetWithin(node, relatedTarget)`.

### 2.3 Why a "Monolithic Arbitrator" in `setOpen` is the Wrong Fix
A naive solution would be to make `node.setOpen(value, reason, event)` a monolithic arbitrator that inspects `event.target` and decides whether to permit open/close. However, our investigation identified fatal flaws with a monolithic arbitrator:
- **Target Ambiguity**: `outside-click` inspects `event.target`; `hover` inspects `event.relatedTarget` (the element entered, *not* left); `focus` inspects `document.activeElement`.
- **Physical Geometry Pollution**: Scrollbar track detection (`ignoreScrollbar`), sequential pointer drag tracking (`ignoreDrag`), and safe polygon trigonometry (`safePolygon`) require physical DOM measurements and temporal state that do not belong in a central state setter.
- **The Escape Avalanche**: Document-level listeners fire synchronously in the same event tick, causing all open menus in a hierarchy to collapse simultaneously.

---

## 3. Detailed Design

We resolve this tension with a **Two-Tier Architecture**:
- **Sensor Tier**: Owns physical DOM events, temporal gesture tracking, and physical layout calculations (scrollbars, IME, polygons).
- **Coordinator Tier**: Owns tree topology, state gatekeeping, event claiming, and child cascade teardowns.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              SENSOR TIER                                │
│ (useOutsideClick, useEscapeKey, useHover, useFocusTrap, useRovingFocus) │
│                                                                         │
│  - Owns event listeners, timers, gestures, IME, scrollbar math, polygons │
│  - Reads `node.isWithinFamily(target)` for spatial containment          │
│  - Evaluates local predicates (`ignoreClick`, `ignoreEscapeKey`)       │
│  - Proposes state changes: `node.setOpen(value, reason, event)`         │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ Intent Proposal
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           COORDINATOR TIER                              │
│ (useFloatingNode + FloatingTree)                                        │
│                                                                         │
│  1. Event Claim Check: If `isEventClaimed(event)`, abort immediately.   │
│  2. User Gatekeeper: Run `onBeforeOpenChange` (if false -> VETO).       │
│  3. Claim Event: Mark event as claimed across the tree.                │
│  4. Commit State: Mutate `open.value`, trigger `onOpenChange`.          │
│  5. Reactive Cascade: Watcher cleans up descendants if closed.          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### 3.1 Explicit Tree Attachment in `useFloatingNode`

`useFloatingNode` accepts `tree` and `parentId` directly in its options:

```ts
export interface UseFloatingNodeOptions {
  anchorEl: Ref<AnchorElement>;
  floatingEl: Ref<FloatingElement>;
  arrowEl?: Ref<HTMLElement | null>;
  open?: Ref<boolean>;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean, reason?: OpenChangeReason, event?: Event) => void;

  /**
   * Explicit floating tree coordinating related surfaces (e.g. nested menus).
   * Automatically registers this node and unregisters on effect scope disposal.
   */
  tree?: FloatingTree;

  /**
   * ID of the parent node in the tree (for submenus or nested overlays).
   * Can be reactive to support dynamic hierarchy changes.
   */
  parentId?: MaybeRefOrGetter<FloatingNodeId | null>;

  /**
   * Intercept or cancel open/close transitions before they occur.
   * Return `false` to abort the state change.
   */
  onBeforeOpenChange?: (
    nextOpen: boolean,
    reason: OpenChangeReason,
    event?: Event,
  ) => boolean | void;
}
```

The resulting `FloatingNode` exposes its tree and a standardized spatial helper:

```ts
export interface FloatingNode {
  id: FloatingNodeId;
  tree?: FloatingTree;
  refs: FloatingNodeElements;
  open: Readonly<Ref<boolean>>;
  setOpen: (open: boolean, reason?: OpenChangeReason, event?: Event) => void;
  lastOpenReason?: Readonly<Ref<OpenChangeReason | null>>;
  lastOpenEvent?: Readonly<Ref<Event | null>>;

  /**
   * Checks whether a DOM target is inside this node's anchor/floating elements
   * or within any registered descendant surfaces in the floating tree.
   */
  isWithinFamily: (target: EventTarget | null) => boolean;
}
```

---

### 3.2 Standardized Spatial Containment (`isWithinFamily`)

Inside `useFloatingNode`:

```ts
const isWithinFamily = (target: EventTarget | null): boolean => {
  if (!target) return false;
  if (options.tree) {
    return options.tree.isTargetWithin(node, target);
  }
  return isTargetWithinElements(
    node.refs.anchorEl.value,
    node.refs.floatingEl.value,
    target,
  );
};
```

Behavior composables now query `node.isWithinFamily(target)`. They no longer duplicate fallback logic or require `{ tree }` passed as an option.

---

### 3.3 The Event-Claiming Mechanism (Solving the Escape Avalanche)

When multiple nested menus are open, pressing Escape triggers document-level `keydown` listeners on all active nodes in the same event tick. 

To prevent all open levels from collapsing simultaneously:

```ts
const claimedEvents = new WeakSet<Event>();

export function isEventClaimed(event?: Event): boolean {
  return !!event && claimedEvents.has(event);
}

export function claimEvent(event?: Event): void {
  if (event) {
    claimedEvents.add(event);
  }
}
```

Inside `node.setOpen`:
```ts
const setOpen = (value: boolean, reason: OpenChangeReason = "programmatic", event?: Event) => {
  if (open.value === value) return;

  // 1. If another node in this event tick already handled this event, abort!
  if (isEventClaimed(event)) {
    return;
  }

  // 2. User Gatekeeper
  if (options.onBeforeOpenChange?.(value, reason, event) === false) {
    return;
  }

  // 3. Claim the event so sibling/parent listeners in this tick abort
  claimEvent(event);

  // 4. Commit state
  open.value = value;
  options.onOpenChange?.(value, reason, event);
};
```

#### How this solves the Escape Avalanche:
1. `SubSubMenu` keydown listener fires $\to$ calls `setOpen(false, "escape-key", event)` $\to$ event is claimed $\to$ `SubSubMenu` closes.
2. `SubMenu` keydown listener fires (same native event) $\to$ calls `setOpen(false, "escape-key", event)` $\to$ sees event is already claimed $\to$ **aborts!**
3. Result: Only the deepest menu closes. A second press of Escape closes the next level.

---

### 3.4 Hardening `useFloatingTree` (Deferred Linking & Safe Detachment)

#### 3.4.1 Deferred Linking for Out-of-Order Mounting
In Vue 3.5, child components mount before parent components. If a child registers with `parentId` before the parent node has called `useFloatingNode`, the tree must not discard the relationship:

```ts
export function useFloatingTree(): FloatingTree {
  const nodes = new Map<FloatingNodeId, TreeEntry>();
  const pendingChildren = new Map<FloatingNodeId, Set<FloatingNodeId>>();

  function addNode(child: FloatingNode, parentId: FloatingNodeId | null = null): void {
    // 1. If this node already exists, make registration idempotent
    if (nodes.has(child.id)) return;

    // 2. Resolve parent or buffer in pendingChildren
    let resolvedParentId: FloatingNodeId | null = null;
    if (parentId != null) {
      const parent = nodes.get(parentId);
      if (parent) {
        resolvedParentId = parentId;
        parent.childIds.value = withAddedId(parent.childIds.value, child.id);
      } else {
        // Parent not registered yet: buffer child
        if (!pendingChildren.has(parentId)) {
          pendingChildren.set(parentId, new Set());
        }
        pendingChildren.get(parentId)!.add(child.id);
        resolvedParentId = parentId;
      }
    }

    // 3. Adopt any children that were waiting for this node!
    const waitingChildIds = pendingChildren.get(child.id);
    const initialChildIds = new Set<FloatingNodeId>(waitingChildIds ?? []);
    if (waitingChildIds) {
      pendingChildren.delete(child.id);
    }

    nodes.set(child.id, {
      node: child,
      parentId: resolvedParentId,
      childIds: shallowRef(initialChildIds),
    });
  }
  ...
}
```

#### 3.4.2 Safe Detachment (Eliminating Grandparent Adoption)
In `use-floating-tree.ts`, `removeNode()` currently re-parents child nodes of a removed node to its grandparent. In floating UI hierarchies, this causes semantic corruption (orphaned submenus become direct children of Root).

We replace this with **Clean Detachment**:
```ts
function removeNode(id: FloatingNodeId): void {
  const entry = nodes.get(id);
  if (!entry) return;

  // Unlink from parent
  if (entry.parentId != null) {
    const parent = nodes.get(entry.parentId);
    if (parent) {
      parent.childIds.value = withRemovedId(parent.childIds.value, id);
    }
  }

  // Detach all children (do NOT adopt to grandparent)
  for (const childId of entry.childIds.value) {
    const child = nodes.get(childId);
    if (child) {
      child.parentId = null;
    }
  }

  nodes.delete(id);
}
```

---

### 3.5 Controlled State & Cascade Teardown

If a consumer uses controlled state (`useFloatingNode({ open: userRef })`), an external change (e.g. `<button @click="isOpen = false">`) mutates `userRef` directly, completely bypassing `node.setOpen`.

To prevent orphaned open subsurfaces when a parent is closed externally:

```ts
// Inside useFloatingNode:
watch(open, (isOpen) => {
  if (!isOpen && options.tree) {
    // When this node closes (either via setOpen or external ref write),
    // cascade closure to any open descendants in the tree
    options.tree.forEach(node.id, "descendants", (child) => {
      if (child.open.value) {
        child.setOpen(false, "programmatic");
      }
    });
  }
});
```

---

## 4. Drawbacks & Alternatives Considered

### 4.1 Monolithic Sensor Arbitration in `setOpen` (Rejected)
- **Concept**: Remove all checks from sensors and pass all raw events into `setOpen`.
- **Reason for Rejection**: Requires `setOpen` to implement drag tracking, scrollbar detection, IME composition, and safe polygon vector math. Violates separation of concerns and leads to an unmaintainable god function.

### 4.2 Vue `provide` / `inject` (Rejected)
- **Concept**: Implicitly share tree and parent via Vue's injection system.
- **Reason for Rejection**: Fails when root and submenus are declared within the same component setup script. Introduces hidden magic and makes programmatic tree usage unpredictable.

### 4.3 Prop-Getter Architecture (Deferred to Future RFC)
- **Concept**: Composables return props objects (`getAnchorProps`, `getFloatingProps`) merged via `useInteractions`.
- **Reason for Deferral**: Highly disruptive breaking change for existing VFloat template code. The proposed Intent Coordinator achieves 95% of the architectural benefits with **zero breaking changes** to template markup.

---

## 5. Migration & Backwards Compatibility

This design is **100% backwards-compatible**:

1. In all behavior composables (`useDismiss`, `useHover`, `useRovingFocus`, `useFocusTrap`, `useFocus`):
   ```ts
   const tree = options.tree ?? node.tree;
   ```
2. Existing code passing `{ tree }` into `useDismiss(node, { tree })` continues to work identically.
3. Existing code manually calling `tree.addNode(node)` continues to work because `tree.addNode` is now strictly idempotent.
4. New code can cleanly declare `useFloatingNode({ tree, parentId })` and omit `{ tree }` from all behavior composables.

---

## 6. Verification Plan

1. **Unit Tests (`use-floating-node.test.ts`)**:
   - Verify `tree` and `parentId` registration.
   - Verify `onBeforeOpenChange` cancels state change when returning `false`.
   - Verify `node.isWithinFamily` correctly queries the tree.
2. **Integration Tests (`use-dismiss.test.ts`, `use-escape-key.test.ts`)**:
   - Verify that in a 3-level menu hierarchy (`Root` $\to$ `Sub` $\to$ `SubSub`), pressing Escape closes **only one level per press** (Escape Avalanche regression test).
   - Verify outside click in a child submenu does not dismiss parent menus.
3. **Lifecycle Tests (`use-floating-tree.test.ts`)**:
   - Verify out-of-order mounting: child registers with `parentId` before parent registers; verify child is successfully linked once parent registers.
   - Verify node removal cleanly detaches children without grandparent adoption.
4. **SSR Tests (`ssr.test.ts`)**:
   - Ensure zero Node.js / SSR regressions or memory retention.
