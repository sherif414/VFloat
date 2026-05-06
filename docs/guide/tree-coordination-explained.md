---
description: Understand how floating trees coordinate nested and related surfaces.
---

# Tree Coordination Explained

Tree coordination is the part of VFloat that usually makes nested floating systems feel intentional instead of improvised.

If you only think about placement, nested menus can look correct while still behaving badly. Tree coordination is the layer that answers the relationship questions between related floating surfaces.

## The Problem It Solves

Positioning alone cannot answer:

- which branch is active
- which submenu should close when a sibling opens
- where focus should return when a child closes
- how Escape should behave across the active branch

Those are all tree problems.

## What The Tree Tracks

A floating tree keeps a shared registry of related nodes and helps track which node is active, what the active branch path is, and how to close all, a branch, children, or siblings.

That gives other composables a way to ask relationship-aware questions instead of acting like every surface is isolated.

## Explicit Relationships

Tree coordination is opt-in. Create one [`useFloatingTree`](/api/use-floating-tree) for a related family, pass that tree to the root [`useFloatingTreeNode`](/api/use-floating-tree-node), then pass the root node as `parent` for child branches.

VFloat does not discover this relationship through DOM ancestry or Vue injection. That matters because floating panels are often rendered through `<Teleport>`, where the DOM tree no longer matches the logical menu or dialog tree.

## Policy Boundaries

The tree owns branch policies such as sibling collapse and descendant cascade. Those defaults are configured on [`useFloatingTree`](/api/use-floating-tree), not on individual nodes.

Interaction composables still own the behavior they understand best. For example, [`useListNavigation`](/api/use-list-navigation) owns submenu keyboard handoff and return-index behavior, while tree helpers only route branch-aware close and containment decisions.

## Next Step

- Read [Build Nested Menus](/guide/build-nested-menus) for the implementation flow.
- Read [Tree Debugging](/guide/tree-debugging) if a branch is behaving strangely.
