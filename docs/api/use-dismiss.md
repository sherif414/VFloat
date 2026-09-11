---
description: Closes floating content on Escape and outside pointer input through one shared gate.
---

# useDismiss

`useDismiss` closes a floating node on Escape and outside pointer input through one shared `enabled` gate and one shared [`useFloatingTree`](/api/use-floating-tree). Pass `tree` once instead of repeating it per channel.

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
| `enabled` | `MaybeRefOrGetter<boolean>` | `true` | Shared reactive gate for both channels. |
| `tree` | `FloatingTree \| null \| undefined` | — | Forwarded to both channels; descendant surfaces count as inside. |
| `escapeKey` | `boolean \| UseDismissEscapeOptions` | `true` | `false` disables Escape dismissal; an object configures it. |
| `outsidePress` | `boolean \| UseDismissOutsideOptions` | `true` | `false` disables outside-press dismissal; an object configures it. |

Escape-channel fields (`escapeKey` object):

| Name | Type | Default | Notes |
| --- | --- | --- | --- |
| `capture` | `boolean` | `false` | Plain boolean, read once. |
| `preventDefault` | `boolean` | `false` | Plain boolean, read once. |
| `onEscape` | `(event: KeyboardEvent) => void` | — | Replaces the default close behavior. |
| `ignoreEscapeKey` | `(event: KeyboardEvent) => boolean` | — | Runs before close; lets children handle Escape first. |

Outside-press channel fields (`outsidePress` object):

| Name | Type | Default | Notes |
| --- | --- | --- | --- |
| `event` | `MaybeRefOrGetter<"pointerdown" \| "mousedown" \| "click">` | `"pointerdown"` | Which document event dismisses. |
| `capture` | `MaybeRefOrGetter<boolean>` | `true` | Listener capture phase. |
| `ignoreClick` | `(event: MouseEvent, target: EventTarget \| null) => boolean` | — | Skips selected outside presses; runs after the family check. |
| `onClick` | `(event: MouseEvent) => void` | — | Replaces the default close behavior. |
| `ignoreScrollbar` | `MaybeRefOrGetter<boolean>` | `true` | Scrollbar interaction inside the panel does not close. |
| `ignoreDrag` | `MaybeRefOrGetter<boolean>` | `true` | Ignores `click` finishing outside after a drag from inside. Only for `event: "click"`. |

## Returns

Returns `void`. Closes with the `escape-key` reason for Escape and the `"outside-pointer"` reason for outside input.

## Details

`useDismiss(node)` with no options enables both channels with the same `enabled` and `tree`. It exists so the common popover/dialog dismissal stack stays one line and the tree cannot drift between channels:

- Disable one channel with `escapeKey: false` or `outsidePress: false`.
- Configure a channel with an object, for example `outsidePress: { event: "click" }` or `escapeKey: { onEscape }`.
- The Escape channel listens on `document` and ignores Escape while IME composition is active. Presses already handled elsewhere (`defaultPrevented`), non-Escape keys, and presses while the node is closed are ignored.
- When nested nodes share an explicit [`useFloatingTree`](/api/use-floating-tree) passed via `tree`, outside presses inside descendant surfaces count as inside, and one Escape press closes only the deepest open node. Repeated presses walk the stack from the innermost surface outward. Without `tree`, only the current node's own anchor and floating elements count as inside.

## Example

This popover toggles on click and dismisses on Escape or outside input:

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useClick, useDismiss, useFloatingNode, usePosition } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const node = useFloatingNode({ anchorEl, floatingEl });
const { styles } = usePosition(node);

useClick(node);
useDismiss(node);
</script>

<template>
  <button ref="anchorEl">Toggle</button>

  <div v-if="node.open" ref="floatingEl" :style="styles">Press Escape or click outside</div>
</template>
```

## See Also

- [`useClick`](/api/use-click) - Opens on click
- [`useFocusTrap`](/api/use-focus-trap) - Traps and restores focus
- [`useFloatingTree`](/api/use-floating-tree) - Coordinates nested dismissal
