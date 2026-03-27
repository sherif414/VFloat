# Migration: Grouped Context

This guide covers the API shift from the old flat `FloatingContext` shape to the new grouped `refs`, `state`, and `position` sections.

## What Did Not Change

The `useFloating()` call signature stays the same:

```ts
const context = useFloating(anchorEl, floatingEl, options);
```

Your anchor ref, floating ref, and `middlewares` option still work the same way.

## What Did Change

The returned context is now grouped:

```ts
context.refs;
context.state;
context.position;
```

The main field moves are:

- `context.open` -> `context.state.open`
- `context.setOpen()` -> `context.state.setOpen()`
- `context.floatingStyles` -> `context.position.styles`
- `context.x` -> `context.position.x`
- `context.y` -> `context.position.y`
- `context.placement` -> `context.position.placement`
- `context.strategy` -> `context.position.strategy`
- `context.middlewareData` -> `context.position.middlewareData`
- `context.isPositioned` -> `context.position.isPositioned`
- `context.update()` -> `context.position.update()`

## Update Templates

This template update is the most common migration step.

```vue
<template>
  <div v-if="context.state.open.value" ref="floatingEl" :style="context.position.styles.value">
    Floating content
  </div>
</template>
```

## Update `useArrow`

`useArrow()` now owns arrow registration and takes the floating root first.

```ts
const { arrowStyles } = useArrow(context, {
  element: arrowEl,
});
```

If you were relying on `useFloating()` to infer arrow middleware through `refs.arrowEl`, move that setup into `useArrow()`.

## Update `useClientPoint`

`useClientPoint()` is now root-first as well:

```ts
useClientPoint(context, {
  pointerTarget: trackingArea,
});
```

## Compatibility Window

Flat aliases and the older `useArrow()` and `useClientPoint()` signatures still exist during the transition, but they are compatibility helpers. New code should use the grouped form shown in this guide.

## Further Reading

- [`useFloating`](/api/use-floating)
- [`useArrow`](/api/use-arrow)
- [`useClientPoint`](/api/use-client-point)
- [How It Works](/guide/how-it-works)
