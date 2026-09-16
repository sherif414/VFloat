---
description: Create a unified composite floating node with shared refs, open state, and hierarchical coordination.
---

# useFloatingNode

`useFloatingNode` creates a unified composite floating node. It owns element refs and open state, providing a stable identity, spatial containment checks, and reactive hub for positioning and interaction composables.

`useFloatingNode` acts as both a standalone surface ($N = 0$) and a hierarchical tree node ($N > 0$). It supports automatic hierarchy wiring across components via Vue's Dependency Injection (`provide` / `inject`), explicit parent linking for single-component scripts, and explicit standalone isolation.

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
  parent?: MaybeRefOrGetter<FloatingNode | null | undefined>;
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
  parent: Readonly<ShallowRef<FloatingNode | null>>;
  children: Readonly<ShallowRef<ReadonlySet<FloatingNode>>>;
  appendChild: (child: FloatingNode) => () => void;
  removeChild: (child: FloatingNode) => void;
  contains: (target: EventTarget | null) => boolean;
  traverse: (
    visitor: (node: FloatingNode, depth: number) => TraverseAction,
    options?: TraverseOptions,
  ) => boolean;
}

type TraverseAction = void | "skip" | "stop";

interface TraverseOptions {
  order?: "top-down" | "bottom-up";
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
| `parent` | `MaybeRefOrGetter<FloatingNode \| null \| undefined>` | `undefined` | Parent node reference. Omitted/`undefined` uses DI; `null` forces standalone; `FloatingNode`/ref links explicitly. |

## Returns

| Name | Type | Notes |
| --- | --- | --- |
| `id` | `FloatingNodeId` | Stable symbol identifying the node in trees. |
| `refs` | `FloatingNodeElements` | Shared `anchorEl`, `floatingEl`, and `arrowEl` refs. |
| `open` | `Readonly<Ref<boolean>>` | Current reactive open state. |
| `setOpen` | `(open, reason?, event?) => void` | Updates open state with an explicit reason. Missing reason defaults to `"programmatic"`. |
| `parent` | `Readonly<ShallowRef<FloatingNode \| null>>` | Intrinsic parent node in the hierarchy. `null` for root or standalone nodes. |
| `children` | `Readonly<ShallowRef<ReadonlySet<FloatingNode>>>` | Immediate child nodes registered under this node. |
| `appendChild` | `(child: FloatingNode) => () => void` | Atomically links a child node under this parent. Returns a teardown function. |
| `removeChild` | `(child: FloatingNode) => void` | Unlinks a child node and clears the child's parent reference. |
| `contains` | `(target: EventTarget \| null) => boolean` | Checks whether target is contained in this node or any open descendant. |
| `traverse` | `(visitor, options?) => boolean` | Recursively traverses this node and its descendants in depth-first order. |

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

- `onOpenChange` is invoked with the transition reason and source event whenever the boolean open state transitions.
- Calling `setOpen` with the current value is a no-op and does not fire `onOpenChange`.

### Hierarchy & Parenting Resolution

`useFloatingNode` implements a three-tier parenting strategy:

1. **Implicit DI (Default / Omitted)**: When `parent` is omitted or `undefined`, `useFloatingNode` automatically injects the nearest ancestor `FloatingNode` from the Vue component hierarchy via `provide` / `inject`. In addition, every node automatically provides itself to descendant components.
2. **Explicit Standalone (`parent: null`)**: Passing `parent: null` explicitly opts out of Dependency Injection. The node will remain a standalone root with `parent.value === null` even when nested inside an ancestor component that provides a floating node.
3. **Explicit Parent (`parent: rootNode | ref | getter`)**: Passing an explicit `FloatingNode` (or reactive ref/getter) links directly to that parent, bypassing DI. This is ideal for flat single-component `<script setup>` scripts or explicit prop forwarding.

### Spatial Containment (`node.contains`)

`node.contains(target)` determines if an event target belongs to the floating surface or any of its open descendants. Interaction composables such as [`useDismiss`](/api/use-dismiss) and [`useHover`](/api/use-hover) rely on `node.contains` to prevent premature dismissals when interacting with nested submenus or child panels.

## Examples

### Multi-Component Submenu (Implicit DI)

In multi-component architectures, submenus automatically discover and register with parent nodes via Dependency Injection without passing props:

```vue
<!-- RootMenu.vue -->
<script setup lang="ts">
import { ref } from "vue";
import { useDismiss, useFloatingNode, usePosition } from "v-float";
import SubMenu from "./SubMenu.vue";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

// Automatically provides this node to child components
const node = useFloatingNode({ anchorEl, floatingEl });
usePosition(node);
useDismiss(node);
</script>

<template>
  <button ref="anchorEl" @click="node.setOpen(!node.open.value)">Menu</button>
  <div v-if="node.open.value" ref="floatingEl" class="menu">
    <SubMenu />
  </div>
</template>
```

```vue
<!-- SubMenu.vue -->
<script setup lang="ts">
import { ref } from "vue";
import { useDismiss, useFloatingNode, usePosition } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

// Omitted parent defaults to DI: automatically injects RootMenu node
const subNode = useFloatingNode({ anchorEl, floatingEl });
usePosition(subNode, { placement: "right-start" });
useDismiss(subNode);
</script>

<template>
  <button ref="anchorEl" @click="subNode.setOpen(!subNode.open.value)">Submenu</button>
  <div v-if="subNode.open.value" ref="floatingEl" class="submenu">
    <p>Submenu items</p>
  </div>
</template>
```

### Flat Script (Explicit Parent)

In flat single-component scripts where submenus are defined in the same `<script setup>`, pass the parent node explicitly:

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useDismiss, useFloatingNode, usePosition } from "v-float";

const rootAnchorEl = ref<HTMLElement | null>(null);
const rootFloatingEl = ref<HTMLElement | null>(null);
const subAnchorEl = ref<HTMLElement | null>(null);
const subFloatingEl = ref<HTMLElement | null>(null);

const root = useFloatingNode({ anchorEl: rootAnchorEl, floatingEl: rootFloatingEl });
const sub = useFloatingNode({ anchorEl: subAnchorEl, floatingEl: subFloatingEl, parent: root });

usePosition(root);
usePosition(sub, { placement: "right-start" });
useDismiss(root);
useDismiss(sub);
</script>
```

## See Also

- [`usePosition`](/api/use-position) - Add reactive coordinate calculations
- [`useDismiss`](/api/use-dismiss) - Coordinate outside clicks and Escape key dismissals across node hierarchies
- [`useClick`](/api/use-click) - Toggle open state on click or tap
- [Floating Node](/guide/floating-node) - Conceptual guide to floating nodes
