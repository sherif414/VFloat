---
description: Avoid common safe polygon edge cases when moving between surfaces.
---

# Safe Polygon Gotchas

`safePolygon` can make hover-based floating UI feel much better, but it can also make a surface feel oddly sticky if you apply it without thinking about the pointer path.

## What Problem It Solves

When there is a visible gap between the trigger and the floating element, a plain `pointerleave` close is often too eager. The user leaves the trigger while moving toward the floating content, and the UI closes before they get there.

`safePolygon` keeps the surface open while the pointer travels through a protected corridor between the anchor and the floating element.

## The Main Tradeoff

The more forgiving the corridor becomes, the less tightly it matches the visible UI. That can create a strange feeling where the pointer appears to have left the UI, but the surface stays open because the safe area is larger than it looks.

## Debug The Corridor If Hover Feels Wrong

If the behavior feels surprising, use `onPolygonChange` to inspect the polygon while debugging.

## Next Step

- Read [Build Accessible Tooltips](/guide/build-accessible-tooltips) for the main workflow.
- Read [Build Nested Menus](/guide/build-nested-menus) if the hover corridor problem shows up in submenu behavior.
