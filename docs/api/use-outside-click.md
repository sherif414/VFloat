---
description: Closes floating content when pointer input lands outside its floating family.
---

# useOutsideClick

`useOutsideClick` closes a floating node when pointer input lands outside its floating surface. It natively leverages the composite floating node hierarchy, treating child submenus and nested overlays as internal to prevent premature closure.

## Type

```ts
function useOutsideClick(node: FloatingNode, options?: UseOutsideClickOptions): void;

type UseOutsideClickContext = FloatingNode;

interface UseOutsideClickOptions {
  enabled?: MaybeRefOrGetter<boolean>;
  event?: MaybeRefOrGetter<"pointerdown" | "mousedown" | "click">;
  capture?: MaybeRefOrGetter<boolean>;
  ignoreClick?: OutsideClickPredicate;
  onClick?: (event: MouseEvent) => void;
  ignoreScrollbar?: MaybeRefOrGetter<boolean>;
  ignoreDrag?: MaybeRefOrGetter<boolean>;
}

type OutsideClickPredicate = (event: MouseEvent, target: EventTarget | null) => boolean;
```

## Options

| Name | Type | Default | Notes |
| --- | --- | --- | --- |
| `enabled` | `MaybeRefOrGetter<boolean>` | `true` | Reactive toggle. Setting to `false` disables outside click detection. |
| `event` | `MaybeRefOrGetter<"pointerdown" \| "mousedown" \| "click">` | `"pointerdown"` | Which document event triggers dismissal. |
| `capture` | `MaybeRefOrGetter<boolean>` | `true` | Attaches document listener during the capture phase before bubbling completes. |
| `ignoreClick` | `OutsideClickPredicate` | `undefined` | Custom predicate to ignore specific outside clicks. Evaluated after the composite node family check. |
| `onClick` | `(event: MouseEvent) => void` | `undefined` | Custom handler. When provided, replaces default `node.open.value = false`. |
| `ignoreScrollbar` | `MaybeRefOrGetter<boolean>` | `true` | Clicks on scrollbar gutters do not trigger dismissal. |
| `ignoreDrag` | `MaybeRefOrGetter<boolean>` | `true` | For `event: "click"`, ignores mouseup outside when the drag started inside the floating surface. |

## Returns

`useOutsideClick` returns `void`. When an outside press is confirmed, it updates `node.open.value = false` (or invokes `options.onClick` if provided).

## Details

### Family-Aware Hierarchy Traversal

`useOutsideClick` works seamlessly with nested menus and popovers:

- **Composite Node Containment:** `node.contains(target)` traverses open child surfaces. Clicking inside a child submenu (even if teleported to `<body>`) is recognized as internal to parent menus, preventing unwanted parent closures.
- **Independent Stacks:** Unrelated floating nodes on the same page remain isolated. Clicking outside a popover closes only the relevant surface while respecting neighboring overlays.

### Event Selection & Capture Phase

- By default, outside presses trigger on `"pointerdown"` in the capture phase. This dismisses the surface immediately before any blur or pointerup handlers run on other page elements.
- If you need form controls or external links to execute their action while closing the surface, switch to `event: "click"`.

### Scrollbars and Drag Gestures

- **Scrollbar Protection:** `ignoreScrollbar: true` prevents dismissal when users drag scrollbars on overflowing panels or document containers.
- **Drag Suppression:** `ignoreDrag: true` prevents closing when a user selects text inside the panel and accidentally releases the mouse cursor outside.

## Example

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useClick, useFloatingNode, useOutsideClick, usePosition } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const node = useFloatingNode({ anchorEl, floatingEl });
usePosition(node, {
  placement: "bottom-start",
  middlewares: {
    offset: 8,
    flip: true,
    shift: { padding: 8 },
  },
});

useClick(node);
useOutsideClick(node, {
  event: "pointerdown",
});
</script>

<template>
  <button ref="anchorEl" type="button">Toggle Popover</button>

  <div v-if="node.open.value" ref="floatingEl" class="popover">
    <p>Click outside this panel to close it.</p>
  </div>
</template>
```

## See Also

- [`useEscapeKey`](/api/use-escape-key) - Close on Escape key press with leaf-first tree coordination
- [`useClick`](/api/use-click) - Toggle open on click or keyboard activation
- [`useFloatingNode`](/api/use-floating-node) - Composite node with parent-child coordination
- [Build Popovers & Dropdowns](/guide/build-popovers-and-dropdowns) - Popover interaction patterns
