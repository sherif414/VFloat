# offset

`offset` adds distance between the reference element and the floating element.

- Type

  ```ts
  function offset(value?: OffsetValue | OffsetFunction): Middleware;

  type OffsetValue = number | OffsetOptions;
  type OffsetFunction = (args: OffsetFunctionArgs) => OffsetValue;

  interface OffsetOptions {
    mainAxis?: number;
    crossAxis?: number;
    alignmentAxis?: number | null;
  }

  interface OffsetFunctionArgs {
    placement: Placement;
    rects: ElementRects;
    elements: Elements;
  }
  ```

- Details

  A numeric value is shorthand for `mainAxis`. Use an options object when you need separate control over the main axis, cross axis, or alignment axis. Use a function when the offset needs to depend on the current placement or element sizes.

  `mainAxis` follows the placement direction, `crossAxis` is perpendicular to it, and `alignmentAxis` overrides the cross-axis offset for aligned placements such as `top-start`.

- Example

  ```vue
  <script setup lang="ts">
  import { ref } from "vue";
  import { offset, useFloating } from "v-float";

  const anchorEl = ref<HTMLElement | null>(null);
  const floatingEl = ref<HTMLElement | null>(null);

  const context = useFloating(anchorEl, floatingEl, {
    middlewares: [offset(10)],
  });
  </script>

  <template>
    <button ref="anchorEl">Anchor</button>

    <div v-if="context.open.value" ref="floatingEl" :style="context.floatingStyles">
      Floating content
    </div>
  </template>
  ```

- See also
  - [arrow](/api/arrow) - Keeps the arrow away from the edge
  - [flip](/api/flip) - Chooses another placement when space is limited
  - [shift](/api/shift) - Keeps the floating element in view
