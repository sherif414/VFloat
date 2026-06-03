# Virtual Point API Problem Statement

## Purpose

VFloat currently has `useClientPoint()`, a composable for pointer-driven virtual anchors. During review, we found that the API works for some cases, but its responsibility boundary feels muddy.

This document captures the current behavior, the user expectations we discussed, the design ideas raised, and the unresolved questions. It is intended as a discussion artifact for reviewing a broader breaking API change.

## Project Context

VFloat separates floating UI behavior into composable layers:

- `useFloatingContext()` owns shared refs and open state.
- `usePosition()` reads the anchor and floating element, then computes layout.
- Interaction composables such as `useHover()`, `useClick()`, `useFocus()`, and `useEscapeKey()` manage open/close behavior.
- Virtual anchors let a floating surface position against synthetic geometry instead of a real DOM element.

The core domain issue is that a real DOM anchor does many jobs at once:

- Provides geometry.
- Receives pointer and keyboard listeners.
- Can receive focus.
- Carries ARIA attributes.
- Participates in outside-click containment.
- Acts as a semantic trigger.

A pointer-based virtual anchor only naturally provides geometry. It does not represent a focusable, clickable, semantic DOM object.

## Current `useClientPoint()` Behavior

`useClientPoint(context, options)` currently:

- Takes an existing floating context.
- Replaces `context.refs.anchorEl.value` with a virtual element.
- Preserves and restores the previous anchor when disabled.
- Tracks pointer coordinates from a `trackingTarget`.
- Defaults `trackingTarget` to `document.documentElement`.
- Supports `trackingMode: "follow"` and `trackingMode: "static"`.
- Supports axis constraints with `axis: "x" | "y" | "both"`.
- Supports controlled `x` and `y` coordinates.
- Calls `position.update()` when virtual geometry changes while open.
- Returns `coordinates` and `updatePosition()`.

This means it is doing at least two things:

- Creating and maintaining a virtual point anchor.
- Acting as an open-aware pointer tracking controller.

## Current Awkward Usage Pattern

The current setup flow feels inverted:

```ts
const anchorEl = ref(null);
const floatingEl = ref(null);

const context = useFloatingContext({
  refs: { anchorEl, floatingEl },
});

const position = usePosition(context);

useClientPoint(context, {
  position,
  trackingTarget: areaEl,
});
```

The user creates a placeholder `anchorEl`, then `useClientPoint()` later mutates the context and replaces that placeholder with a virtual element.

This is unlike normal VFloat usage, where the anchor is provided to `useFloatingContext()` up front.

## User Expectation

For pointer-positioned floating UI, users usually expect one of these workflows:

- Cursor-follow tooltip or inspector.
- Context menu opened at a right-click point.
- Click-to-place popover.
- Fully controlled point from app state.

In those cases, users often think in terms of "the anchor is a virtual point." They do not expect to create a dummy DOM anchor ref and then have another composable replace it.

## Proposed Direction: `useVirtualPoint()`

One idea is to introduce a composable whose sole responsibility is creating and maintaining a virtual point.

Possible shape:

```ts
const point = useVirtualPoint({
  contextElement: areaEl,
});

point.setCoordinates(e.clientX, e.clientY);

const context = useFloatingContext({
  refs: {
    anchor: point,
    floatingEl,
  },
});
```

The important idea is that the returned object itself is the virtual anchor. Users should not need to write `point.anchorEl`.

This would make `useFloatingContext()` accept the whole virtual point shape directly instead of requiring an `anchorEl` ref that wraps it.

## Naming Tensions

The current public type name `VirtualElement` may be too implementation-shaped. It describes the Floating UI-compatible protocol, not the VFloat domain concept.

Possible vocabulary:

- `VirtualAnchor`: generic synthetic anchor protocol.
- `VirtualPoint`: point-specific virtual anchor.
- `FloatingAnchor`: union of real DOM anchor and virtual anchor.
- `useVirtualPoint`: creates a point-backed virtual anchor.

The `anchorEl` field name also becomes questionable if it can receive a rich virtual anchor object. The `El` suffix implies a DOM element. A broader breaking change may rename it to `anchor`.

## Coordinate API Naming

`point.setPoint()` does not sound right. It is vague and does not match what is being overwritten.

Better:

```ts
point.setCoordinates(x, y);
point.clearCoordinates();
```

This also avoids confusion with `usePosition()`, because `setCoordinates()` changes the virtual anchor geometry; it does not run positioning.

## Scope Of `useVirtualPoint()`

`useVirtualPoint()` should probably own:

- The virtual anchor object.
- The current coordinates.
- Coordinate sanitization.
- `setCoordinates()`.
- `clearCoordinates()`.
- `getBoundingClientRect()`.
- The associated real DOM element used as `contextElement`.
- Fallback geometry when one axis is constrained.

It should probably not own:

- Pointer event listeners.
- Hover semantics.
- Click semantics.
- Context-menu semantics.
- Open/close state.
- `trackingMode: "follow"` or `"static"` if those remain open-aware concepts.
- Outside-click dismissal.
- Keyboard behavior.

## The Elephant In The Room

Once a user has a virtual point, what happens next?

A virtual point can be passed to positioning, but it cannot replace every responsibility of a real DOM anchor.

For example:

- `usePosition()` makes sense with a virtual point.
- `useEscapeKey()` makes sense because it only closes state.
- `useHover()` may make sense for cursor-follow tooltips, but the hover target is not the point; it is some real tracking element.
- `useClick()` does not naturally make sense as an anchor trigger for a pointer point.
- `useFocus()` usually does not make sense because a pointer point cannot receive focus.
- `useRole()` likely applies to the floating element or a real trigger, not the point.
- `useListNavigation()` may apply to the floating content, but not because the virtual point is keyboard-interactive.

The key distinction:

> A pointer virtual point is a geometry source, not a semantic trigger.

Therefore VFloat should not try to make every DOM-anchor interaction composable work with virtual points by default.

## Interaction Patterns Still Needed

If `useVirtualPoint()` becomes the low-level geometry primitive, VFloat still needs a clear story for common user-facing patterns.

### Cursor-Follow Tooltip

Desired behavior:

- Track pointer coordinates while hovering an area.
- Open on pointer enter.
- Move while open.
- Close on pointer leave.

Possible API directions:

```ts
const point = useVirtualPoint({ contextElement: areaEl });
const context = useFloatingContext({ refs: { anchor: point, floatingEl } });

useCursorTooltip(context, point, { target: areaEl });
```

Or a lower-level pair:

```ts
usePointerPointTracking(point, {
  target: areaEl,
  open: context.state.open,
  mode: "follow",
});

useHoverTarget(context, { target: areaEl });
```

### Context Menu

Desired behavior:

- Listen to `contextmenu` on a real target.
- Prevent the native browser menu.
- Set coordinates from the event.
- Open at that point.
- Close via outside pointer and Escape.

Possible API:

```ts
const point = useVirtualPoint({ contextElement: areaEl });
const context = useFloatingContext({ refs: { anchor: point, floatingEl } });

useContextMenu(context, point, { target: areaEl });
useEscapeKey(context);
```

Or manual:

```ts
function onContextMenu(e: MouseEvent) {
  e.preventDefault();
  point.setCoordinates(e.clientX, e.clientY);
  context.state.setOpen(true, "context-menu", e);
}
```

### Click-To-Place Popover

Desired behavior:

- Click or press in an area.
- Set virtual point to the event coordinates.
- Open at that point.
- Close on outside pointer and Escape.

This may deserve a specific helper, or it may be simple enough to remain a documented manual pattern.

### Controlled Point

Desired behavior:

- App owns coordinates.
- Floating surface positions against those coordinates.
- App owns open state.

This is the cleanest `useVirtualPoint()` use case:

```ts
const point = useVirtualPoint({
  x,
  y,
  contextElement: areaEl,
});
```

## Questions For Review

1. Should VFloat rename `VirtualElement` to `VirtualAnchor`, or keep `VirtualElement` as an internal compatibility type?
2. Should `useFloatingContext()` rename `refs.anchorEl` to `refs.anchor` in a breaking release?
3. Should `useFloatingContext()` accept a virtual anchor object directly, not only a ref?
4. Should real DOM anchors also move from `anchorEl: Ref<HTMLElement | null>` to `anchor: Ref<HTMLElement | null> | HTMLElement | VirtualAnchor`?
5. Should `useVirtualPoint()` return an object that is itself passable as the anchor?
6. What should the exact `useVirtualPoint()` return shape be?
7. Should `useVirtualPoint()` include axis constraints, or should axis constraints stay in a higher-level pointer tracking utility?
8. Should pointer tracking stay as `useClientPoint()`, be renamed, or be replaced with more specific helpers?
9. Should VFloat add first-class helpers such as `useContextMenu()` or `useCursorTooltip()`?
10. Should outside-click dismissal be extracted from `useClick()` so virtual-point patterns can use dismissal without pretending there is a clickable anchor?
11. What open-change reasons should exist for these patterns? Possible additions: `"context-menu"`, `"point-click"`, `"cursor-hover"`.

## Current Leaning

The most promising direction is:

- Treat virtual points as geometry sources.
- Make `useVirtualPoint()` a first-class anchor creator.
- Do not force normal DOM-anchor interaction composables to support virtual pointer points when the semantics do not fit.
- Provide separate, explicit interaction helpers for common pointer-point use cases.
- Use `contextElement` to associate a virtual anchor with a real DOM element for containment and fallback geometry, not as a disguised listener target.

## Why This Matters

The current `useClientPoint()` API works, but its setup pattern makes the anchor feel like a placeholder that is later overwritten. That obscures the fact that virtual point geometry is the actual anchor.

A better API would let the user declare the anchor source first, then compose positioning and interaction behavior around it.
