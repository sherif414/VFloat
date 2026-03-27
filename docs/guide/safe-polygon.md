# Safe Polygon

`safePolygon` keeps hover-based surfaces open while the pointer travels between the trigger and the floating element. It is the piece that stops a menu or tooltip from closing the moment the cursor leaves the anchor on its way to the panel.

## Why It Exists

Hover menus are easy to describe and surprisingly annoying to use if the gap between the trigger and the floating element is even slightly unforgiving. A plain `mouseleave` closes too early, so the user has to fight the interface instead of moving naturally toward the panel.

`safePolygon` gives the cursor a protected path across that gap.

## Turn It On

The usual way to use it is to pass `safePolygon: true` into `useHover()`.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useFloating, useHover } from "v-float";

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const context = useFloating(anchorEl, floatingEl, {
  placement: "right",
});

useHover(context, {
  safePolygon: true,
});
</script>

<template>
  <button ref="anchorEl">Hover me</button>

  <div v-if="context.state.open.value" ref="floatingEl" :style="context.position.styles.value">
    Move the pointer here
  </div>
</template>
```

That is often enough. If the pointer moves naturally from the trigger to the floating content, the surface stays open.

::: tip
Use `safePolygon` when the floating element is meant to feel like one continuous hover target with the trigger. That includes menus, preview panels, and other surfaces where the user is clearly moving toward the content.
:::

## Tune The Corridor

When the gap is large or the pointer movement is less precise, pass an options object instead of a boolean.

```ts
useHover(context, {
  safePolygon: {
    buffer: 8,
    requireIntent: true,
  },
});
```

The options work like this:

- `buffer` widens the safe area.
- `requireIntent` keeps the algorithm stricter by checking cursor movement before it decides that the user really meant to travel into the panel.
- `onPolygonChange` is useful when you want to inspect the polygon shape while debugging.

If the surface feels too sticky, lower the buffer. If it closes too eagerly, give the polygon a little more room.

::: warning Watch the tradeoff
A large buffer makes the path easier to cross, but it also makes the invisible safe zone feel bigger than the visible UI. That is good for accessibility in some cases and confusing in others, so keep the value tight.
:::

## Debugging Hover Paths

The polygon is not just a concept. You can observe it while debugging by wiring `onPolygonChange`.

```ts
useHover(context, {
  safePolygon: {
    buffer: 4,
    onPolygonChange(polygon) {
      console.log(polygon);
    },
  },
});
```

That callback is handy when you want to verify why the cursor is staying open or why it is closing earlier than expected.

## Further Reading

- [`useHover` API](/api/use-hover)
- [Interactions](/guide/interactions)
