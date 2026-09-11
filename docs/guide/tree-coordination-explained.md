---
description: Understand how VFloat coordinates nested overlays, submenus, and hierarchical floating surfaces.
---

# Tree Coordination Explained

Coordinating nested and hierarchical floating components (like multi-level submenus, dropdowns inside dialogs, or cascading popovers) is notoriously difficult. If you try to coordinate them using DOM parent-child relationships, you quickly run into issues:

- **Teleportation gaps.** Nested floating panels are frequently teleported to `<Teleport to="body">` to avoid CSS overflow clipping. When portals move elements out of their original DOM positions, standard DOM selectors like `.parentNode` or `.contains()` break.
- **Premature dismissal.** An outside-click listener on a parent modal or menu will assume a click inside a teleported child overlay was "outside" and close the parent.
- **Escape key collisions.** Pressing `Escape` can trigger all open overlay listeners simultaneously instead of popping the topmost overlay.

VFloat solves these problems with an explicit tree ([`useFloatingTree`](/api/use-floating-tree)): nodes stay standalone until they join a tree with `tree.addNode()`.

---

## The floating family tree

Every floating surface creates a node with [`useFloatingNode`](/api/use-floating-node). When an overlay is anchored to another floating surface, registering both in the same tree links them as one family:

```ts
import { useFloatingNode, useFloatingTree } from "v-float";

// Parent Floating Surface (such as a Dialog or Root Menu)
const tree = useFloatingTree();
const rootNode = useFloatingNode({ anchorEl, floatingEl });

// Child Floating Surface (such as a Select Dropdown or Submenu)
const childNode = useFloatingNode({ anchorEl: triggerEl, floatingEl: childPanelEl });

tree.addNode(rootNode);
tree.addNode(childNode, rootNode.id); // Establishes the overlay hierarchy
```

Hierarchy lives in the tree's map, never on the node objects. Each tree is isolated, parents must register before children, and nodes unregister automatically when their effect scope disposes.

---

## What tree coordination solves

### Teleportation-safe outside clicks

When a user clicks inside a child submenu or select dropdown teleported to `<body>`, the parent's [`useDismiss`](/api/use-dismiss) outside-press handler checks:
_"Is this click inside my floating element or any of my registered descendant floating elements?"_
Because the child joined the same tree, the click is recognized as internal, preventing unwanted closures. Pass the tree explicitly: `useDismiss(rootNode, { tree })` to share one tree across outside and Escape dismissal.

### Stacked Escape key handling

When `Escape` is pressed, [`useDismiss`](/api/use-dismiss) with `tree` resolves the deepest open node and dismisses only that overlay first. Subsequent `Escape` presses pop each remaining overlay in reverse order, and the same `tree` keeps the outside-press channel consistent across nested stacks.

### Explicit cascading teardown

Closing a parent never cascades on its own: `node.setOpen` stays tree-agnostic. When parent teardown must close the family, execute across descendants bottom-up using [`tree.forEach`](/api/use-floating-tree):

```ts
tree.forEach(
  rootNode.id,
  "descendants",
  (descendant) => {
    if (descendant.open.value) {
      descendant.setOpen(false, "programmatic");
    }
  },
  { order: "bottom-up" },
);
```

Walking `'bottom-up'` closes open descendants from the innermost child outward so no orphaned submenus remain visible.

---

## Combining with roving focus

For multi-level menus and lists, pair each floating level with [`useRovingFocus`](/api/use-roving-focus) for physical item focus:

- The root menu navigates root items with `useRovingFocus(rootNode, { elementsList, tree })`.
- Each submenu navigates its items with `useRovingFocus(subNode, { elementsList, tree })`.
- `ArrowRight` on a submenu item enters the child submenu through `onEnter`.
- `ArrowLeft` inside a child submenu exits through `onExit`, closing the child and refocusing the parent trigger.

---

## Where to go next

- Read the tutorial on [Build Nested Menus](/guide/build-nested-menus).
- Read the [useFloatingNode API Reference](/api/use-floating-node).
- Read the [useFloatingTree API Reference](/api/use-floating-tree).
- Read the [useRovingFocus API Reference](/api/use-roving-focus).
