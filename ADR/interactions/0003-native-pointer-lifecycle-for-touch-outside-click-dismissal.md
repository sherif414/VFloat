---
status: accepted
date: 2026-09-25
---

# Native pointer lifecycle for touch outside click dismissal

## Context

ADR 0002 adopted a touch-on-click model for `useOutsideClick`: desktop mouse dismissals occurred eagerly on `pointerdown`, while touch dismissals were skipped on `pointerdown` and deferred to the browser's subsequent `click` event to prevent premature closure during scrolling.

This created a critical architectural failure on iOS devices. WebKit by design suppresses synthetic `click` events on non-interactive elements (such as plain `<div>` containers, `<body>`, or blank background whitespace) unless the element is natively clickable (`<a>`, `<button>`) or has an explicit click handler attached directly to it. When an iOS user tapped background whitespace to dismiss an overlay:
1. `pointerdown` intentionally ignored touch input.
2. WebKit never dispatched the trailing `click` event.
3. The overlay remained permanently stuck open.

## Decision

1. Supersede the touch-on-click model from ADR 0002 with a native W3C Pointer Events lifecycle model in `useOutsideClick`:
   - **Desktop Mouse & Pen**: Handled eagerly on `pointerdown` ($t=0$), preserving instant desktop responsiveness.
   - **Touchscreens**:
     - On `pointerdown`, if `event.pointerType === "touch"`, record the active `pointerId` and whether the touch initiated outside the floating family (`isTouchDownOutside`). Do not dismiss yet.
     - On `pointerup`, if the matching touch pointer releases outside, dismiss immediately. Unlike synthetic `click`, `pointerup` is a standard hardware event dispatched by WebKit on all elements regardless of clickability.
     - On `pointercancel`, when the browser hijacks the touch stream for native scrolling, panning, or zooming, clear the tracked pointer state. The overlay remains open without interrupting scrolling.
   - **Keyboard & Assistive Technology**: On `click`, accept virtual activations (`event.detail === 0`). Trailing physical clicks (`event.detail > 0`) are ignored, preventing duplicate callback invocations after `pointerup` or `pointerdown`.
   - **Drag-Out Protection**: Dragging from inside the overlay to outside does not trigger dismissal because `isTouchDownOutside` was `false` at initial touch down.

## Alternatives considered

- **CSS `cursor: pointer` on `document.body`**: rejected because it alters desktop cursor appearance, triggers iOS tap highlight boxes across non-interactive containers, and mutates global DOM styles.
- **Euclidean distance tracking on `pointermove`**: rejected as over-engineering; the browser's native `pointercancel` event already reliably signals when a touch interaction becomes a scroll.
- **Transparent backdrop element**: rejected because it requires rendering extra DOM nodes, managing z-index stacking, and blocks page interactions for un-modal popovers and tooltips.
