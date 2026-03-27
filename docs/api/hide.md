# hide

`hide` exposes visibility data so you can hide a floating element when the reference is clipped or the floating element escapes its boundary.

- Type

  ```ts
  function hide(options?: HideOptions): Middleware;

  interface HideOptions {
    strategy?: "referenceHidden" | "escaped";
    padding?: Padding;
    boundary?: Boundary;
    rootBoundary?: RootBoundary;
    elementContext?: ElementContext;
    altBoundary?: boolean;
  }

  interface HideData {
    referenceHidden?: boolean;
    escaped?: boolean;
  }
  ```

- Details

  Use `referenceHidden` when you want to hide the floating element if its anchor is fully obscured. Use `escaped` when you want to know whether the floating element has moved outside its clipping context.

  The middleware does not hide anything by itself. It only writes data to `middlewareData.hide`, which you can map to `visibility`, `display`, or an accessibility state.

- Example

  ```vue
  <script setup lang="ts">
  import { computed, ref } from "vue";
  import { hide, useFloating } from "v-float";

  const anchorEl = ref<HTMLElement | null>(null);
  const floatingEl = ref<HTMLElement | null>(null);

  const context = useFloating(anchorEl, floatingEl, {
    middlewares: [hide()],
  });

  const visibility = computed(() => {
    return context.middlewareData.value.hide?.referenceHidden ? "hidden" : "visible";
  });
  </script>

  <template>
    <button ref="anchorEl">Anchor</button>

    <div
      v-if="context.open.value"
      ref="floatingEl"
      :style="{ ...context.floatingStyles, visibility }"
    >
      Floating content
    </div>
  </template>
  ```

- See also
  - [shift](/api/shift) - Keeps the floating element in view
  - [flip](/api/flip) - Moves to a better placement when space is limited
