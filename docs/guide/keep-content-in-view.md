---
description: Keep floating content within the viewport with middleware and sizing rules.
---

# Keep Content in View

Base placement is only the start of positioning. Real floating surfaces collide with viewport edges, sit near scroll containers, and sometimes need arrows or size constraints. That is what `middlewares` are for.

This guide shows how to use middleware as a problem-solving tool instead of a grab bag of options.

## Think In Problems, Not In Middleware Names

The simplest way to reason about middleware is to ask:

- Does the surface need space from the anchor?
- Does it need to change sides when space runs out?
- Does it need to stay inside visible boundaries?
- Does it need to resize itself?
- Does it need an arrow?

Each of those problems maps to a middleware or helper.

## Start With The Most Common Stack

This is the stack many production surfaces end up using first.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { flip, offset, shift, useFloating } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);
const open = ref(true);

const context = useFloating(anchorEl, floatingEl, {
  open,
  placement: "bottom-start",
  middlewares: [offset(8), flip(), shift({ padding: 8 })],
});
</script>
```

Read this stack from left to right:

- `offset(8)` creates a visual gap
- `flip()` switches sides when the preferred side does not fit
- `shift({ padding: 8 })` nudges the panel back into view when needed

## Problem 1: "The Surface Feels Jammed Against The Trigger"

Use [`offset`](/api/offset).

## Problem 2: "The Preferred Side Does Not Fit"

Use [`flip`](/api/flip).

## Problem 3: "It Still Overflows Even After Flipping"

Use [`shift`](/api/shift).

## Problem 4: "The Panel Should Match Width Or Fit Height"

Use [`size`](/api/size).

```vue
<script setup lang="ts">
import { ref } from "vue";
import { flip, offset, shift, size, useFloating } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);
const open = ref(true);

const context = useFloating(anchorEl, floatingEl, {
  open,
  placement: "bottom-start",
  middlewares: [
    offset(8),
    flip(),
    shift({ padding: 8 }),
    size({
      apply({ rects, availableHeight }) {
        if (!floatingEl.value) return;

        Object.assign(floatingEl.value.style, {
          minWidth: `${rects.reference.width}px`,
          maxHeight: `${availableHeight - 16}px`,
        });
      },
    }),
  ],
});
</script>
```

## Problem 5: "I Want The Best Side Automatically"

Use [`autoPlacement`](/api/autoplacement) when the exact side is less important than finding the side with the most room.

## Problem 6: "I Need An Arrow"

Use the [`arrow`](/api/arrow) middleware with [`useArrow`](/api/use-arrow).

```vue
<script setup lang="ts">
import { ref } from "vue";
import { arrow, offset, useArrow, useFloating } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);
const arrowEl = ref<HTMLElement | null>(null);
const open = ref(true);

const context = useFloating(anchorEl, floatingEl, {
  open,
  middlewares: [offset(8), arrow({ element: arrowEl })],
});

const { arrowStyles } = useArrow(context, {
  element: arrowEl,
});
</script>
```

## Middleware Order Matters

Order is not a formatting detail. It changes outcomes.

A common baseline order is:

1. `offset`
2. `flip` or `autoPlacement`
3. `shift`
4. `size`
5. `arrow`

If you want more detail, read [Middleware Pipeline](/guide/middleware-pipeline) and [Middleware Ordering Gotchas](/guide/middleware-ordering-gotchas).

## Next Step

- Read [Middleware Pipeline](/guide/middleware-pipeline) if you want the deeper mental model.
- Read [Middleware Ordering Gotchas](/guide/middleware-ordering-gotchas) if a stack is behaving strangely.
- Read [Build Popovers and Dropdowns](/guide/build-popovers-and-dropdowns) to see middleware inside a full click-driven surface.
