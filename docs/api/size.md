# size

`size` provides the available width and height around the floating element so you can resize it to fit the current boundary.

- Type

  ```ts
  function size(options?: SizeOptions): Middleware;

  interface SizeOptions {
    apply?: (state: SizeState) => void;
    padding?: Padding;
    boundary?: Boundary;
    rootBoundary?: RootBoundary;
    elementContext?: ElementContext;
    altBoundary?: boolean;
  }

  interface SizeState {
    availableWidth: number;
    availableHeight: number;
    rects: MiddlewareState["rects"];
    elements: {
      floating: HTMLElement;
      reference: Element | VirtualElement;
    };
  }
  ```

- Details

  `size` does not resize anything on its own. Use the `apply` callback to write styles such as `maxWidth`, `maxHeight`, or a matched reference width.

  This middleware is useful for menus, popovers, and other surfaces that need to stay inside the viewport without overflowing.

- Example

  ```vue
  <script setup lang="ts">
  import { ref } from "vue";
  import { size, useFloating } from "v-float";

  const anchorEl = ref<HTMLElement | null>(null);
  const floatingEl = ref<HTMLElement | null>(null);

  const context = useFloating(anchorEl, floatingEl, {
    middlewares: [
      size({
        apply({ availableWidth, availableHeight, elements }) {
          Object.assign(elements.floating.style, {
            maxWidth: `${availableWidth}px`,
            maxHeight: `${availableHeight}px`,
          });
        },
      }),
    ],
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
  - [shift](/api/shift) - Keeps the floating element in view
  - [flip](/api/flip) - Chooses another placement when room is tight
