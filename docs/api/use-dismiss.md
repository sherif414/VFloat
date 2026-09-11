---
description: Closes floating content on Escape and outside pointer input through one shared gate.
---

# useDismiss

`useDismiss` closes a floating node when the user presses Escape or clicks outside the surface. Both channels share one reactive `enabled` gate and coordinate through an optional [`useFloatingTree`](/api/use-floating-tree).

## Type

```ts
function useDismiss(node: UseDismissContext, options?: UseDismissOptions): void;

interface UseDismissContext extends Pick<FloatingNode, "id" | "refs" | "open" | "setOpen"> {}

interface UseDismissOptions {
  enabled?: MaybeRefOrGetter<boolean>;
  tree?: FloatingTree | null | undefined;
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
| `tree` | `FloatingTree \| null` | `undefined` | Forwarded to both channels; descendant surfaces count as inside. |
| `escapeKey` | `boolean \| UseDismissEscapeOptions` | `true` | `false` disables Escape dismissal; an object configures it. |
| `outsidePress` | `boolean \| UseDismissOutsideOptions` | `true` | `false` disables outside-press dismissal; an object configures it. |

### Escape Channel Options (`escapeKey` object)

| Option | Type | Default | Notes |
| --- | --- | --- | --- |
| `capture` | `boolean` | `false` | Attaches keydown listener during the capture phase. Read once. |
| `preventDefault` | `boolean` | `false` | Calls `event.preventDefault()` on handled Escape presses. |
| `onEscape` | `(event: KeyboardEvent) => void` | `undefined` | Custom handler. Replaces default `node.setOpen(false)`. |
| `ignoreEscapeKey` | `(event: KeyboardEvent) => boolean` | `undefined` | Predicate to let children or custom inputs consume Escape first. |

### Outside Press Channel Options (`outsidePress` object)

| Option | Type | Default | Notes |
| --- | --- | --- | --- |
| `event` | `MaybeRefOrGetter<"pointerdown" \| "mousedown" \| "click">` | `"pointerdown"` | Which document event triggers dismissal. |
| `capture` | `MaybeRefOrGetter<boolean>` | `true` | Runs during listener capture phase before bubbling completes. |
| `ignoreClick` | `(event, target) => boolean` | `undefined` | Skips selected clicks; runs after the family check. |
| `onClick` | `(event: MouseEvent) => void` | `undefined` | Custom handler. Replaces default `node.setOpen(false)`. |
| `ignoreScrollbar` | `MaybeRefOrGetter<boolean>` | `true` | Clicking scrollbars inside the panel does not trigger dismissal. |
| `ignoreDrag` | `MaybeRefOrGetter<boolean>` | `true` | For `event: "click"`, ignores mouseup outside after dragging from inside. |

## Returns

`useDismiss` returns `void`. When dismissed, it updates open state with reason `"escape-key"` for Escape presses and `"outside-pointer"` for outside clicks.

## Details

### Stacked Dismissal with Trees

When multiple floating panels are open simultaneously (such as a dropdown menu with submenus):

- Without `tree`, pressing Escape or clicking outside can dismiss all layers at once because each node only recognizes its own anchor and floating element.
- Passing `tree` coordinates the stack: clicking inside a submenu is considered inside the parent menu, and pressing Escape dismisses only the innermost active submenu. Repeated Escape presses walk backward through the stack.

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
const { styles } = usePosition(node);

useClick(node);
useDismiss(node, {
  outsidePress: { event: "pointerdown" },
  escapeKey: { preventDefault: true },
});
</script>

<template>
  <button ref="anchorEl">Toggle Popover</button>

  <div v-if="node.open" ref="floatingEl" class="popover" :style="styles">
    <p>Press Escape or click outside to dismiss</p>
  </div>
</template>
```

## See Also

- [`useClick`](/api/use-click) - Toggle open on click
- [`useFloatingTree`](/api/use-floating-tree) - Coordinate nested dismissal
- [`useFocusTrap`](/api/use-focus-trap) - Retain focus inside modal dialogs
- [Build Popovers and Dropdowns](/guide/build-popovers-and-dropdowns) - Click and dismiss guide
