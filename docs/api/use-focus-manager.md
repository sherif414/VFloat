---
description: Manages initial focus, modal trapping, return focus, and portal boundary guards.
---

# useFocusManager

`useFocusManager` orchestrates focus for open floating surfaces. It handles initial focus on open, modal and non-modal focus containment, portal focus guards (sentinels), background isolation (`inert`), and return focus restoration on close.

## Type

```ts
function useFocusManager(
  node: UseFocusManagerContext,
  options?: UseFocusManagerOptions,
): UseFocusManagerReturn;

interface UseFocusManagerContext extends Pick<FloatingNode, "id" | "refs" | "open" | "setOpen"> {}

interface UseFocusManagerOptions {
  /**
   * Whether focus management is enabled.
   * @default true
   */
  enabled?: MaybeRefOrGetter<boolean>;

  /**
   * Explicit floating tree for family-aware focus checks across nested surfaces.
   * When omitted, only the node's own anchor and floating elements count as inside.
   */
  tree?: MaybeRefOrGetter<FloatingTree | null | undefined>;

  /**
   * Whether the floating surface acts as a modal dialog, strictly trapping focus inside
   * and isolating outside DOM elements.
   * @default true
   */
  modal?: MaybeRefOrGetter<boolean>;

  /**
   * Specifies the element to receive initial focus on open.
   * - `HTMLElement` | `Ref<HTMLElement | null>`: Focuses the provided element.
   * - `() => HTMLElement | false | null`: Dynamic function returning the element to focus.
   * - `false`: Prevents initial focus from being set.
   * - `undefined`: Focuses the first tabbable child (falling back to the floating container).
   */
  initialFocus?: HTMLElement | Ref<HTMLElement | null> | (() => HTMLElement | null | false) | false;

  /**
   * Whether (and where) to restore focus upon closing.
   * - `true`: Restores focus to the trigger element that was active before opening.
   * - `HTMLElement` | `Ref<HTMLElement | null>`: Restores focus to a specific element.
   * - `false`: Does not restore focus.
   * @default true
   */
  returnFocus?: MaybeRefOrGetter<boolean | HTMLElement | Ref<HTMLElement | null>>;

  /**
   * Whether to inject and manage off-screen focus guard sentinels around the floating element
   * to catch portal boundary focus leaks.
   * @default true
   */
  guards?: MaybeRefOrGetter<boolean>;

  /**
   * When `modal` is false, closes the floating element when focus moves outside its family.
   * Has no effect when `modal` is true.
   * @default false
   */
  closeOnFocusOut?: MaybeRefOrGetter<boolean>;

  /**
   * When `modal` is false, closes the floating element when the user presses Tab to leave.
   * When `modal` is true, Tab wraps inside instead.
   * @default false
   */
  closeOnTab?: MaybeRefOrGetter<boolean>;

  /**
   * Isolates background DOM elements using `inert` (or `aria-hidden="true"` fallback).
   * Defaults to `true` when `modal: true`, and `false` otherwise.
   */
  outsideElementsInert?: MaybeRefOrGetter<boolean>;

  /**
   * Whether browser scrolling is prevented when focusing elements.
   * @default true
   */
  preventScroll?: MaybeRefOrGetter<boolean>;

  /**
   * Custom predicate to ignore focus loss to specific target elements.
   */
  ignoreFocusOut?: (target: EventTarget | null) => boolean;

  /**
   * Optional error callback when focus management activation encounters an error.
   */
  onError?: (error: unknown) => void;
}

interface UseFocusManagerReturn {
  /**
   * Whether focus management is currently active.
   */
  isActive: ComputedRef<boolean>;

  /**
   * Manually activates focus management. No-op while the node is closed.
   */
  activate: () => void;

  /**
   * Manually deactivates focus management, closes with the `programmatic` reason,
   * and restores focus according to `returnFocus`.
   */
  deactivate: () => void;
}
```

## Details

`useFocusManager` is the central surface focus manager for dialogs, popovers, and modal overlays. It activates after open (once the floating element mounts) and deactivates on close or unmount:

- **Initial Focus**: When the surface opens, focus is routed to the first tabbable child (or the element specified by `initialFocus`). If no tabbable children exist, it focuses the floating container (`tabindex="-1"`) to prevent focus loss. Custom targets must be connected to the document; disconnected targets fall back to the default.
- **Modal Focus Trapping**: When `modal` is `true`, <kbd>Tab</kbd> wraps from the last tabbable element to the first, and <kbd>Shift+Tab</kbd> wraps from the first element to the last. If focus escapes anyway (for example, when the focused child unmounts), it is pulled back inside.
- **Focus Guards (Sentinels)**: When `guards` is `true`, invisible boundary sentinels are maintained around portaled floating elements so <kbd>Tab</kbd> and <kbd>Shift+Tab</kbd> never escape into the browser address bar or unrelated document roots.
- **Return Focus**: When the surface closes, focus is returned to the custom `returnFocus` element when it is connected, otherwise to the anchor, otherwise to the element that was active before opening. Focus is never stolen when it already moved elsewhere naturally, and unmounting deactivates without restoring focus.
- **Background Isolation**: When `modal` or `outsideElementsInert` is `true`, outside sibling elements are marked `inert` (with `aria-hidden="true"` fallback) and restored upon close. Nested family elements resolved through `tree` stay interactive.
- **Non-Modal Dismissal**: When `modal` is `false`, setting `closeOnFocusOut: true` dismisses the surface when focus (reason `"blur"`) or pointer input (reason `"outside-pointer"`) lands outside, honoring `ignoreFocusOut`. Setting `closeOnTab: true` closes with the `"tab-key"` reason when <kbd>Tab</kbd> leaves. `closeOnFocusOut` has no effect while `modal` is `true`.

## Example

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useFocusManager, useFloatingNode } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);
const open = ref(false);

const node = useFloatingNode({ anchorEl, floatingEl, open });

useFocusManager(node, {
  modal: true,
  returnFocus: true,
});
</script>

<template>
  <button ref="anchorEl" type="button" @click="node.setOpen(!node.open)">Open dialog</button>

  <Teleport to="body">
    <div v-if="node.open" class="backdrop">
      <div ref="floatingEl" role="dialog" aria-modal="true" tabindex="-1">
        <h2>Dialog Title</h2>
        <input placeholder="Type something..." />
        <button type="button" @click="node.setOpen(false)">Close</button>
      </div>
    </div>
  </Teleport>
</template>
```

## See Also

- [`useFocus`](/api/use-focus) - Trigger-level focus detection for anchors
- [`useEscapeKey`](/api/use-escape-key) - Dismissal on Escape key press
- [`useOutsideClick`](/api/use-outside-click) - Dismissal on pointer clicks outside
- [useFloatingTree](/api/use-floating-tree) - Family-aware focus checks for nested surfaces
