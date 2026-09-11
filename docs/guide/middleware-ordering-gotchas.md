---
description: Learn why middleware order matters and how it changes positioning results.
---

# Middleware Ordering Gotchas

When middleware behavior feels wrong, the problem is often not that you chose the wrong helpers. It is that the helpers are in the wrong order for the problem you are solving.

## The core rule

Middleware is a pipeline. Later steps receive the result of earlier steps.

So if a stack feels wrong, ask:

- What is each middleware trying to solve?
- Does that make sense in this order?

## The baseline order

Many stacks work well when they start like this:

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useFloatingNode, usePosition } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const context = useFloatingNode({ anchorEl, floatingEl });
const { styles } = usePosition(context, {
  placement: "bottom",
  middlewares: {
    offset: 8,
    flip: true,
    shift: { padding: 8 },
  },
});
</script>
```

That order reads naturally, and it matches the canonical order VFloat executes semantic middlewares (`inline`, `offset`, `flip` / `autoPlacement`, `shift`, `matchWidth` / `size`, `hide`, `arrow`, then `custom`):

- **`offset`** creates initial clearance from the anchor.
- **`flip`** evaluates whether that clearance leaves room on the preferred side.
- **`shift`** nudges the panel back within viewport bounds after flipping has picked the best side.

Use `middlewares` object notation for declarative options following this canonical sequence, or provide an array (`middlewares: [...]`) when you need custom pipeline execution order.

## Where to go next

- Read [Keep Content in View](/guide/keep-content-in-view) for practical stacks.
- Read [Middleware Pipeline](/guide/middleware-pipeline) for the conceptual model behind the order.
