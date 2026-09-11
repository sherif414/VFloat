---
description: Manages modal focus containment, sentinels, background inert isolation, and return focus.
---

# useFocusTrap

`useFocusTrap` confines keyboard focus inside a floating panel. It handles initial focus placement, focus restoration on close, Tab key cycling via DOM sentinels, and background `inert` attribute isolation for modal dialogs.

## Type

```ts
function useFocusTrap(
  node: UseFocusTrapContext,
  options?: UseFocusTrapOptions,
): UseFocusTrapReturn;

interface UseFocusTrapContext extends Pick<FloatingNode, "refs" | "open" | "setOpen"> {}

interface UseFocusTrapOptions {
  enabled?: MaybeRefOrGetter<boolean>;
  modal?: MaybeRefOrGetter<boolean>;
  initialFocus?: MaybeRefOrGetter<
    HTMLElement | null | false | string | ((container: HTMLElement) => HTMLElement | null)
  >;
  fallbackFocus?: MaybeRefOrGetter<
    HTMLElement | null | string | ((container: HTMLElement) => HTMLElement | null)
  >;
  returnFocus?: MaybeRefOrGetter<
    boolean | HTMLElement | null | string | ((anchor: HTMLElement | null) => HTMLElement | null)
  >;
  closeOnFocusOut?: MaybeRefOrGetter<boolean>;
  closeOnTab?: MaybeRefOrGetter<boolean>;
  escapeDeactivates?: MaybeRefOrGetter<boolean>;
  outsidePressDeactivates?: MaybeRefOrGetter<boolean>;
}

interface UseFocusTrapReturn {
  activate: () => void;
  deactivate: () => void;
  pause: () => void;
  unpause: () => void;
  isPaused: Readonly<Ref<boolean>>;
}
```

## Options

| Name | Type | Default | Notes |
| --- | --- | --- | --- |
| `enabled` | `MaybeRefOrGetter<boolean>` | `true` | Reactive toggle. Activates the trap while `node.open` is `true`. |
| `modal` | `MaybeRefOrGetter<boolean>` | `true` | When `true`, sets `inert` on siblings and cycles Tab inside the panel. |
| `initialFocus` | Element, selector, function, or `false` | First tabbable element | Element to focus when the trap activates. `false` prevents moving focus. |
| `fallbackFocus` | Element, selector, or function | Container element | Fallback element to focus if the panel contains no tabbable elements. |
| `returnFocus` | `boolean`, element, selector, or function | `true` | Restores focus to the anchor element when the trap deactivates. |
| `closeOnFocusOut` | `MaybeRefOrGetter<boolean>` | `false` | Closes `node` if focus escapes the container. Enabled by default for non-modal traps. |
| `closeOnTab` | `MaybeRefOrGetter<boolean>` | `false` | For non-modal popovers: pressing Tab on the boundary closes the surface. |
| `escapeDeactivates` | `MaybeRefOrGetter<boolean>` | `true` | Deactivates the trap when Escape is pressed. |
| `outsidePressDeactivates` | `MaybeRefOrGetter<boolean>` | `true` | Deactivates the trap when clicking outside the panel. |

## Returns

| Name | Type | Notes |
| --- | --- | --- |
| `activate` | `() => void` | Imperatively activates the trap and shifts focus to `initialFocus`. |
| `deactivate` | `() => void` | Imperatively deactivates the trap, removes sentinels, and restores focus. |
| `pause` | `() => void` | Temporarily pauses trap enforcement (e.g. while a nested modal is active). |
| `unpause` | `() => void` | Resumes an existing paused trap without re-running `initialFocus`. |
| `isPaused` | `Readonly<Ref<boolean>>` | Indicates whether the trap is currently in a paused state. |

## Details

### Modal Traps vs Non-Modal Popovers

- **Modal Dialogs (`modal: true`):** The trap inserts invisible boundary sentinels at the top and bottom of the panel. When tabbing past the last element, focus loops back to the first. Background DOM nodes outside the floating tree are marked `inert="true"` and `aria-hidden="true"` to prevent screen readers or pointer interactions from escaping.
- **Non-Modal Popovers (`modal: false`):** Sentinels are omitted. Tabbing out of the panel allows natural document tab order, while `closeOnFocusOut: true` dismisses the popover gracefully.

### Initial and Return Focus

- When `initialFocus` is omitted, the trap searches for the first visible element matching interactive selectors (`button:not([disabled])`, `input`, `a[href]`, `[tabindex="0"]`).
- If no tabbable children exist, focus lands on the panel container (`fallbackFocus`).
- When deactivated (e.g. on close), focus smoothly returns to the trigger button stored in `node.refs.anchorEl`.

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
  initialFocus: () => nameInput.value,
  returnFocus: true,
});

useDismiss(node);
useRole(node, { role: "dialog", modal: true });
</script>

<template>
  <button ref="anchorEl" @click="node.setOpen(true)">Edit Profile</button>

  <div v-if="node.open" class="dialog-backdrop">
    <div ref="floatingEl" class="dialog-panel">
      <h2>Edit Profile</h2>
      <input ref="nameInput" placeholder="Full name" />
      <input placeholder="Email address" />
      <div class="actions">
        <button @click="node.setOpen(false)">Save</button>
        <button @click="node.setOpen(false)">Cancel</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
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
