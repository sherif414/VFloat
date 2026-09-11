---
description: Create a standalone floating node with shared refs and open state.
---

# useFloatingNode

`useFloatingNode` creates a standalone floating node. It owns element refs and open state, providing a stable identity and reactive hub for positioning and interaction composables.

`useFloatingNode` does not attach DOM event listeners, compute screen coordinates, run middleware, or manage focus. It holds the shared state that specialized composables like [`usePosition`](/api/use-position) and [`useClick`](/api/use-click) operate on.

## Type

```ts
function useFloatingNode(options: UseFloatingNodeOptions): FloatingNode;

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

## Options

| Name | Type | Default | Notes |
| --- | --- | --- | --- |
| `anchorEl` | `Ref<AnchorElement>` | Required | Reference element or [virtual element](/guide/use-virtual-anchors). |
| `floatingEl` | `Ref<FloatingElement>` | Required | Floating content element. |
| `arrowEl` | `Ref<HTMLElement \| null>` | `ref(null)` | Optional arrow element ref. Automatically created when omitted. |
| `open` | `Ref<boolean>` | `undefined` | Controlled open ref. When supplied, `defaultOpen` is ignored. |
| `defaultOpen` | `boolean` | `false` | Initial state when uncontrolled. |
| `onOpenChange` | `(open, reason, event?) => void` | `undefined` | Callback invoked only when open state actually changes. |

## Returns

| Name | Type | Notes |
| --- | --- | --- |
| `id` | `FloatingNodeId` | Stable symbol identifying the node in trees. |
| `refs` | `FloatingNodeElements` | Shared `anchorEl`, `floatingEl`, and `arrowEl` refs. |
| `open` | `Readonly<Ref<boolean>>` | Current reactive open state. |
| `setOpen` | `(open, reason?, event?) => void` | Updates open state with an explicit reason. Missing reason defaults to `"programmatic"`. |
| `lastOpenReason` | `Readonly<Ref<OpenChangeReason \| null>>` | Reason that triggered the latest open state change. `null` when closed. |
| `lastOpenEvent` | `Readonly<Ref<Event \| null>>` | DOM event that triggered the change. `null` when closed. |

## Details

### Controlled vs Uncontrolled State

When you pass an external `open` ref to `useFloatingNode({ anchorEl, floatingEl, open })`, the node operates in **controlled mode**. The external ref is the single source of truth:

```ts
const isOpen = ref(false);
const node = useFloatingNode({ anchorEl, floatingEl, open: isOpen });
```

When you omit `open`, the node creates internal state initialized with `defaultOpen`. Call `node.setOpen(value, reason, event)` to change state.

### Reason Tracking

`setOpen` accepts an `OpenChangeReason` string:

- Reaffirming the existing state (calling `node.setOpen(true)` when already open) updates `lastOpenReason` and `lastOpenEvent` without firing `onOpenChange`. This mechanism allows [`useClick`](/api/use-click) with `stickIfOpen` to pin a hover-opened surface.
- `onOpenChange` is invoked only when the boolean value transitions.

### Tree Isolation

`useFloatingNode` creates an independent node. Nodes do not know about parents or children until explicitly added to a [`useFloatingTree`](/api/use-floating-tree). Calling `node.setOpen(false)` on a parent node never automatically closes descendant nodes unless you coordinate them through the tree.

## Example

This dialog pairs `useFloatingNode` with dismissal and role semantics without JavaScript positioning:

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useDismiss, useFloatingNode, useRole } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const node = useFloatingNode({ anchorEl, floatingEl });

useDismiss(node);
useRole(node, { role: "dialog" });
</script>

<template>
  <button ref="anchorEl" @click="node.setOpen(true, 'anchor-click', $event)">
    Open Dialog
  </button>

  <div v-if="node.open" ref="floatingEl" class="dialog">
    <p>Dialog content</p>
    <button @click="node.setOpen(false, 'programmatic', $event)">Close</button>
  </div>
</template>
```

## See Also

- [`useFloatingTree`](/api/use-floating-tree) - Coordinate parent-child node relationships
- [`usePosition`](/api/use-position) - Add reactive coordinate calculations
- [`useClick`](/api/use-click) - Toggle open state on click or tap
- [Floating Context](/guide/floating-context) - Conceptual guide to floating nodes
