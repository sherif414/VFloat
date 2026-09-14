# RFC 0002: Unified Composite Node Architecture

- **Start Date**: 2026-09-13
- **Status**: Proposed
- **Target Version**: VFloat 1.0 / Next Minor
- **Supersedes**: [RFC 0001: Intent-Driven Coordinator](0001-intent-driven-coordinator.md)
- **Relevant Subsystems**: `floating-tree`, `dismiss`, `hover`, `focus-trap`, `keyboard-navigation`

---

## 1. The Verdict: Where We Landed

We stripped away the assumptions inherited from React and false framework premises to arrive at a lean, Vue-native architecture. 

By grounding our design in the **Composite Pattern (GoF)**, explicit JavaScript references, and physical DOM containment realities, we eliminate the friction between single-node and multi-node handling once and for all.

---

## 2. What We Killed (Do Not Implement)

| Discarded Concept | Why It Was Killed |
| :--- | :--- |
| **Separate `FloatingTree` Class** | A single node and a tree are the exact same data structure ($N=0$ vs $N>0$). Maintaining dual APIs (`node` vs `tree`) poisoned the entire codebase with `if (tree)` branches and copy-pasted fallbacks. |
| **Implicit DI (`provide` / `inject`)** | `provide`/`inject` fails in flat components that define submenus within the same `<script setup>` (Vue `provide` only delivers to child components). It also creates invisible, non-deterministic coupling. Hierarchy must be **100% explicit**. |
| **The Global Event WeakSet** | Broke independent outside-clicks for multiple simultaneous popovers, starved nested dismissals, and assumed an inverted event listener execution order. |
| **`pendingChildren` & Deferred Linking** | Vue’s `setup()` executes **strictly top-down** (parents always initialize before children, even across `async setup` and `<Suspense>`). Accommodating inverted/out-of-order hierarchies was solving an anti-pattern at the cost of memory retention risks. |
| **Blanket `teleport to="body"`** | Teleporting every floating element to `body` needlessly severs physical DOM ancestry, breaking native focus traps, `.contains()` checks, and `<dialog>` top-layer mechanics. |

---

## 3. The Final Architecture: 3 Core Pillars

```
┌────────────────────────────────────────────────────────────────────────┐
│                        COMPOSITE FLOATING NODE                         │
├────────────────────────────────────────────────────────────────────────┤
│ - Refs: anchorEl, floatingEl                                           │
│ - Topology: parent (FloatingNode | null), children (Set<FloatingNode>) │
│ - Predicate: node.contains(target)                                     │
└──────────────────┬──────────────────────────────────┬──────────────────┘
                   │                                  │
    If target is in local DOM           If target was teleported to <body>
                   │                                  │
                   ▼                                  ▼
         [Physical DOM Fast-Path]            [Check Open Children]
         (el.contains(target))               (child.contains(target))
```

---

### Pillar 1: The Unified Composite Node ($N = 0$)

Every floating surface is represented by a `FloatingNode`. There is no separate `FloatingTree` class or external coordinator.
- A standalone surface (e.g. simple tooltip) is simply a composite node with $N = 0$ children.
- A nested menu or modal is a composite node with $N > 0$ children.
- Hierarchy is established **strictly and explicitly** via direct object references: `useFloatingNode({ parent: rootNode })`.
- Composables (`useDismiss`, `useHover`, `useFocusTrap`, `useRovingFocus`) **never** branch on `if (tree)`. They interact with the uniform node contract:

```ts
export interface UseFloatingNodeOptions {
  anchorEl: Ref<AnchorElement>;
  floatingEl: Ref<FloatingElement>;
  arrowEl?: Ref<HTMLElement | null>;
  open?: Ref<boolean>;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean, reason?: OpenChangeReason, event?: Event) => void;

  /**
   * Explicit parent node reference for nested surfaces (submenus, cascades).
   * 100% explicit: works in flat `<script setup>`, across components via props, or in unit tests.
   */
  parent?: MaybeRefOrGetter<FloatingNode | null>;
}

export interface FloatingNode {
  id: FloatingNodeId;
  refs: FloatingNodeElements;
  open: Readonly<Ref<boolean>>;
  setOpen: (open: boolean, reason?: OpenChangeReason, event?: Event) => void;

  // Intrinsic Hierarchy (Read-only properties)
  parent: Readonly<ShallowRef<FloatingNode | null>>;
  children: Readonly<ShallowRef<ReadonlySet<FloatingNode>>>;

  // Hierarchical Mutators (DOM-Style)
  appendChild: (child: FloatingNode) => () => void;
  removeChild: (child: FloatingNode) => void;

  // Unified Spatial & Topological Queries
  contains: (target: EventTarget | null) => boolean;
  traverse: (
    visitor: (node: FloatingNode, depth: number) => boolean | void,
    options?: TraverseOptions,
  ) => void;
  closeDescendants: (reason?: OpenChangeReason) => void;
}
```

#### Uniform Spatial Predicate (`node.contains`)
```ts
function contains(target: EventTarget | null): boolean {
  if (!target) return false;

  let found = false;

  traverse((current, depth) => {
    if (found || (depth > 0 && !current.open.value)) {
      return false;
    }

    if (isTargetWithinElements(current.refs.anchorEl.value, current.refs.floatingEl.value, target)) {
      found = true;
      return false;
    }
  });

  return found;
}
```
When $N = 0$, `traverse` executes only on the root node and returns immediately. The code is 100% uniform with zero branching across all composables.

---

### Pillar 2: Contextual Teleportation (DOM-First)

Rather than blindly teleporting every floating surface to `document.body`, floating surfaces prioritize teleporting to the **nearest contextual container** (e.g. the enclosing Dialog Root, Drawer Root, or Popover boundary).

```html
<!-- DOM Hierarchy preserved inside Dialog Root -->
<div class="dialog-root" data-vfloat-portal-target>
  <div class="dialog-content">
    <button ref="dropdownTrigger">Country</button>
  </div>

  <!-- Teleported here (NOT to <body>) -->
  <div class="dropdown-content">
    <div class="option">Canada</div>
  </div>
</div>
```

#### Key Benefits:
1. **Physical DOM Ancestry Preserved**: Standard `dialogRoot.contains(target)` naturally returns `true` for nested controls.
2. **Native Focus Traps Remain Intact**: `useFocusTrap` on the modal does not require custom allow-lists or artificial DOM exclusions for its nested controls.
3. **Top-Layer Alignment**: Works natively with the HTML `<dialog>` and Popover API without z-index escalation wars.
4. **Virtual Fallback Only When Needed**: The virtual tree traversal in `node.contains(target)` only activates when physical DOM ancestry is genuinely severed (e.g. root menus teleported to `<body>`).

---

### Pillar 3: Deterministic Lifecycle & Leaf-First Escape Protocol

#### 3.1 Explicit Hierarchy & Fail-Fast Invariants
Because Vue 3's `setup()` executes **strictly top-down** (parent setup completes before child setup starts), a parent node is guaranteed to exist at registration time.

Nodes expose DOM-style hierarchical mutators that guarantee atomic, bi-directional consistency:
- `parent.appendChild(child: FloatingNode): () => void`
  - Atomically sets `child.parent.value = parent` and adds `child` to `parent.children`.
  - Enforces cycle detection ($A \to B \to A$) and prevents self-parenting (`parent === child`).
  - Returns a teardown function `() => parent.removeChild(child)`.
- `parent.removeChild(child: FloatingNode): void`
  - Clears `child.parent.value = null` and removes `child` from `parent.children`.

**Declarative Usage (via `parent: rootNode` option):**
```ts
watchEffect((onCleanup) => {
  const parentNode = toValue(options.parent);
  if (!parentNode) return;

  const unbind = parentNode.appendChild(node);
  onCleanup(unbind);
});
```

**Imperative Usage (DOM parity):**
```ts
const unbind = rootNode.appendChild(subNode);
// When finished:
unbind(); // or rootNode.removeChild(subNode);
```
- If a child references an invalid or undefined parent, fail fast with a clear `__DEV__` warning instead of silently buffering.
- Zero deferred queues, zero `pendingChildren` maps, zero memory leak traps.

#### 3.2 Proactive Cleanup via `onScopeDispose`
When a child component unmounts, it proactively detaches from its parent. This permanently eliminates the dangerous "Grandparent Adoption" bug.

#### 3.3 Leaf-First Escape Protocol (No Global Event Tracking)
Rather than maintaining brittle global event registries (`WeakSet<Event>`), each node resolves Escape deterministically based on its local topology:

```ts
// In useEscapeKey:
function handleEscape(event: KeyboardEvent) {
  if (event.key !== "Escape" || !open.value) return;

  // Has an open child? DO NOT CLOSE.
  // The open child's listener will handle closing the leaf.
  const hasOpenChildren = Array.from(node.children.value).some((child) => child.open.value);
  if (hasOpenChildren) {
    return; // Pass through to leaf
  }

  // Leaf node closes cleanly:
  event.stopPropagation();
  node.setOpen(false, "escape-key", event);
}
```

#### Why This Works:
1. When `Escape` is pressed in `Root` $\to$ `SubMenu` $\to$ `SubSubMenu`:
   - `RootMenu` checks: has open children $\to$ bails.
   - `SubMenu` checks: has open children $\to$ bails.
   - `SubSubMenu` checks: **no open children** $\to$ closes!
2. A second press of `Escape`:
   - `SubSubMenu` is now closed.
   - `SubMenu` has no open children $\to$ closes!
3. **Result:** Perfect LIFO Escape dismissal with zero global event maps, zero synchronous cascades, and zero framework magic.

---

## 4. How Composables Look Under RFC 0002

All behavior composables become lightweight, focused consumers of the composite node.

### `useDismiss`
```ts
export function useDismiss(node: FloatingNode, options: UseDismissOptions = {}): void {
  // Outside click uses node.contains()
  useOutsideClick(node, {
    enabled: options.enabled,
    isTargetWithin: (target) => node.contains(target),
    ...options.outsidePress,
  });

  // Escape uses leaf-first protocol
  useEscapeKey(node, {
    enabled: options.enabled,
    ...options.escapeKey,
  });
}
```
- **Zero `{ tree }` options.**
- **Zero dual branches.**

### `useHover`
```ts
export function useHover(node: FloatingNode, options: UseHoverOptions = {}): void {
  function onPointerLeave(event: PointerEvent) {
    // Spatial family awareness directly from node:
    if (node.contains(event.relatedTarget)) {
      return; // Moving into child submenu or local panel
    }
    // ...
  }
}
```

### `useRovingFocus`
```ts
// Submenu collapse on exit (ArrowLeft in LTR)
if (node.parent.value && isExitKey(e)) {
  e.preventDefault();
  node.setOpen(false, "keyboard-exit", e);
  node.parent.value.refs.anchorEl.value?.focus();
}

// Close descendant submenus when navigating items
if (targetIndex !== currentIndex) {
  node.closeDescendants("keyboard-exit");
}
```

---

## 5. Developer Experience (DX) Comparison

### Single-Component Flat Script (Previously Painful, Now Trivial)
```vue
<script setup>
import { useFloatingNode, usePosition, useDismiss } from "v-float";

const root = useFloatingNode({ anchorEl: rootBtn, floatingEl: rootMenu });
const sub = useFloatingNode({ anchorEl: subBtn, floatingEl: subMenu, parent: root });

useDismiss(root);
useDismiss(sub);
</script>
```

### Multi-Component Submenu (Explicit & Typed)
```vue
<!-- RootMenu.vue -->
<script setup>
const rootNode = useFloatingNode({ anchorEl, floatingEl });
</script>
<template>
  <button ref="anchorEl">Menu</button>
  <div ref="floatingEl">
    <!-- Pass parent directly as a typed prop -->
    <SubMenu :parent="rootNode" />
  </div>
</template>
```

```vue
<!-- SubMenu.vue -->
<script setup>
const props = defineProps<{ parent: FloatingNode }>();
const subNode = useFloatingNode({ anchorEl, floatingEl, parent: () => props.parent });
</script>
```

### Standalone Controls in Overlays (Preserved by Contextual Teleportation)
With Contextual Teleportation (Pillar 2), controls inside a modal teleport into the modal's contextual portal target. Because they remain physical DOM descendants of the dialog container, `modal.contains(target)` naturally returns `true` without needing manual hierarchy wiring or DI magic.

---

## 6. Migration & Backward Compatibility

1. **`useFloatingTree()`**: Deprecated. Retained as a thin backward-compatibility shim during VFloat 1.x.
2. **`tree` option in composables**: Marked `@deprecated`. If passed, composables warn in `__DEV__` and ignore it in favor of `node.contains()`.
3. **Zero breaking changes** to template markup or core positioning (`usePosition`).

---

## 7. Next Steps & Implementation Plan

1. **Phase 1: Update `FloatingNode` Interface** (`use-floating-node.ts`)
   - Add `parent`, `children`, `appendChild()`, `removeChild()`, `contains()`, `traverse()`, `closeDescendants()`.
   - Implement explicit `parent?: MaybeRefOrGetter<FloatingNode | null>` binding.
2. **Phase 2: Refactor Interaction Composables**
   - Update `useDismiss`, `useOutsideClick`, `useEscapeKey`, `useHover`, `useFocusTrap`, `useRovingFocus` to call `node.contains()`.
   - Remove `treeOption` branching across all composable internals.
3. **Phase 3: Deprecate `FloatingTree`**
   - Replace `use-floating-tree.ts` internals with thin composite node wrappers.
4. **Phase 4: Targeted Regression Test Suite**
   - Test standalone node ($N = 0$).
   - Test single-component flat script (`parent: root`).
   - Test multi-component prop passing (`:parent="root"`).
   - Test leaf-first Escape key protocol.

---

## 8. Unresolved & Open Questions

The following architectural questions were identified during design discussions and warrant focused exploration before finalizing the implementation:

### 8.1 Async `onBeforeOpenChange` & State Transition Gating
- **Problem**: Users frequently require asynchronous validation or confirmation before a floating surface closes (e.g. awaiting an unsaved-changes confirmation modal: `const ok = await confirmModal()`, or performing an async auto-save draft request).
- **Proposed Signature**:
  ```ts
  onBeforeOpenChange?: (
    nextOpen: boolean,
    reason: OpenChangeReason,
    event?: Event,
  ) => boolean | void | Promise<boolean | void>;
  ```
- **Unresolved Challenges**:
  1. **Temporal Gap & Re-entrancy**: During the async promise await, the floating panel remains open in the DOM. What happens if the user clicks outside again, hits Escape, or presses the trigger button while an async transition is already pending? Does `setOpen` drop, queue, or reject concurrent intents?
  2. **Reactive Feedback**: Should `FloatingNode` expose a reactive `isTransitioning: Readonly<Ref<boolean>>` or `isPending` state so consumer templates can render loading spinners or disable duplicate trigger interactions?
  3. **Event Lifecycle Desync**: Native DOM events (`pointerdown`, `keydown`) complete their synchronous browser dispatch immediately. By the time an async promise resolves, the original DOM event has long finished bubbling, making `event.preventDefault()` or synchronous DOM manipulation ineffective.

### 8.2 Conditional Document Listeners vs. Reference-Counted Shared Dispatcher
- **Problem**: Currently, `useEscapeKey` and `useOutsideClick` attach global `keydown` and `pointerdown` listeners to `document` at component mount time, even when the element is closed. In a table with 50 closed dropdowns, 100 global listeners execute on every user keypress or click.
- **Alternative Approaches**:
  - **Option A (Conditional Binding)**: Only attach the listener to `document` when `open.value` is `true`:
    `useEventListener(() => (open.value && isEnabled.value ? getDocument() : null), ...)`
    *Pros:* Zero listeners when closed.
    *Cons:* Adds and removes DOM listeners on every open/close transition.
  - **Option B (Reference-Counted Shared Dispatcher)**: Maintain a single global `document` listener (mirroring [`src/composables/dismiss/composition-state.ts`](file:///c:/projects/VFloat/src/composables/dismiss/composition-state.ts)) that dispatches only to actively open nodes.
    *Pros:* Exactly 1 listener on `document` regardless of how many surfaces exist.
    *Cons:* Slightly higher internal state management complexity.

### 8.3 Controlled State Bypass & Automatic Cascade Teardown (`v-model:open`)
- **Problem**: When a consumer mutates a controlled `open` ref directly from an external template (e.g. `<button @click="isOpen = false">`), `node.setOpen` is completely bypassed.
- **Unresolved Tradeoff**:
  - Should `useFloatingNode` proactively watch `open` and force `node.closeDescendants("programmatic")` whenever `open` becomes `false` externally?
  - *Risk:* Is it possible a developer intentionally wants to hide a parent surface temporarily without discarding the open state of a child submenu (e.g., in a wizard or multi-pane flow), or should parent closure strictly enforce total subtree teardown by default?

### 8.4 Eliminating `floatingInternals` via Pure Middleware Pipelining
- **Problem**: Currently, `usePosition` and `useArrow` communicate through a hidden global map (`floatingInternals = new WeakMap()`). `useArrow` imperatively registers itself into `usePosition`'s registry, creating execution-order dependencies and lazy retries.
- **Unresolved API Ergonomics**:
  - If dynamic registration is eliminated in favor of pure pipelines (`middlewares: [offset(8), flip(), arrow({ element: arrowEl })]`), how should `useArrow` consume the computed arrow coordinates?
  - Should `usePosition` directly return `arrowStyles` if an arrow middleware is detected in the pipeline?
  - Or should `useArrow` be retained as a pure style-projection helper that takes `position.middlewareData` explicitly (`useArrow(position.middlewareData.value.arrow)`)?

