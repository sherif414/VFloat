---
description: Understand how VFloat coordinates nested overlays, submenus, and hierarchical floating surfaces.
---

# Overlay Hierarchy Coordination

Coordinating nested and hierarchical floating components (like multi-level submenus, dropdowns inside dialogs, or cascading popovers) is notoriously difficult. If you try to coordinate them using DOM parent-child relationships, you quickly run into issues:

- **Teleportation gaps:** Nested floating panels are frequently teleported to `<Teleport to="body">` to avoid CSS overflow clipping. When portals move elements out of their original DOM positions, standard DOM selectors like `.parentNode` or `.contains()` break.
- **Premature Dismissal:** An outside-click listener on a parent modal or menu will assume a click inside a teleported child overlay was "outside" and close the parent.
- **Escape Key Collisions:** Pressing `Escape` can trigger all open overlay listeners simultaneously instead of popping the topmost overlay.

VFloat solves these problems using the **Floating Context Hierarchy** ([`useFloatingContext`](/api/use-floating-context) + `parentContext`).

---

## The Floating Family Registry

Every floating surface creates a `context`. When an overlay is created inside or anchored to another floating surface, passing `parentContext` registers the child in VFloat's internal context registry:

```ts
// Parent Floating Surface (e.g., Dialog or Root Menu)
const rootContext = useFloatingContext({ anchorEl, floatingEl });

// Child Floating Surface (e.g., Select Dropdown or Submenu)
const childContext = useFloatingContext({
  anchorEl: triggerEl,
  floatingEl: childPanelEl,
  parentContext: rootContext, // 🔗 Establishes the overlay hierarchy
});
```

---

## What the Overlay Hierarchy Solves

### 1. Teleportation-Safe Outside Clicks

When a user clicks inside a child submenu or select dropdown teleported to `<body>`, the parent's [`useOutsideClick`](/api/use-outside-click) handler checks:
_"Is this click inside my floating element or any of my registered descendant floating elements?"_
Because the child is linked via `parentContext`, the click is recognized as internal, preventing unwanted closures.

### 2. Stacked Escape Key Handling

When `Escape` is pressed, [`useEscapeKey`](/api/use-escape-key) inspects the context family and dismisses only the deepest open child overlay first. Subsequent `Escape` presses pop each remaining overlay in reverse order.

### 3. Cascading Teardown

When a parent floating context closes (`setOpen(false)`), VFloat automatically closes all descendant floating contexts in reverse depth order, ensuring no orphaned submenus remain visible.

---

## Combining with Collections

For multi-level menus and lists, each level uses a simple [`useCollection`](/api/use-collection) for its own 1D list of items:

- The root menu navigates root items with `useListNavigation(rootContext, { collection: rootCollection })`.
- Each submenu navigates its items with `useListNavigation(subContext, { collection: subCollection })`.
- `ArrowRight` on a submenu item opens the child context and sets active focus to the first item.
- `ArrowLeft` inside a child submenu closes the child context and restores focus to the parent trigger.

---

## Next Steps

- Read the tutorial on [Building Nested Menus](/guide/build-nested-menus).
- Read the [useFloatingContext API Reference](/api/use-floating-context).
- Read the [useCollection API Reference](/api/use-collection).
- Read the [useListNavigation API Reference](/api/use-list-navigation).
