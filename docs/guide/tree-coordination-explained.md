---
description: Understand how VFloat coordinates nested overlays, submenus, and hierarchical floating surfaces.
---

# Overlay Hierarchy Coordination

Coordinating nested and hierarchical floating components (like multi-level submenus, dropdowns inside dialogs, or cascading popovers) is notoriously difficult. If you try to coordinate them using DOM parent-child relationships, you quickly run into issues:

- **Teleportation gaps:** Nested floating panels are frequently teleported to `<Teleport to="body">` to avoid CSS overflow clipping. When portals move elements out of their original DOM positions, standard DOM selectors like `.parentNode` or `.contains()` break.
- **Premature Dismissal:** An outside-click listener on a parent modal or menu will assume a click inside a teleported child overlay was "outside" and close the parent.
- **Escape Key Collisions:** Pressing `Escape` can trigger all open overlay listeners simultaneously instead of popping the topmost overlay.

VFloat solves these problems with an explicit tree ([`useFloatingTree`](/api/use-floating-tree)): nodes stay standalone until they join a tree with `tree.addNode()`.

---

## The Floating Family Tree

Every floating surface creates a node with [`useFloatingNode`](/api/use-floating-node). When an overlay is anchored to another floating surface, registering both in the same tree links them as one family:

```ts
import { useFloatingNode, useFloatingTree } from "v-float";

// Parent Floating Surface (e.g., Dialog or Root Menu)
const tree = useFloatingTree();
const rootNode = useFloatingNode({ anchorEl, floatingEl });

// Child Floating Surface (e.g., Select Dropdown or Submenu)
const childNode = useFloatingNode({ anchorEl: triggerEl, floatingEl: childPanelEl });

tree.addNode(rootNode);
tree.addNode(childNode, rootNode.id); // 🔗 Establishes the overlay hierarchy
```

Hierarchy lives in the tree's map, never on the node objects. Each tree is isolated, parents must register before children, and nodes unregister automatically when their effect scope disposes.

---

## What the Overlay Hierarchy Solves

### 1. Teleportation-Safe Outside Clicks

When a user clicks inside a child submenu or select dropdown teleported to `<body>`, the parent's [`useOutsideClick`](/api/use-outside-click) handler checks:
_"Is this click inside my floating element or any of my registered descendant floating elements?"_
Because the child joined the same tree, the click is recognized as internal, preventing unwanted closures. Pass the tree explicitly: `useOutsideClick(rootNode, { tree })` — or `useDismiss(rootNode, { tree })` to share one tree across outside and Escape dismissal.

### 2. Stacked Escape Key Handling

When `Escape` is pressed, [`useEscapeKey`](/api/use-escape-key) with `tree` resolves the deepest open node and dismisses only that overlay first. Subsequent `Escape` presses pop each remaining overlay in reverse order. [`useDismiss`](/api/use-dismiss) forwards the same `tree` to both channels, so nested stacks stay consistent.

### 3. Explicit Cascading Teardown

Closing a parent never cascades on its own: `node.setOpen` stays tree-agnostic. When parent teardown must close the family, call `tree.closeDescendants(node, reason, event)`, which closes open descendants from the innermost child outward so no orphaned submenus remain visible.

---

## Combining with Collections

For multi-level menus and lists, each level uses a simple [`useCollection`](/api/use-collection) for its own 1D list of values, plus [`useRovingFocus`](/api/use-roving-focus) for physical item focus:

- The root menu navigates root items with `useRovingFocus(rootNode, { elementsList, tree })`.
- Each submenu navigates its items with `useRovingFocus(subNode, { elementsList, tree })`.
- `ArrowRight` on a submenu item enters the child submenu through `onEnter`.
- `ArrowLeft` inside a child submenu exits through `onExit`, closing the child and refocusing the parent trigger.

---

## Next Steps

- Read the tutorial on [Building Nested Menus](/guide/build-nested-menus).
- Read the [useFloatingNode API Reference](/api/use-floating-node).
- Read the [useFloatingTree API Reference](/api/use-floating-tree).
- Read the [useCollection API Reference](/api/use-collection).
- Read the [useRovingFocus API Reference](/api/use-roving-focus).
