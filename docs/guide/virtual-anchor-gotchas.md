---
description: Avoid pitfalls when using virtual anchors for cursor-based positioning.
---

# Virtual Anchor Gotchas

Virtual anchors are powerful because they let you position against geometry instead of a real element. They are also easier to misuse because the anchor is synthetic.

## The first trap: choosing the wrong tracking mode

If the surface should stay at the opening point, use static tracking. If it should follow the cursor, use follow mode.

Choose the mode up front when you wire up [`useClientPoint`](/api/use-client-point):

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useClientPoint, useFloatingNode } from "v-float";

const trackingAreaEl = ref<HTMLElement | null>(null);
const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const context = useFloatingNode({ anchorEl, floatingEl });

useClientPoint(context, {
  trackingAreaEl,
  trackingMode: "follow",
});
</script>
```

Most jumpy menu bugs come from using a moving anchor for a UI that should have stayed still.

`useClientPoint` overwrites `node.refs.anchorEl` with a virtual element; the `anchorEl` you passed to `useFloatingNode` is only a placeholder. `trackingAreaEl` defaults to `document.documentElement`, `trackingMode` defaults to `"follow"`, and `trackingMode` is not reactive after setup; pick `"follow"` or `"static"` before the composable runs. When both `x` and `y` resolve to non-null numbers, the composable enters controlled mode and pointer tracking detaches.

## The second trap: forgetting the anchor is not a real trigger

A virtual anchor has geometry, but it does not carry all the semantics of a real button or input.

That means you still need to think carefully about focus ownership, ARIA relationships, and who actually triggers open and close.

## Where to go next

- Read [Use Virtual Anchors](/guide/use-virtual-anchors) for the main workflows.
- Read [Placement and Positioning](/guide/placement-and-positioning) if you want the geometry model behind virtual anchors.
