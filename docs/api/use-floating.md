# useFloating

`useFloating` is the composition root for VFloat. It keeps the stable `useFloating(anchorEl, floatingEl, options)` call signature while returning grouped `refs`, `state`, and `position` sections.

- Type

  ```ts
  function useFloating(
    anchorEl: Ref<AnchorElement>,
    floatingEl: Ref<FloatingElement>,
    options?: UseFloatingOptions,
  ): FloatingContext;

  type AnchorElement = HTMLElement | VirtualElement | null;

  type FloatingElement = HTMLElement | null;

  interface UseFloatingOptions {
    placement?: MaybeRefOrGetter<Placement | undefined>;
    strategy?: MaybeRefOrGetter<Strategy | undefined>;
    transform?: MaybeRefOrGetter<boolean | undefined>;
    middlewares?: MaybeRefOrGetter<Middleware[]>;
    autoUpdate?: boolean | AutoUpdateOptions;
    open?: Ref<boolean>;
    onOpenChange?: (open: boolean, reason: OpenChangeReason, event?: Event) => void;
  }

  interface FloatingContext {
    refs: {
      anchorEl: Ref<AnchorElement>;
      floatingEl: Ref<FloatingElement>;
      arrowEl: Ref<HTMLElement | null>;
      setAnchor: (value: AnchorElement) => void;
      setFloating: (value: FloatingElement) => void;
      setArrow: (value: HTMLElement | null) => void;
    };
    state: {
      open: Readonly<Ref<boolean>>;
      setOpen: (open: boolean, reason?: OpenChangeReason, event?: Event) => void;
    };
    position: {
      x: Readonly<Ref<number>>;
      y: Readonly<Ref<number>>;
      strategy: Readonly<Ref<Strategy>>;
      placement: Readonly<Ref<Placement>>;
      middlewareData: Readonly<Ref<MiddlewareData>>;
      isPositioned: Readonly<Ref<boolean>>;
      styles: Readonly<Ref<FloatingStyles>>;
      update: () => void;
    };
  }
  ```

- Details

  `useFloating` owns the shared context for positioning and interactions. Interaction composables read and write `context.state.open`, while positioning-focused code uses `context.position`.
  - The call shape stays `useFloating(anchorEl, floatingEl, options)`.
  - `placement` defaults to `"bottom"`.
  - `strategy` defaults to `"absolute"`.
  - `transform` is enabled by default and writes coordinates as a CSS transform.
  - `middlewares` still accepts the Floating UI-style middleware pipeline.
  - `autoUpdate` is enabled by default. Pass `false` to disable it, or pass an `AutoUpdateOptions` object to forward advanced options.
  - `open` defaults to `ref(false)`. If you pass your own ref, `useFloating` reuses it as the shared state source.
  - `state.setOpen(open, reason?, event?)` updates the shared open state and calls `onOpenChange`. Missing reasons fall back to `"programmatic"`.
  - `position.styles` is the style ref you bind to the floating element in templates.

- Example

  This example shows the preserved call signature with the grouped return shape.

  ```vue
  <script setup lang="ts">
  import { ref } from "vue";
  import { offset, useFloating } from "v-float";

  const anchorEl = ref<HTMLElement | null>(null);
  const floatingEl = ref<HTMLElement | null>(null);

  const context = useFloating(anchorEl, floatingEl, {
    placement: "bottom-start",
    middlewares: [offset(8)],
  });
  </script>

  <template>
    <button ref="anchorEl" @click="context.state.setOpen(!context.state.open.value)">Toggle</button>

    <div v-if="context.state.open.value" ref="floatingEl" :style="context.position.styles.value">
      Floating content
    </div>
  </template>
  ```

- See also
  - [useClick](/api/use-click) - Click-based activation
  - [useHover](/api/use-hover) - Hover-based activation
  - [useArrow](/api/use-arrow) - Explicit arrow registration
  - [useClientPoint](/api/use-client-point) - Swap the anchor for a virtual pointer-based anchor
- [Floating Context](/guide/floating-context) - Context mental model
