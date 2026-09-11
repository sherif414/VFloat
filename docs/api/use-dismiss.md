---
description: Closes floating content on Escape and outside pointer input through one shared gate.
---

# useDismiss

`useDismiss` groups [`useEscapeKey`](/api/use-escape-key) and [`useOutsideClick`](/api/use-outside-click) behind one shared `enabled` gate and one shared [`useFloatingTree`](/api/use-floating-tree). Pass `tree` once instead of repeating it on every dismissal primitive.

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
  ignoreClick?: OutsideClickPredicate;
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

The per-channel option objects accept the same fields as [`useEscapeKey`](/api/use-escape-key) and [`useOutsideClick`](/api/use-outside-click) minus the shared `enabled` and `tree`, which live on `useDismiss` itself.

## Returns

Returns `void`. Closes with the `escape-key` reason for Escape and the `"outside-pointer"` reason for outside input.

## Details

`useDismiss(node)` with no options is equivalent to calling `useEscapeKey(node)` and `useOutsideClick(node)` with the same `enabled` and `tree`. It exists so the common popover/dialog dismissal stack stays one line and the tree cannot drift between channels:

- Disable one channel with `escapeKey: false` or `outsidePress: false`.
- Configure a channel with an object, for example `outsidePress: { event: "click" }` or `escapeKey: { onEscape }`.
- For independent reactive gates per channel, compose [`useEscapeKey`](/api/use-escape-key) and [`useOutsideClick`](/api/use-outside-click) directly instead.

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

- [`useEscapeKey`](/api/use-escape-key) - Closes on Escape
- [`useOutsideClick`](/api/use-outside-click) - Closes on pointer input outside
- [`useClick`](/api/use-click) - Opens on click
- [`useFocusTrap`](/api/use-focus-trap) - Traps and restores focus
- [`useFloatingTree`](/api/use-floating-tree) - Coordinates nested dismissal
