---
description: Understand how VFloat coordinates nested overlays, submenus, and composite floating surface hierarchies.
---

# Tree Coordination Explained

Coordinating nested and hierarchical floating components (like multi-level submenus, dropdowns inside dialogs, or cascading popovers) is notoriously difficult. If you try to coordinate them using DOM parent-child relationships, you quickly run into issues:

- **Teleportation gaps.** Floating panels are frequently teleported to `<Teleport to="body">` to avoid CSS overflow clipping. When portals move elements out of their original DOM hierarchy, standard DOM methods like `.contains()` break across portal boundaries.
- **Premature dismissal.** An outside-click listener on a parent modal or menu assumes a click inside a teleported child overlay was "outside" and abruptly closes the parent.
- **Escape key collisions.** Pressing `Escape` can trigger all open overlay listeners simultaneously instead of closing only the active topmost child.

VFloat solves these challenges with the **Unified Composite Node Architecture**. Every floating surface is a composite node with intrinsic hierarchy and spatial awareness. There is no separate tree coordinator class—a single tooltip ($N = 0$) and a deep menu hierarchy ($N > 0$) share the exact same data structure.

---

## The Unified Composite Node ($N = 0$ vs $N > 0$)

Every floating surface is created with [`useFloatingNode`](/api/use-floating-node). A node intrinsically tracks its parent, its children, and its open state:

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

Because hierarchy is built directly into `FloatingNode`, companion composables ([`useDismiss`](/api/use-dismiss), [`useHover`](/api/use-hover), [`useFocusTrap`](/api/use-focus-trap), [`useRovingFocus`](/api/use-roving-focus)) interact with a uniform contract without branching on tree existence.

---

## 3-Tier Parenting Resolution

VFloat resolves parent-child relationships through three ergonomic tiers:

### 1. Implicit DI (Default / Omitted — Zero Prop Drilling)

In multi-component architectures, child components automatically discover and link to their parent floating node via Vue's Dependency Injection (`provide` / `inject`):

```vue
<!-- RootMenu.vue -->
<script setup lang="ts">
import { ref } from "vue";
import { useFloatingNode } from "v-float";
import SubMenu from "./SubMenu.vue";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

// Automatically provides rootNode to descendant components
const rootNode = useFloatingNode({ anchorEl, floatingEl });
</script>

<template>
  <button ref="anchorEl">Menu</button>
  <div v-if="rootNode.open.value" ref="floatingEl">
    <SubMenu />
  </div>
</template>
```

```vue
<!-- SubMenu.vue -->
<script setup lang="ts">
import { ref } from "vue";
import { useFloatingNode } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

// Omitted parent automatically injects rootNode from RootMenu
const subNode = useFloatingNode({ anchorEl, floatingEl });
</script>
```

### 2. Explicit Reference (`parent: rootNode`)

For flat single-component `<script setup>` scripts or explicit prop forwarding, pass the parent node directly:

```ts
const root = useFloatingNode({ anchorEl: rootBtn, floatingEl: rootMenu });
const sub = useFloatingNode({ anchorEl: subBtn, floatingEl: subMenu, parent: root });
```

### 3. Explicit Standalone (`parent: null`)

When a floating component is rendered inside an existing overlay but should remain completely independent (such as a standalone tooltip or detached dialog inside a menu), pass `parent: null` to opt out of DI:

```ts
const standaloneNode = useFloatingNode({
  anchorEl,
  floatingEl,
  parent: null, // Bypasses ancestor DI injection
});
```

---

## What Composite Coordination Solves

### Teleportation-Safe Outside Clicks

When a user clicks inside a child submenu teleported to `<body>`, the parent's [`useDismiss`](/api/use-dismiss) outside-press handler calls `node.contains(target)`.

`node.contains` first tests the fast-path physical DOM element. If the target is not in the local DOM, it recursively queries open child nodes. Because the child is linked in the composite hierarchy, the click is recognized as internal, keeping the parent open.

### Deterministic Leaf-First Escape Protocol

Rather than maintaining brittle global event registries, each composite node resolves `Escape` deterministically based on its local topology:

1. When `Escape` is pressed in `Root` &rarr; `SubMenu` &rarr; `SubSubMenu`:
   - `RootMenu` checks: has open children &rarr; bails out.
   - `SubMenu` checks: has open children &rarr; bails out.
   - `SubSubMenu` checks: **no open children** &rarr; closes!
2. On a second press of `Escape`:
   - `SubSubMenu` is now closed.
   - `SubMenu` has no open children &rarr; closes!

This gives perfect LIFO (last-in, first-out) dismissal across any depth with zero race conditions.

### Cascading Teardown with `node.traverse`

Closing a parent node does not cascade on its own (`node.setOpen` remains focused). When parent teardown must close all open descendants, traverse the subtree bottom-up using `node.traverse`:

```ts
node.traverse(
  (descendant, depth) => {
    if (depth > 0 && descendant.open.value) {
      descendant.setOpen(false, "programmatic");
    }
  },
  { order: "bottom-up" },
);
```

Walking `'bottom-up'` closes open descendants from the innermost child outward so no orphaned submenus remain visible.

---

## Contextual Teleportation (DOM-First)

Rather than blindly teleporting every floating surface to `document.body`, prioritize teleporting to the **nearest contextual container** (such as an enclosing Dialog Root or Popover boundary):

```html
<!-- DOM Hierarchy preserved inside Dialog Root -->
<div class="dialog-root" data-portal-target>
  <div class="dialog-content">
    <button ref="dropdownTrigger">Country</button>
  </div>

  <!-- Teleported here (inside dialog root, NOT to <body>) -->
  <div class="dropdown-content">
    <div class="option">Canada</div>
  </div>
</div>
```

### Key Benefits:
1. **Physical DOM Ancestry Preserved:** Standard `dialogRoot.contains(target)` naturally returns `true` for nested controls.
2. **Native Focus Traps Remain Intact:** [`useFocusTrap`](/api/use-focus-trap) on the modal requires zero custom exclusion allowlists for nested controls.
3. **Top-Layer Alignment:** Integrates seamlessly with native HTML `<dialog>` and Popover API.

---

## Where to Go Next

- Read the tutorial on [Build Nested Menus](/guide/build-nested-menus).
- Read the [useFloatingNode API Reference](/api/use-floating-node).
- Read the [useRovingFocus API Reference](/api/use-roving-focus).
- Read the [Types & Interfaces Reference](/api/types).
