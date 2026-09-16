---
description: Closes floating content on Escape and outside pointer input through one shared gate.
---

# useDismiss

`useDismiss` closes a floating node when the user presses Escape or clicks outside the surface. Both channels share one reactive `enabled` gate and coordinate through the unified composite floating node.

## Type

```ts
function useDismiss(node: FloatingNode, options?: UseDismissOptions): void;

interface UseDismissOptions {
  enabled?: MaybeRefOrGetter<boolean>;
  escapeKey?: boolean | UseDismissEscapeOptions;
  outsidePress?: boolean | UseDismissOutsideOptions;
}

interface UseDismissEscapeOptions {
  capture?: boolean;
  preventDefault?: boolean;
  onEscape?: (event: KeyboardEvent) => void;
  ignoreEscapeKey?: (event: KeyboardEvent) => boolean;
}

interface UseDismissOutsideOptions {
  event?: MaybeRefOrGetter<"pointerdown" | "mousedown" | "click">;
  capture?: MaybeRefOrGetter<boolean>;
  ignoreClick?: (event: MouseEvent, target: EventTarget | null) => boolean;
  onClick?: (event: MouseEvent) => void;
  ignoreScrollbar?: MaybeRefOrGetter<boolean>;
  ignoreDrag?: MaybeRefOrGetter<boolean>;
}
```

## Options

| Name | Type | Default | Notes |
| --- | --- | --- | --- |
| `enabled` | `MaybeRefOrGetter<boolean>` | `true` | Shared reactive gate for Escape and outside press channels. |
| `escapeKey` | `boolean \| UseDismissEscapeOptions` | `true` | `false` disables Escape dismissal; an object configures it. |
| `outsidePress` | `boolean \| UseDismissOutsideOptions` | `true` | `false` disables outside-press dismissal; an object configures it. |

### Escape Channel Options (`escapeKey` object)

| Option | Type | Default | Notes |
| --- | --- | --- | --- |
| `capture` | `boolean` | `false` | Attaches keydown listener during the capture phase. Read once. |
| `preventDefault` | `boolean` | `false` | Calls `event.preventDefault()` on handled Escape presses. |
| `onEscape` | `(event: KeyboardEvent) => void` | `undefined` | Custom handler. Replaces default `node.open.value = false`. |
| `ignoreEscapeKey` | `(event: KeyboardEvent) => boolean` | `undefined` | Predicate to let children or custom inputs consume Escape first. |

### Outside Press Channel Options (`outsidePress` object)

| Option | Type | Default | Notes |
| --- | --- | --- | --- |
| `event` | `MaybeRefOrGetter<"pointerdown" \| "mousedown" \| "click">` | `"pointerdown"` | Which document event triggers dismissal. |
| `capture` | `MaybeRefOrGetter<boolean>` | `true` | Runs during listener capture phase before bubbling completes. |
| `ignoreClick` | `(event, target) => boolean` | `undefined` | Skips selected clicks; runs after the composite node family check. |
| `onClick` | `(event: MouseEvent) => void` | `undefined` | Custom handler. Replaces default `node.open.value = false`. |
| `ignoreScrollbar` | `MaybeRefOrGetter<boolean>` | `true` | Clicking scrollbars inside the panel does not trigger dismissal. |
| `ignoreDrag` | `MaybeRefOrGetter<boolean>` | `true` | For `event: "click"`, ignores mouseup outside after dragging from inside. |

## Returns

`useDismiss` returns `void`. When dismissed, it updates `node.open.value = false`.

## Details

### Hierarchical Outside Clicks & Leaf-First Escape

`useDismiss` natively leverages the composite floating node hierarchy:

- **Family-Aware Outside Click:** `node.contains(target)` traverses open child surfaces. Clicking inside a child submenu (even if teleported to `<body>`) is recognized as internal to parent menus, preventing unwanted closures.
- **Leaf-First Escape Protocol:** When `Escape` is pressed in a nested cascade (e.g. Root &rarr; Submenu &rarr; SubSubmenu), parent nodes inspect their open children. If open children exist, parent nodes pass through execution so only the deepest leaf node closes. Subsequent `Escape` presses pop each ancestor in reverse depth order.

### Outside Press Detection

- By default, outside presses trigger on `"pointerdown"` in the capture phase. This dismisses the surface before any blur or pointerup handlers run on other page elements.
- `ignoreScrollbar: true` prevents dismissal when users drag scrollbars on overflowing panels.
- `ignoreDrag: true` prevents closing when a user selects text inside the panel and releases the mouse cursor outside.

## Example

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useClick, useDismiss, useFloatingNode, usePosition } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const node = useFloatingNode({ anchorEl, floatingEl });
usePosition(node);

useClick(node);
useDismiss(node, {
  outsidePress: { event: "pointerdown" },
  escapeKey: { preventDefault: true },
});
</script>

<template>
  <button ref="anchorEl">Toggle Popover</button>

  <div v-if="node.open.value" ref="floatingEl" class="popover">
    <p>Press Escape or click outside to dismiss</p>
  </div>
</template>
```

## See Also

- [`useClick`](/api/use-click) - Toggle open on click
- [`useFloatingNode`](/api/use-floating-node) - Composite node with parent-child coordination
- [`useFocusTrap`](/api/use-focus-trap) - Retain focus inside modal dialogs
- [Build Popovers and Dropdowns](/guide/build-popovers-and-dropdowns) - Click and dismiss guide
