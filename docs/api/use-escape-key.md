---
description: Closes floating content when the user presses the Escape key.
---

# useEscapeKey

`useEscapeKey` closes a floating surface when the user presses the Escape key. It coordinates through the composite floating node hierarchy to unwind nested trees leaf-first, resolves independent overlay stacks in LIFO order, and protects against accidental closure during IME text composition.

## Type

```ts
function useEscapeKey(node: FloatingNode, options?: UseEscapeKeyOptions): void;

type UseEscapeKeyContext = FloatingNode;

interface UseEscapeKeyOptions {
  enabled?: MaybeRefOrGetter<boolean>;
  capture?: boolean;
  preventDefault?: boolean;
  onEscape?: (event: KeyboardEvent) => void;
}
```

## Options

| Name             | Type                             | Default     | Notes                                                                                              |
| ---------------- | -------------------------------- | ----------- | -------------------------------------------------------------------------------------------------- |
| `enabled`        | `MaybeRefOrGetter<boolean>`      | `true`      | Reactive toggle. Setting to `false` removes the node from the escape stack and ignores keystrokes. |
| `capture`        | `boolean`                        | `false`     | Attaches keydown listener during the capture phase. Read once during listener setup.               |
| `preventDefault` | `boolean`                        | `false`     | Calls `event.preventDefault()` on handled Escape presses.                                          |
| `onEscape`       | `(event: KeyboardEvent) => void` | `undefined` | Custom callback. When provided, replaces the default `node.open.value = false`.                    |

## Returns

`useEscapeKey` returns `void`. When an Escape key press targets this surface, it updates `node.open.value = false` (or invokes `options.onEscape` if provided).

## Details

### Leaf-First Escape Unwinding

When using nested floating nodes (such as multi-level cascading menus):

- **Hierarchical Depth Order:** When Escape is pressed, parent nodes inspect their open children. Only the deepest active descendant closes.
- **Step-by-Step Dismissal:** Consecutive Escape presses pop each open level one by one back up to the root, providing standard operating system menu navigation semantics without custom coordination code.

### Stacked Independent Overlays (LIFO)

When multiple independent overlays coexist on the page (for example, a modal dialog that opens a select dropdown):

- **Focused Surface First:** If focus resides inside one of the open overlays, that overlay claims the Escape key.
- **LIFO Order:** If focus is neutral (e.g. on the document body), the most recently opened surface closes first. Unrelated overlays do not intercept each other's Escape presses.

### IME Composition Awareness

When users type using an Input Method Editor (IME) for languages like Japanese, Chinese, or Korean, pressing Escape cancels the pending composition candidate window.

`useEscapeKey` listens to `compositionstart` and `compositionend` events at the document level. Any Escape keystroke received while `isComposing` is active is ignored, preventing the floating surface from closing prematurely while candidate selection is being aborted.

## Example

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useClick, useEscapeKey, useFloatingNode, usePosition } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const node = useFloatingNode({ anchorEl, floatingEl });
usePosition(node, {
  placement: "bottom-start",
  middlewares: {
    offset: 8,
    flip: true,
  },
});

useClick(node);
useEscapeKey(node, {
  preventDefault: true,
});
</script>

<template>
  <button ref="anchorEl" type="button">Toggle Menu</button>

  <div v-if="node.open.value" ref="floatingEl" class="menu">
    <p>Press Escape to dismiss this menu.</p>
  </div>
</template>
```

## See Also

- [`useOutsideClick`](/api/use-outside-click) - Close on outside pointer interactions
- [`useClick`](/api/use-click) - Toggle open on click or keyboard activation
- [`useFocusTrap`](/api/use-focus-trap) - Retain focus inside modal dialogs
- [`useFloatingNode`](/api/use-floating-node) - Composite node with parent-child coordination
- [Build Dialogs & Modals](/guide/build-dialogs-and-modals) - Dialog focus and escape handling
