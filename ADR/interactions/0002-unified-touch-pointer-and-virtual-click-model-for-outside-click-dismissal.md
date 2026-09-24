---
status: accepted
date: 2026-09-24
---

# Unified touch, pointer, and virtual click model for outside-click dismissal

## Context

Historically, outside-click implementations exposed an `event` option (`"pointerdown" | "mousedown" | "click"`) and an `ignoreDrag` option backed by an imperative gesture tracking state machine (`dragStartTarget`, `dragEndTarget`, reset timers).

This introduced a lose-lose choice for consumers:
1. `event: "pointerdown"` feels instant on desktop mouse, but on touchscreens it fires on initial finger contact before the browser determines whether the user intended to scroll. Touching anywhere to scroll the page prematurely snapped floating overlays closed.
2. `event: "click"` allowed touch scrolling (because browsers suppress `click` during scroll gestures), but made desktop dismissal feel sluggish and required drag-tracking heuristics to prevent text selection from inside to outside from triggering dismissal on release.
3. Exposing `event` as a public option leaked browser mechanics into consumer code and forced developers to choose between desktop responsiveness and mobile touch safety.

## Decision

1. Remove the `event` and `ignoreDrag` options from `UseOutsideClickOptions`.
2. Adopt a zero-config unified dispatch model in `useOutsideClick`:
   - **Desktop Mouse & Pen**: Handled on `pointerdown`. If `event.pointerType !== "touch"`, dismiss immediately ($t = 0$), preserving snappy desktop UX.
   - **Touchscreens**: On `pointerdown`, ignore if `event.pointerType === "touch"`. Instead, handle touch on `click`. When a user touches the screen to scroll, the browser natively suppresses the `click` event, preserving the open overlay during scrolling. When a user taps outside, the browser emits a `click` with `pointerType: "touch"`, dismissing the overlay.
   - **Keyboard & Assistive Technology**: On `click`, accept virtual activations (`event.detail === 0`).
   - **Free Drag-Out Suppression**: Because desktop mouse dismissal occurs on `pointerdown` and trailing mouse clicks (`event.detail > 0`) are ignored, selecting text inside an overlay and releasing outside cannot dismiss the overlay. The entire `isDragGesture()` state machine and timer infrastructure are deleted.

## Alternatives considered

- Configurable `{ mouse: "pointerdown", touch: "click" }`: rejected because developers universally expect responsive desktop dismissal and scroll-safe mobile behavior without boilerplate configuration.
- Hand-rolled touch gesture recognizer (tracking Euclidean touch movement and holding timers): rejected as over-engineering; the browser's native touch pipeline already reliably distinguishes taps from scrolls via the `click` event.
- Retaining `ignoreDrag` state machine: rejected because desktop `pointerdown` dismissal inherently prevents trailing mouse release clicks from triggering dismissal without any state tracking.
