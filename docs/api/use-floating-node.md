---
description: Create a standalone floating node with shared refs and open state.
---

# useFloatingNode

`useFloatingNode` creates a standalone floating node. It owns element refs and open state, and passes a stable identity to positioning and interaction composables.

## Type

```ts
function useFloatingNode(options: UseFloatingNodeOptions): FloatingNode;
```

```ts
interface UseFloatingNodeOptions {
  anchorEl: Ref<AnchorElement>;
  floatingEl: Ref<FloatingElement>;
  arrowEl?: Ref<HTMLElement | null>;
  open?: Ref<boolean>;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean, reason: OpenChangeReason, event?: Event) => void;
}

type AnchorElement = HTMLElement | VirtualElement | null;
type FloatingElement = HTMLElement | null;

type FloatingNodeId = symbol;

interface FloatingNodeElements {
  anchorEl: Ref<AnchorElement>;
  floatingEl: Ref<FloatingElement>;
  arrowEl: Ref<HTMLElement | null>;
}

interface FloatingNode {
  id: FloatingNodeId;
  refs: FloatingNodeElements;
  open: Readonly<Ref<boolean>>;
  setOpen: (open: boolean, reason?: OpenChangeReason, event?: Event) => void;
  lastOpenReason?: Readonly<Ref<OpenChangeReason | null>>;
  lastOpenEvent?: Readonly<Ref<Event | null>>;
}
```

## Options

| Name | Type | Notes |
| --- | --- | --- |
| `anchorEl` | `Ref<AnchorElement>` | Required. Also accepts a [virtual element](/guide/use-virtual-anchors). |
| `floatingEl` | `Ref<FloatingElement>` | Required. |
| `arrowEl` | `Ref<HTMLElement \| null>` | Optional. Used by [`useArrow`](/api/use-arrow); an empty ref is created when omitted. |
| `open` | `Ref<boolean>` | Controlled open state. When passed, `defaultOpen` is ignored after creation. |
| `defaultOpen` | `boolean` | Seeds uncontrolled state. Defaults to `false`. |
| `onOpenChange` | `(open, reason, event?) => void` | Called only when the value actually changes. |

## Returns

| Name | Type | Notes |
| --- | --- | --- |
| `id` | `FloatingNodeId` | Stable symbol; trees use it instead of object identity. |
| `refs` | `FloatingNodeElements` | Shared `anchorEl` / `floatingEl` / `arrowEl` refs. |
| `open` | `Readonly<Ref<boolean>>` | Current open state. |
| `setOpen` | `(open, reason?, event?) => void` | Missing reasons fall back to `"programmatic"`. |
| `lastOpenReason` | `Readonly<Ref<OpenChangeReason \| null>>` | `null` when closed. |
| `lastOpenEvent` | `Readonly<Ref<Event \| null>>` | `null` when closed. |

## Details

`useFloatingNode` does not compute coordinates, run middlewares, or join a tree. Add [`usePosition`](/api/use-position) when a surface needs JavaScript positioning, and join a [`useFloatingTree`](/api/use-floating-tree) only when related surfaces need coordination such as nested menus.

- Passing `open` makes the node controlled: your ref owns the value and `defaultOpen` is ignored after creation.
- `setOpen(open, reason = "programmatic", event?)` stores the reason and source event, then forwards them to `onOpenChange` only when the value actually changes.
- Reaffirming the current open value (`setOpen(true)` while already open) still updates `lastOpenReason` and `lastOpenEvent` without calling `onOpenChange`.
- `setOpen` never cascades to other nodes. Closing a parent leaves descendants open unless you call `tree.closeDescendants(node, reason, event)` explicitly.
- The node object itself is never mutated by tree linkage; hierarchy lives in the tree's map.

Open-change reasons use these string values:

```ts
type OpenChangeReason =
  | "anchor-click"
  | "keyboard-activate"
  | "keyboard-exit"
  | "outside-pointer"
  | "focus"
  | "blur"
  | "hover"
  | "escape-key"
  | "tab-key"
  | "programmatic";
```

## Example

This dialog uses node state and behavior without JavaScript positioning.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useEscapeKey, useFloatingNode, useRole } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const node = useFloatingNode({ anchorEl, floatingEl });

useEscapeKey(node);
useRole(node, { role: "dialog" });
</script>

<template>
  <button ref="anchorEl" @click="node.setOpen(true, 'anchor-click', $event)">Open dialog</button>

  <div v-if="node.open" ref="floatingEl" class="dialog">
    <button @click="node.setOpen(false, 'programmatic', $event)">Close</button>
  </div>
</template>
```

## See Also

- [`useFloatingTree`](/api/use-floating-tree) - Coordinate related nodes such as nested menus
- [`usePosition`](/api/use-position) - Opt into JavaScript positioning
- [`useClick`](/api/use-click) - Click-based activation
- [Floating Context](/guide/floating-context) - Node mental model
