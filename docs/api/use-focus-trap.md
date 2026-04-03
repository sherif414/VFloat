# useFocusTrap

`useFocusTrap` keeps keyboard focus inside the floating element while it is open.

## Type

```ts
function useFocusTrap(
  context: UseFocusTrapContext,
  options?: UseFocusTrapOptions,
): UseFocusTrapReturn;

interface UseFocusTrapContext {
  state: FloatingContext["state"];
  refs: FloatingContext["refs"];
}

interface UseFocusTrapOptions {
  enabled?: MaybeRefOrGetter<boolean>;
  modal?: MaybeRefOrGetter<boolean>;
  initialFocus?: HTMLElement | (() => HTMLElement | false) | string | false;
  returnFocus?: MaybeRefOrGetter<boolean>;
  closeOnFocusOut?: MaybeRefOrGetter<boolean>;
  preventScroll?: MaybeRefOrGetter<boolean>;
  outsideElementsInert?: MaybeRefOrGetter<boolean>;
  onError?: (error: unknown) => void;
}

interface UseFocusTrapReturn {
  isActive: ComputedRef<boolean>;
  activate: () => void;
  deactivate: () => void;
}
```

## Details

`useFocusTrap` is the right interaction layer for dialogs and other modal surfaces. It can make the floating content modal, move initial focus, return focus on close, and optionally deactivate on outside click when you do not want a modal trap.

- `modal` controls whether the trap behaves like a modal dialog.
- Despite the option name, `closeOnFocusOut` currently deactivates the trap on outside click when `modal` is `false`.
- `initialFocus` can be an element, selector, function, or `false`.
- `returnFocus` defaults to `true`.
- `preventScroll` defaults to `true`.
- `onError` receives activation errors when the trap cannot be created.

## Example

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useFocusTrap, useFloating } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);
const open = ref(false);

const context = useFloating(anchorEl, floatingEl, {
  open,
  onOpenChange: (value) => {
    open.value = value;
  },
});

useFocusTrap(context, { modal: true });
</script>

<template>
  <button ref="anchorEl" @click="context.state.setOpen(!context.state.open.value)">
    Open dialog
  </button>

  <Teleport to="body">
    <div v-if="context.state.open.value" class="backdrop">
      <div
        ref="floatingEl"
        :style="context.position.styles.value"
        role="dialog"
        aria-modal="true"
        tabindex="-1"
      >
        <h2>Dialog</h2>
        <input placeholder="Focus stays inside" />
        <button @click="context.state.setOpen(false)">Close</button>
      </div>
    </div>
  </Teleport>
</template>
```

## See Also

- [`useEscapeKey`](/api/use-escape-key)
- [`useFocus`](/api/use-focus)
- [`useListNavigation`](/api/use-list-navigation)
