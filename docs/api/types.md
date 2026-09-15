---
description: Shared types, protocols, and data structures across the VFloat library.
---

# Types & Interfaces

This page documents the canonical shared types, protocols, and data structures exported by `v-float`.

## Core Node Types

### `FloatingNode`

The composite node instance returned by [`useFloatingNode`](/api/use-floating-node) representing an individual floating surface and its hierarchical relationships.

```ts
interface FloatingNode {
  /** Stable identity symbol for the node. */
  id: FloatingNodeId;

  /** Shared reactive element refs. */
  refs: FloatingNodeElements;

  /** Reactive boolean indicating whether the surface is open. */
  open: Readonly<Ref<boolean>>;

  /** Updates the open state and records the transition reason and source event. */
  setOpen: (open: boolean, reason?: OpenChangeReason, event?: Event) => void;

  /** The reason for the most recent open transition. Null when closed. */
  lastOpenReason?: Readonly<Ref<OpenChangeReason | null>>;

  /** The DOM event for the most recent open transition. Null when closed. */
  lastOpenEvent?: Readonly<Ref<Event | null>>;

  /** Intrinsic parent node in the composite hierarchy. Null for root nodes. */
  parent: Readonly<ShallowRef<FloatingNode | null>>;

  /** Immediate child nodes registered under this node. */
  children: Readonly<ShallowRef<ReadonlySet<FloatingNode>>>;

  /** Links a child node under this parent. Returns a teardown unbind function. */
  appendChild: (child: FloatingNode) => () => void;

  /** Unlinks a child node from this parent. */
  removeChild: (child: FloatingNode) => void;

  /** Checks if an event target is contained within this node or any open descendant. */
  contains: (target: EventTarget | null) => boolean;

  /** Recursively traverses this node and its descendants in depth-first order. */
  traverse: (
    visitor: (node: FloatingNode, depth: number) => TraverseAction,
    options?: TraverseOptions,
    depth?: number,
  ) => boolean;
}
```

### `FloatingNodeElements`

Reactive element references owned by a floating node.

```ts
interface FloatingNodeElements {
  anchorEl: Ref<AnchorElement>;
  floatingEl: Ref<FloatingElement>;
  arrowEl: Ref<HTMLElement | null>;
}
```

### `AnchorElement`

```ts
type AnchorElement = HTMLElement | VirtualElement | null;
```

### `FloatingElement`

```ts
type FloatingElement = HTMLElement | null;
```

### `FloatingNodeId`

```ts
type FloatingNodeId = symbol;
```

### `VirtualElement`

A synthetic anchor element that implements `getBoundingClientRect()` for coordinate-based positioning (such as cursor tracking or canvas areas).

```ts
interface VirtualElement {
  getBoundingClientRect: () => DOMRect | ClientRect;
  contextElement?: Element;
}
```

### `OpenChangeReason`

The semantic trigger reason recorded during an open state transition.

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

---

## Tree Traversal Types

### `TraverseAction`

Controls the flow of tree traversal inside a `traverse()` visitor callback.

```ts
type TraverseAction = void | "skip" | "stop";
```

- `void` / `undefined`: Continues traversal to the next node.
- `"skip"`: In `"top-down"` order, skips descending into the current node's children while continuing sibling traversal.
- `"stop"`: Immediately terminates the entire traversal across all nodes.

### `TraverseOptions`

```ts
interface TraverseOptions {
  /**
   * Traversal order:
   * - `"top-down"` (default / pre-order): visits the parent before its children.
   * - `"bottom-up"` (post-order): visits children before their parent.
   */
  order?: "top-down" | "bottom-up";
}
```

---

## Keyboard Navigation Protocol

### `NavigationTarget`

The minimal polymorphic navigation contract implemented by both [`useRovingFocus`](/api/use-roving-focus) and [`useAriaActivedescendant`](/api/use-aria-activedescendant). Allows auxiliary composables like [`useTypeahead`](/api/use-typeahead) to coordinate focus seamlessly.

```ts
interface NavigationTarget {
  /** Currently active or focused item index (-1 when unfocused / idle). */
  readonly activeIndex: Readonly<Ref<number>>;

  /**
   * Polymorphic navigation method to activate a specific item or move directionally.
   */
  focusIndex: (target: NavigationTargetValue, options?: NavigationTargetOptions) => void;
}
```

### `NavigationTargetValue`

Target destination or directional step accepted by `focusIndex()`.

```ts
type NavigationTargetValue =
  | number
  | "next"
  | "prev"
  | "previous"
  | "first"
  | "last"
  | "page-up"
  | "page-down"
  | "reset";
```

### `NavigationTargetOptions`

```ts
interface NavigationTargetOptions {
  /** Whether to prevent scrolling the newly focused element into view. */
  preventScroll?: boolean;
}
```

### `RovingEntryFocusMode`

```ts
type RovingEntryFocusMode = "entry-index" | "last-focused";
```

### `TypeaheadFindMatchFn`

Custom query matcher callback for [`useTypeahead`](/api/use-typeahead).

```ts
type TypeaheadFindMatchFn = (
  items: readonly (string | null)[],
  query: string,
  activeIndex: number,
) => number;
```

### `VirtualizerAdapter`

Adapter interface bridging virtual scroller engines (such as `@tanstack/vue-virtual`) to [`useAriaActivedescendant`](/api/use-aria-activedescendant).

```ts
interface VirtualizerAdapter {
  scrollToIndex: (index: number, options?: { align?: "start" | "center" | "end" | "auto" }) => void;
  count: () => number;
  isIndexRendered: (index: number) => boolean;
}
```

---

## Positioning Types

### `FloatingStyles`

Inline styles resolved for the floating panel.

```ts
type FloatingStyles = {
  position: Strategy;
  top: string;
  left: string;
  transform?: string;
  "will-change"?: string;
} & {
  [key: `--${string}`]: any;
};
```

### `FloatingPosition`

Positioning engine return object from [`usePosition`](/api/use-position).

```ts
interface FloatingPosition {
  x: Readonly<Ref<number>>;
  y: Readonly<Ref<number>>;
  strategy: Readonly<Ref<Strategy>>;
  placement: Readonly<Ref<Placement>>;
  middlewareData: Readonly<Ref<MiddlewareData>>;
  isPositioned: Readonly<Ref<boolean>>;
  styles: Readonly<Ref<FloatingStyles>>;
  update: () => Promise<void>;
}
```

### `ApplyStylesFn`

Custom style applicator callback for `usePosition({ applyStyles: fn })`.

```ts
type ApplyStylesFn = (element: HTMLElement, styles: FloatingStyles) => void | (() => void);
```

---

## Role & Semantics Types

### `FloatingRole`

```ts
type FloatingRole = "dialog" | "grid" | "listbox" | "menu" | "menubar" | "tooltip" | "tree";
```

### `FloatingRoleItemRole`

```ts
type FloatingRoleItemRole =
  | "gridcell"
  | "group"
  | "menuitem"
  | "menuitemcheckbox"
  | "menuitemradio"
  | "none"
  | "option"
  | "presentation"
  | "separator"
  | "treeitem";
```
