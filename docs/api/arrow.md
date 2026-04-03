# arrow

`arrow` positions an arrow element so it points toward the reference element and exposes the resulting coordinates through the floating context middleware data.

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

  The middleware writes its result to `context.position.middlewareData.value.arrow`. That data is usually consumed by `useArrow()`, or by a small computed style object when you want to place the arrow manually.

- Example

  ```vue
  <script setup lang="ts">
  import { computed, ref } from "vue";
  import { arrow, offset, useFloating } from "v-float";

  const anchorEl = ref<HTMLElement | null>(null);
  const floatingEl = ref<HTMLElement | null>(null);
  const arrowEl = ref<HTMLElement | null>(null);
  const open = ref(true);

  const context = useFloating(anchorEl, floatingEl, {
    open,
    placement: "top",
    middlewares: [offset(8), arrow({ element: arrowEl, padding: 8 })],
  });

  const arrowStyles = computed(() => {
    const data = context.position.middlewareData.value.arrow;
    const styles: Record<string, string> = {};

    if (!data) return styles;
    if (data.x != null) styles.left = `${data.x}px`;
    if (data.y != null) styles.top = `${data.y}px`;

    return styles;
  });
  </script>

  <template>
    <button ref="anchorEl">Anchor</button>

    <div v-if="context.state.open.value" ref="floatingEl" :style="context.position.styles.value">
      <div ref="arrowEl" style="position: absolute" :style="arrowStyles">^</div>
      Floating content
    </div>
  </template>
  ```

- See also
  - [useArrow](/api/use-arrow) - Registers and styles the arrow element from the floating context
  - [useFloating](/api/use-floating) - Core positioning composable
  - [offset](/api/offset) - Adds spacing between the anchor and floating element
