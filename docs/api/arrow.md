# arrow

`arrow` positions an arrow element so it points toward the reference element and exposes the resulting coordinates through `middlewareData.arrow`.

- Type

  ```ts
  function arrow(options: ArrowMiddlewareOptions): Middleware;

  interface ArrowMiddlewareOptions {
    element: Ref<HTMLElement | null>;
    padding?: Padding;
  }

  interface ArrowData {
    x?: number;
    y?: number;
    centerOffset: number;
  }
  ```

- Details

  `arrow` is a thin wrapper around Floating UI's arrow middleware. Pass the arrow element ref through `element`, and use `padding` to keep the arrow away from the edges of the floating element.

  The middleware writes its result to `middlewareData.arrow`. That data is usually consumed by `useArrow()`, or by a small computed style object when you want to place the arrow manually.

- Example

  ```vue
  <script setup lang="ts">
  import { computed, ref } from "vue";
  import { arrow, offset, useFloating } from "v-float";

  const anchorEl = ref<HTMLElement | null>(null);
  const floatingEl = ref<HTMLElement | null>(null);
  const arrowEl = ref<HTMLElement | null>(null);

  const context = useFloating(anchorEl, floatingEl, {
    placement: "top",
    middlewares: [offset(8), arrow({ element: arrowEl, padding: 8 })],
  });

  const arrowStyles = computed(() => {
    const data = context.middlewareData.value.arrow;
    const styles: Record<string, string> = {};

    if (!data) return styles;
    if (data.x != null) styles.left = `${data.x}px`;
    if (data.y != null) styles.top = `${data.y}px`;

    return styles;
  });
  </script>

  <template>
    <button ref="anchorEl">Anchor</button>

    <div v-if="context.open.value" ref="floatingEl" :style="context.floatingStyles">
      <div ref="arrowEl" :style="arrowStyles">^</div>
      Floating content
    </div>
  </template>
  ```

- See also
  - [useArrow](/api/use-arrow) - Wires the arrow ref into `useFloating`
  - [useFloating](/api/use-floating) - Core positioning composable
  - [offset](/api/offset) - Adds spacing between the anchor and floating element
