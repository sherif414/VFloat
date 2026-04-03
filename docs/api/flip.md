# flip

`flip` switches to alternative placements when the preferred placement does not fit.

- Type

  ```ts
  function flip(options?: FlipOptions): Middleware;

  interface FlipOptions {
    mainAxis?: boolean;
    crossAxis?: boolean | "alignment";
    fallbackAxisSideDirection?: "none" | "start" | "end";
    flipAlignment?: boolean;
    fallbackPlacements?: Array<Placement>;
    fallbackStrategy?: "bestFit" | "initialPlacement";
  }
  ```

- Details

  `flip` is the common choice when you want to start from a preferred placement and only move elsewhere if that placement overflows. It can also flip alignment, try a custom fallback list, or choose between a best-fit and initial-placement strategy.

- Example

```vue
<script setup lang="ts">
import { ref } from "vue";
import { flip, useFloating } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);
const open = ref(true);

const context = useFloating(anchorEl, floatingEl, {
  open,
  middlewares: [
    flip({
      fallbackPlacements: ["top", "right", "bottom"],
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
  - [autoPlacement](/api/autoplacement) - Picks the best placement automatically
  - [shift](/api/shift) - Keeps the floating element inside the clipping area
  - [offset](/api/offset) - Adds spacing before flip logic runs
