---
description: Manages modal focus containment, sentinels, background inert isolation, and return focus.
---

# useFocusTrap

`useFocusTrap` confines keyboard focus inside a floating panel. It handles initial focus placement, focus restoration on close, Tab key cycling via DOM sentinels, and background `inert` attribute isolation for modal dialogs.

## Type

```ts
function useFocusTrap(
  node: FloatingNode,
  options?: UseFocusTrapOptions,
): UseFocusTrapReturn;

interface UseFocusTrapOptions {
  enabled?: MaybeRefOrGetter<boolean>;
  modal?: MaybeRefOrGetter<boolean>;
  initialFocus?: HTMLElement | Ref<HTMLElement | null> | (() => HTMLElement | null | false) | false;
  returnFocus?: MaybeRefOrGetter<boolean | HTMLElement | Ref<HTMLElement | null>>;
  guards?: MaybeRefOrGetter<boolean>;
  closeOnFocusOut?: MaybeRefOrGetter<boolean>;
  closeOnTab?: MaybeRefOrGetter<boolean>;
  outsideElementsInert?: MaybeRefOrGetter<boolean>;
  preventScroll?: MaybeRefOrGetter<boolean>;
  ignoreFocusOut?: (target: EventTarget | null) => boolean;
  onError?: (error: unknown) => void;
}

interface UseFocusTrapReturn {
  isActive: ComputedRef<boolean>;
  activate: () => void;
  deactivate: () => void;
}
```

## Options

| Name | Type | Default | Notes |
| --- | --- | --- | --- |
| `enabled` | `MaybeRefOrGetter<boolean>` | `true` | Reactive toggle. Activates focus management while `node.open` is `true`. |
| `modal` | `MaybeRefOrGetter<boolean>` | `true` | When `true`, isolates outside DOM elements and strictly traps Tab navigation inside. |
| `initialFocus` | Element, ref, function, or `false` | First tabbable element | Specifies element to receive focus upon opening. `false` prevents initial focus. |
| `returnFocus` | `boolean`, Element, or ref | `true` | Restores focus to the trigger or target element when the trap deactivates. |
| `guards` | `MaybeRefOrGetter<boolean>` | `true` | Injects invisible boundary sentinels around the floating element to catch portal leaks. |
| `closeOnFocusOut` | `MaybeRefOrGetter<boolean>` | `false` | When `modal: false`, closes `node` when focus leaves the floating family. |
| `closeOnTab` | `MaybeRefOrGetter<boolean>` | `false` | When `modal: false`, closes `node` when pressing Tab on boundaries. |
| `outsideElementsInert` | `MaybeRefOrGetter<boolean>` | `modal` | Isolates background elements using `inert`. Defaults to `true` when `modal: true`. |
| `preventScroll` | `MaybeRefOrGetter<boolean>` | `true` | Prevents browser viewport scrolling when shifting focus. |
| `ignoreFocusOut` | `(target: EventTarget \| null) => boolean` | `undefined` | Custom predicate to ignore focus loss to specific target elements. |
| `onError` | `(error: unknown) => void` | `undefined` | Optional error handler callback if trap activation fails. |

## Returns

| Name | Type | Notes |
| --- | --- | --- |
| `isActive` | `ComputedRef<boolean>` | Reactive status indicating whether focus trapping is currently active. |
| `activate` | `() => void` | Manually activates focus management. |
| `deactivate` | `() => void` | Manually deactivates focus management and restores focus. |

## Details

### Modal Traps vs Non-Modal Overlays

- **Modal Dialogs (`modal: true`):** Focus sentinels wrap the panel. Pressing <kbd>Tab</kbd> on the last element wraps back to the first. Background DOM elements outside the floating family are marked `inert` to prevent screen readers or pointer clicks from escaping.
- **Non-Modal Overlays (`modal: false`):** Sentinels are omitted. <kbd>Tab</kbd> allows natural document flow, while `closeOnFocusOut: true` or `closeOnTab: true` gracefully dismisses the panel when focus moves away.

### Initial and Return Focus

- When `initialFocus` is omitted, the trap automatically focuses the first tabbable child (falling back to the floating container).
- When deactivated (e.g. on dialog close), focus smoothly returns to the trigger button stored in `node.refs.anchorEl`.

## Example

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useDismiss, useFloatingNode, useFocusTrap, useRole } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);
const nameInput = ref<HTMLInputElement | null>(null);

const node = useFloatingNode({ anchorEl, floatingEl });

useFocusTrap(node, {
  modal: true,
  initialFocus: nameInput,
  returnFocus: true,
});

useDismiss(node);
useRole(node, { role: "dialog", modal: true });
</script>

<template>
  <button ref="anchorEl" @click="node.open.value = true">Edit Profile</button>

  <div v-if="node.open.value" class="dialog-backdrop">
    <div ref="floatingEl" class="dialog-panel">
      <h2>Edit Profile</h2>
      <input ref="nameInput" placeholder="Full name" />
      <input placeholder="Email address" />
      <div class="actions">
        <button @click="node.open.value = false">Save</button>
        <button @click="node.open.value = false">Cancel</button>
      </div>
    </div>
  </div>
</template>

<style>
.dialog-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
}
.dialog-panel {
  background: white;
  padding: 24px;
  border-radius: 8px;
  width: 320px;
}
</style>
```

## See Also

- [`useDismiss`](/api/use-dismiss) - Close on Escape or backdrop click
- [`useRole`](/api/use-role) - Apply `role="dialog"` and `aria-modal="true"`
- [`useFloatingNode`](/api/use-floating-node) - Shared node lifecycle
- [Build Dialogs and Modals](/guide/build-dialogs-and-modals) - Full modal implementation guide
- [Focus Models](/guide/focus-models) - Comparison of modal vs roving focus patterns
