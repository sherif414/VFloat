---
description: Keep floating content within the viewport with middleware and sizing rules.
---

# Keep Content in View

Base placement gets you close. Real floating surfaces still run into viewport edges, scroll containers, and size limits. That is where `middlewares` options help.

This guide treats middleware like a small set of fixes. When you notice a problem, pick the fix that matches it.

## Start from the problem

The easiest way to reason about middleware is to ask:

- Does the surface need space from the anchor?
- Does it need to change sides when space runs out?
- Does it need to stay inside visible boundaries?
- Does it need to resize itself?
- Does it need an arrow?

Each of those problems maps to a middleware or helper.

## The standard baseline stack

This is the stack many production surfaces end up using first.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useFloatingNode, usePosition } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);
const open = ref(true);

const context = useFloatingNode({
  anchorEl,
  floatingEl,
  open,
});
const { styles } = usePosition(context, {
  placement: "bottom-start",
  middlewares: {
    offset: 8,
    flip: true,
    shift: { padding: 8 },
  },
});
</script>
```

Read this stack from left to right:

- `middlewares.offset: 8` creates a visual gap
- `middlewares.flip: true` switches sides when the preferred side does not fit
- `middlewares.shift: { padding: 8 }` nudges the panel back into view when needed

## Add space from the trigger

Use [`offset`](/api/offset) to create space between the anchor and the floating panel:

```ts
middlewares: {
  offset: 8,
}
```

## Flip when the preferred side runs out of room

Use [`flip`](/api/flip) to try opposite or fallback placements when the preferred side runs out of room:

```ts
middlewares: {
  offset: 8,
  flip: true,
}
```

## Shift to stay inside viewport boundaries

Use [`shift`](/api/shift) to slide the floating panel along its cross-axis so it stays within the visible viewport:

```ts
middlewares: {
  offset: 8,
  flip: true,
  shift: { padding: 8 },
}
```

## Match anchor width or constrain height

Use `matchWidth` to automatically lock the panel's width to the trigger's width (common for select dropdowns and comboboxes), or `size` for custom dimension constraints:

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useFloatingNode, usePosition } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);
const open = ref(true);

const context = useFloatingNode({
  anchorEl,
  floatingEl,
  open,
});
const { styles } = usePosition(context, {
  placement: "bottom-start",
  middlewares: {
    offset: 8,
    flip: true,
    shift: { padding: 8 },
    matchWidth: true, // matches anchor element width
    size: {
      apply({ availableHeight }) {
        if (!floatingEl.value) return;

        Object.assign(floatingEl.value.style, {
          maxHeight: `${availableHeight - 16}px`,
        });
      },
    },
  },
});
</script>
```

## Pick the roomiest side with auto-placement

Use [`autoPlacement`](/api/autoplacement) when you want VFloat to inspect available space across all sides and pick the roomiest side dynamically:

```ts
middlewares: {
  offset: 8,
  autoPlacement: true,
  shift: { padding: 8 },
}
```

Note that `autoPlacement` and `flip` are mutually exclusive strategies. Choose `flip` when you have a preferred side with fallbacks, or `autoPlacement` when any roomy side is acceptable.

## Point an arrow back at the anchor

Use [`useArrow`](/api/use-arrow) to position a pointed indicator element and compute its alignment styles:

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useArrow, useFloatingNode, usePosition } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);
const arrowEl = ref<HTMLElement | null>(null);
const open = ref(true);

const context = useFloatingNode({
  anchorEl,
  floatingEl,
  arrowEl,
  open,
});
const { styles } = usePosition(context, {
  middlewares: {
    offset: 8,
    flip: true,
    shift: { padding: 8 },
  },
});

const { arrowStyles } = useArrow(context);
</script>
```

`useArrow(context)` registers the arrow middleware into the positioning registry and returns reactive `arrowStyles` to bind to your arrow element.

## Middleware order matters

Order is not a cosmetic detail. Middlewares run sequentially, each transforming the coordinates produced by earlier steps.

When using declarative `middlewares` options, VFloat executes them in canonical order:

1. **`inline`.** Resolves multi-line anchor geometry.
2. **`offset`.** Establishes the gap before collision checks.
3. **`flip` or `autoPlacement`.** Selects the best viable placement.
4. **`shift`.** Nudges the surface inside viewport boundaries.
5. **`matchWidth` or `size`.** Applies width and height constraints.
6. **`hide`.** Computes visibility when anchor is clipped.
7. **`arrow`.** Centers the arrow against the final surface position.
8. **`custom`.** Executes user-provided raw middleware functions.

If you pass a raw array to `middlewares` (`middlewares: [offset(8), flip(), shift()]`), you control the exact sequence yourself.

## Where to go next

- Read [Middleware Pipeline](/guide/middleware-pipeline) for the architectural mental model.
- Read [Middleware Ordering Gotchas](/guide/middleware-ordering-gotchas) to diagnose subtle collision bugs.
- Read [Build Popovers and Dropdowns](/guide/build-popovers-and-dropdowns) to see middleware inside a real component.
