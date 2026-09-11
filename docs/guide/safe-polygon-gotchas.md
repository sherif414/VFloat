---
description: Avoid common safe polygon edge cases when moving between surfaces.
---

# Safe Polygon Gotchas

`safePolygon` can make hover-based floating UI feel much better, but it can also make a surface feel oddly sticky if you apply it without thinking about the pointer path.

## What problem it solves

When there is a visible gap between the trigger and the floating element, a plain `pointerleave` close is often too eager. The user leaves the trigger while moving toward the floating content, and the UI closes before they get there.

`safePolygon` keeps the surface open while the pointer travels through a protected corridor between the anchor and the floating element.

It is an option of [`useHover`](/api/use-hover), which opens and closes with reason `hover` and never closes a surface pinned by another reason.

Enabling the corridor with defaults takes one option:

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useFloatingNode, useHover } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const context = useFloatingNode({ anchorEl, floatingEl });

useHover(context, { safePolygon: true });
</script>
```

Passing `true` enables the corridor with defaults (`buffer: 1`, `requireIntent: true`); pass an object to tune them. The option defaults to `false`.

## The main tradeoff

The more forgiving the corridor becomes, the less tightly it matches the visible UI. That can create a strange feeling where the pointer appears to have left the UI, but the surface stays open because the safe area is larger than it looks.

## Debug the corridor if hover feels wrong

If the behavior feels surprising, pass `safePolygon: { onPolygonChange }` to inspect the polygon while debugging. Clearing the corridor (on close or re-enter) reports an empty polygon.

For nested menus, pass the same `tree` from [`useFloatingTree`](/api/use-floating-tree) to `useHover` so moving into a descendant's elements does not close the parent.

## Where to go next

- Read [Build Accessible Tooltips](/guide/build-accessible-tooltips) for the main workflow.
- Read [Build Nested Menus](/guide/build-nested-menus) if the hover corridor problem shows up in submenu behavior.
