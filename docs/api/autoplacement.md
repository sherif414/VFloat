# autoPlacement

`autoPlacement` chooses the best placement from the available space so the floating element stays in view.

- Type

  ```ts
  function autoPlacement(options?: AutoPlacementOptions): Middleware;

  interface AutoPlacementOptions {
    crossAxis?: boolean;
    alignment?: "start" | "end" | null;
    autoAlignment?: boolean;
    allowedPlacements?: Array<Placement>;
    boundary?: Boundary;
    rootBoundary?: RootBoundary;
    elementContext?: ElementContext;
    altBoundary?: boolean;
    padding?: Padding;
  }
  ```

- Details

  Use `autoPlacement` when the best side matters more than a preferred side. It can evaluate cross-axis placements, respect alignment, and limit the placements it is allowed to choose from.

  If you want to keep a preferred placement and only fall back when needed, `flip()` is usually the better fit.

- Example

```vue
<script setup lang="ts">
import { ref } from "vue";
import { autoPlacement, useFloating } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);
const open = ref(true);

const context = useFloating(anchorEl, floatingEl, {
  open,
  middlewares: [
    autoPlacement({
      allowedPlacements: ["top", "bottom"],
    }),
  ],
});
</script>

<template>
  <button ref="anchorEl">Anchor</button>

  <div v-if="context.state.open.value" ref="floatingEl" :style="context.position.styles.value">
    Floating content
  </div>
</template>
```

- See also
  - [flip](/api/flip) - Keeps a preferred placement and falls back when needed
  - [shift](/api/shift) - Nudges the floating element back into view
  - [useFloating](/api/use-floating) - Core positioning composable
