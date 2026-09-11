---
description: Manages initial focus, modal trapping, return focus, and portal boundary guards.
---

# useFocusTrap

`useFocusTrap` orchestrates focus for open floating surfaces. It handles initial focus on open, modal and non-modal focus containment, portal focus guards (sentinels), background isolation (`inert`), and return focus restoration on close.

## Type

```ts
function useFocusTrap(
  node: UseFocusTrapContext,
  options?: UseFocusTrapOptions,
): UseFocusTrapReturn;

interface UseFocusTrapContext extends Pick<FloatingNode, "id" | "refs" | "open" | "setOpen"> {}

interface UseFocusTrapOptions {
  /**
   * Whether focus management is enabled.
   * @default true
   */
  enabled?: MaybeRefOrGetter<boolean>;

  /**
   * Explicit floating tree for family-aware focus checks across nested surfaces.
   * When omitted, only the node's own anchor and floating elements count as inside.
   */
  tree?: FloatingTree | null | undefined;

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

interface UseFocusTrapReturn {
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

## Options

| Name | Type | Default | Notes |
| --- | --- | --- | --- |
| `enabled` | `MaybeRefOrGetter<boolean>` | `true` | Gates activation. |
| `tree` | `FloatingTree \| null \| undefined` | — | Family-aware focus checks; nested families stay interactive. |
| `modal` | `MaybeRefOrGetter<boolean>` | `true` | Traps focus and isolates background. |
| `initialFocus` | element, ref, fn, or `false` | — | `false` skips; omitted focuses first tabbable child or container. |
| `returnFocus` | `boolean \| element \| ref` | `true` | Restores to trigger, custom element, or nothing. |
| `guards` | `MaybeRefOrGetter<boolean>` | `true` | Portal boundary sentinels for Tab wrapping. |
| `closeOnFocusOut` | `MaybeRefOrGetter<boolean>` | `false` | Non-modal only; dismisses on outside focus/pointer. |
| `closeOnTab` | `MaybeRefOrGetter<boolean>` | `false` | Non-modal closes on Tab leave; modal wraps instead. |
| `outsideElementsInert` | `MaybeRefOrGetter<boolean>` | follows `modal` | `inert` isolation with `aria-hidden` fallback. |
| `preventScroll` | `MaybeRefOrGetter<boolean>` | `true` | Prevents scroll on programmatic focus. |
| `ignoreFocusOut` | `(target) => boolean` | — | Keeps open for selected outside targets. |
| `onError` | `(error: unknown) => void` | — | Activation error callback. |

## Returns

| Name | Type | Notes |
| --- | --- | --- |
| `isActive` | `ComputedRef<boolean>` | Whether focus management is active. |
| `activate` | `() => void` | Manual activation; no-op while closed. |
| `deactivate` | `() => void` | Deactivates, closes with `"programmatic"`, restores focus. |

## Details

`useFocusTrap` is the central surface focus manager for dialogs, popovers, and modal overlays. It activates after open (once the floating element mounts) and deactivates on close or unmount:

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
import { useFocusTrap, useFloatingNode } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);
const open = ref(false);

const node = useFloatingNode({ anchorEl, floatingEl, open });

useFocusTrap(node, {
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
- [`useDismiss`](/api/use-dismiss) - Escape and outside-press dismissal
- [`useFloatingTree`](/api/use-floating-tree) - Family-aware focus checks for nested surfaces
