---
description: Understand how VFloat coordinates nested lists, menus, and hierarchical elements.
---

# Tree Coordination Explained

Coordinating nested and hierarchical floating components (like multi-level submenus or cascading dropdowns) is notoriously difficult. If you try to coordinate them using DOM hierarchies or component boundaries, you quickly run into issues:

- **Teleportation gaps:** Nested floating panels are frequently teleported to `<Teleport to="body">` to avoid CSS overflow clipping. When portals move elements out of their original DOM positions, standard DOM selectors like `.parentNode` or `.contains()` break.
- **Race conditions:** Managing active indices across multiple nested Vue components often introduces timing synchronization bugs during quick mouse movement or keyboard traversals.

VFloat avoids those issues by keeping nested menu state in a data-first tree managed by [`useTree`](/api/use-tree).

---

## The Tree Model

Instead of every nested submenu tracking its own isolated state and communicating through event buses or nested DOM contexts, **the entire menu family is modeled as a single hierarchical data tree**.

```
           [ root-menu ]  <--- Coordinates activeValue & expandedValues
          /             \
    [ edit ]       [ share-branch ] (Expanded)
                    /             \
             [ share-email ]    [ share-slack ]
```

### The State Registry

A single `useTree` instance maintains:

- **`activeValue`:** A single reactive string value referencing the currently active item anywhere in the visible tree hierarchy.
- **`expandedValues`:** A reactive `Set` containing the IDs of all currently expanded branches.
- **`flattenedItems`:** A computed array of items representing the linear path of currently visible items (e.g. root items + children of any expanded root items).

---

## How Composables Collaborate

This single reactive collection coordinates all interactive behaviors:

1. **`useListNavigation`** handles arrow key, Home, End, and Tab events on the anchor and floating elements, then delegates movement to the collection or emits branch enter/exit callbacks.
2. **`useRole`** applies the semantic role and any item ARIA state you provide through options such as `listRef`, `disabledIndices`, `checkedIndices`, or `selectedIndices`.
3. **Your Component Template** renders the list elements, applying active visual styling when an item matches `tree.activeValue`.

---

## Why Data-First Coordination Helps

- **Teleportation safety:** Because open, collapsed, active, and parent-child state lives in the reactive JavaScript model, teleporting menus to the document body does not break the tree relationship.
- **Predictable Escapes:** Collapsing or closing a submenu can restore focus to the correct parent opener because `useTree()` keeps parent-child relationships in data through helpers such as `tree.getParentValue()`.
- **Resilient Keyboard Traversals:** If nested submenus contain disabled items, the tree can query the data structure with `getFirstEnabledDescendantValue()` to target the next usable choice, or stay on the parent opener if all choices are disabled.

---

## Next Steps

- Follow the step-by-step tutorial to [Build Nested Menus](/guide/build-nested-menus).
- Read the [useTree API Reference](/api/use-tree).
- Read the [useListNavigation API Reference](/api/use-list-navigation).
