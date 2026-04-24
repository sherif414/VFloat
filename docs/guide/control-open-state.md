---
description: Control floating open state from your own Vue state and event handling.
---

# Control Open State

Let's talk about open state.

Most floating surfaces are easiest when VFloat owns the open state for you. But sometimes the parent component needs to stay in charge because the floating surface has to follow routing, forms, or other application rules.

This page shows both models and when each one makes sense.

## The Default: Let VFloat Own It

If you call [`useFloating`](/api/use-floating) without an `open` ref, VFloat creates and owns that state for you.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useClick, useFloating } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const context = useFloating(anchorEl, floatingEl);

useClick(context);
</script>
```

This is usually the simplest starting point. The component stays small, and your interaction composables and template all coordinate through `context.state`.

## The Controlled Version

When the parent needs authority, pass `open` and `onOpenChange`.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useClick, useFloating } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);
const open = ref(false);

const context = useFloating(anchorEl, floatingEl, {
  open,
  onOpenChange(nextOpen, reason, event) {
    open.value = nextOpen;
  },
});

useClick(context, {
  closeOnOutsideClick: true,
});
</script>
```

Now the parent-owned `open` ref is the source of truth, and VFloat reports changes through `onOpenChange(nextOpen, reason, event)`.

## When Each Model Makes Sense

Choose uncontrolled when:

- The surface is local
- The component can own its own lifecycle
- Simplicity matters most

Choose controlled when:

- Another component needs to decide whether the surface may open
- Closing the surface should trigger other state updates
- Multiple related surfaces need shared coordination

## Keep One Context Per Surface

Whatever state model you choose, make sure every interaction composable for that surface shares the same `context`.

That shared `context` is what lets click, escape handling, and positioning cooperate instead of fighting each other.

## Next Step

If you want to understand the shared model behind both versions, read [Floating Context](/guide/floating-context). If you are ready for practical builds, jump to [Build Accessible Tooltips](/guide/build-accessible-tooltips) or [Build Popovers and Dropdowns](/guide/build-popovers-and-dropdowns).
