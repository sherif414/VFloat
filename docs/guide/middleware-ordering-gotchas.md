---
description: Learn why middleware order matters and how it changes positioning results.
---

# Middleware Ordering Gotchas

When middleware behavior feels wrong, the problem is often not that you chose the wrong helpers. It is that the helpers are in the wrong order for the problem you are solving.

## The Core Rule

Middleware is a pipeline. Later steps receive the result of earlier steps.

So if a stack feels wrong, ask:

- What is each middleware trying to solve?
- Does that make sense in this order?

## A Sensible Baseline

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

That order reads naturally, and it matches the order VFloat applies semantic middleware (`inline`, then `offset`, then `flip`, then `shift`, then `matchWidth`, then `custom`):

- create distance
- choose a viable side
- keep the surface visible

Use `middlewares` for declarative options and `middlewares.custom` for raw Floating UI middleware; `custom` entries run after the built-ins.

## Next Step

- Read [Keep Content in View](/guide/keep-content-in-view) for practical stacks.
- Read [Middleware Pipeline](/guide/middleware-pipeline) for the conceptual model behind the order.
