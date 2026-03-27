# Interactions

Interactions are the composables that control when a floating surface opens and closes. They sit on top of `useFloating()`: the context holds the grouped state, and each interaction composable decides how users change that state.

The key insight is this: pick the interaction that matches the surface type, then layer on extras for completeness. We will build up from simple to layered.

## Step 1: Click to Open and Close

Click-driven surfaces — dropdowns, menus, popovers — are the most common pattern. `useClick` toggles `context.state.open.value` when the anchor is clicked.

Let's start with the base setup:

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useClick, useFloating } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const context = useFloating(anchorEl, floatingEl);

useClick(context);
</script>

<template>
  <button ref="anchorEl">Open menu</button>

  <div v-if="context.state.open.value" ref="floatingEl" :style="context.position.styles.value">
    Menu content
  </div>
</template>
```

Click the button and the menu opens. Click again and it closes.

::: tip
`useClick` toggles by default. Pass `toggle: false` if you want clicks to only open and never close (useful when dismissal is handled another way).
:::

## Step 2: Close on Outside Click

Right now the menu stays open no matter where you click. Most dropdowns close when you click outside. Add `closeOnOutsideClick`:

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useClick, useFloating } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const context = useFloating(anchorEl, floatingEl);

useClick(context, {
  closeOnOutsideClick: true,
});
</script>
```

Now clicking anywhere outside the floating element closes it.

::: warning
Be careful when combining `useClick` with `useHover` on the same context. A `mouseleave` on the floating element can close a surface that was intentionally opened by click. If you need both, consider using `useHover` only and adding a separate click handler for opening.
:::

## Step 3: Close on Escape

Keyboard users expect Escape to dismiss floating surfaces. `useEscapeKey` hooks into the keyboard:

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useClick, useEscapeKey, useFloating } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const context = useFloating(anchorEl, floatingEl);

useClick(context, { closeOnOutsideClick: true });
useEscapeKey(context);
</script>
```

Now the menu closes on Escape, on outside click, and on clicking the trigger again.

## Step 4: Build a Tooltip with Hover

Tooltips behave differently from menus. They appear on hover, not on click, and they should not close the moment the cursor leaves the anchor on its way to the tooltip itself.

`useHover` handles the pointer path:

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useFloating, useHover } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const context = useFloating(anchorEl, floatingEl, {
  placement: "top",
});

useHover(context);
</script>

<template>
  <button ref="anchorEl">Hover me</button>

  <div v-if="context.state.open.value" ref="floatingEl" :style="context.position.styles.value">
    Tooltip content
  </div>
</template>
```

The tooltip opens when the pointer enters the anchor and closes when it leaves.

::: tip
If the tooltip has a gap between the anchor and itself, add `safePolygon: true` so the tooltip does not close while the cursor is crossing that gap. See the [Safe Polygon](/guide/safe-polygon) guide for details.
:::

## Step 5: Combine Hover and Focus

Tooltips should be accessible to keyboard users too. `useFocus` opens the tooltip when the anchor receives focus (via Tab), and `useHover` handles the pointer:

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useFocus, useFloating, useHover } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const context = useFloating(anchorEl, floatingEl, {
  placement: "top",
});

useHover(context);
useFocus(context);
</script>
```

Now both hovering and focusing the anchor opens the tooltip.

## Step 6: Build a Modal with Focus Trap

Dialogs and modal surfaces need different behavior. The focus should stay trapped inside the floating element, and the outside should not be interactive while the modal is open.

Add `useFocusTrap`:

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useClick, useEscapeKey, useFloating, useFocusTrap } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const context = useFloating(anchorEl, floatingEl);

useClick(context, { closeOnOutsideClick: true });
useEscapeKey(context);
useFocusTrap(context, { modal: true });
</script>

<template>
  <button ref="anchorEl">Open dialog</button>

  <Teleport to="body">
    <div v-if="context.open.value" class="backdrop">
      <div
        ref="floatingEl"
        role="dialog"
        aria-modal="true"
        tabindex="-1"
        :style="context.position.styles.value"
      >
        Dialog content
      </div>
    </div>
  </Teleport>
</template>
```

`useFocusTrap` with `modal: true` keeps focus inside the dialog and prevents the rest of the page from receiving input.

## Choosing the Right Pattern

Use this decision guide:

- **Click only** — Toggle a popover or menu. Add `closeOnOutsideClick` and `useEscapeKey`.
- **Hover only** — Show a tooltip. Consider adding `useFocus` for keyboard accessibility.
- **Click + outside click** — Start with `useClick` for the trigger behavior.
- **Modal** — Add `useFocusTrap` to trap focus and `useEscapeKey` for dismissal.

## Mixing Interactions Safely

When you need multiple interactions on the same surface, keep these rules:

1. **Share the context** — All composables must use the same context.
2. **Avoid contradictory triggers** — `useClick` and `useHover` on the same surface can conflict if they manage open state differently.
3. **Layer dismissal last** — Add `useEscapeKey` and outside-click handling after the opening behavior is working.
4. **Prefer grouped reads in new code** — Reach for `context.state.open` and `context.position.styles` instead of the older flat aliases.

## Further Reading

- [Safe Polygon](/guide/safe-polygon) — Keep hover surfaces open between anchor and floating element
- [Virtual Elements](/guide/virtual-elements) — Position at cursor coordinates for context menus
- [Keyboard List Navigation](/guide/list-navigation) — Arrow key navigation for menus and listboxes
- [`useClick` API](/api/use-click)
- [`useHover` API](/api/use-hover)
- [`useFocus` API](/api/use-focus)
- [`useEscapeKey` API](/api/use-escape-key)
- [`useFocusTrap` API](/api/use-focus-trap)
- [Migration: Grouped Context](/guide/migration-grouped-context)
