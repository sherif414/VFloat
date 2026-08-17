---
description: Manages initial focus, modal trapping, return focus, and portal boundary guards.
---

# useFocusManager

`useFocusManager` orchestrates focus for open floating surfaces. It handles initial focus on open, modal and non-modal focus containment, portal focus guards (sentinels), background isolation (`inert`), and return focus restoration on close.

## Type

```ts
function useFocusManager(
  context: UseFocusManagerContext,
  options?: UseFocusManagerOptions,
): UseFocusManagerReturn;

interface UseFocusManagerContext {
  refs: FloatingContext["refs"];
  state: FloatingContext["state"];
}

interface UseFocusManagerOptions {
  /**
   * Whether focus management is enabled.
   * @default true
   */
  enabled?: MaybeRefOrGetter<boolean>;

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
   * @default false
   */
  closeOnFocusOut?: MaybeRefOrGetter<boolean>;

  /**
   * When `modal` is false, closes the floating element when the user presses Tab to leave.
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
   * Optional error callback when focus management encounters an error.
   */
  onError?: (error: unknown) => void;
}

interface UseFocusManagerReturn {
  /**
   * Whether focus management is currently active.
   */
  isActive: ComputedRef<boolean>;

  /**
   * Manually activates focus management.
   */
  activate: () => void;

  /**
   * Manually deactivates focus management and restores focus.
   */
  deactivate: () => void;
}
```

## Details

`useFocusManager` is the central surface focus manager for dialogs, popovers, and modal overlays. It coordinates the full focus lifecycle of an open floating surface:

- **Initial Focus**: When the surface opens, focus is routed to the first tabbable child (or the element specified by `initialFocus`). If no tabbable children exist, it focuses the floating container (`tabindex="-1"`) to prevent focus loss.
- **Modal Focus Trapping**: When `modal` is `true`, <kbd>Tab</kbd> wraps from the last tabbable element to the first, and <kbd>Shift+Tab</kbd> wraps from the first element to the last.
- **Focus Guards (Sentinels)**: When `guards` is `true`, invisible boundary sentinels are maintained around portaled floating elements so <kbd>Tab</kbd> and <kbd>Shift+Tab</kbd> never escape into the browser address bar or unrelated document roots.
- **Return Focus**: When the surface closes, focus is automatically returned to the trigger element that was active before opening (or the custom element provided in `returnFocus`). If the trigger was unmounted, it safely falls back without throwing runtime errors.
- **Background Isolation**: When `modal` or `outsideElementsInert` is `true`, outside sibling elements are marked `inert` (with `aria-hidden="true"` fallback) and restored upon close.
- **Non-Modal Dismissal**: When `modal` is `false`, setting `closeOnFocusOut: true` or `closeOnTab: true` cleanly dismisses the surface when focus leaves, with built-in awareness of parent and child floating layers in a `FloatingTree`.

## Example

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useFocusManager, useFloatingContext } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);
const open = ref(false);

const context = useFloatingContext({ anchorEl, floatingEl, open });

useFocusManager(context, {
  modal: true,
  returnFocus: true,
});
</script>

<template>
  <button ref="anchorEl" type="button" @click="context.state.setOpen(!context.state.open.value)">
    Open dialog
  </button>

  <Teleport to="body">
    <div v-if="context.state.open.value" class="backdrop">
      <div ref="floatingEl" role="dialog" aria-modal="true" tabindex="-1">
        <h2>Dialog Title</h2>
        <input placeholder="Type something..." />
        <button type="button" @click="context.state.setOpen(false)">Close</button>
      </div>
    </div>
  </Teleport>
</template>
```

## See Also

- [`useFocus`](/api/use-focus) - Trigger-level focus detection for anchors
- [`useEscapeKey`](/api/use-escape-key) - Dismissal on Escape key press
- [`useOutsideClick`](/api/use-outside-click) - Dismissal on pointer clicks outside
- [`useListNavigation`](/api/use-list-navigation) - Composite keyboard navigation for menus and listboxes
