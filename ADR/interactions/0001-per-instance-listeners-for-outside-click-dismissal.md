---
status: accepted
date: 2026-09-24
---

# Per-instance listeners for outside-click dismissal

## Context

`useOutsideClick` previously maintained a complex centralized listener multiplexing system (`syncEventListeners`) with dynamic string-key diffing (`Map<"${event}:${phase}", Record>`) and candidate sorting across all registered floating nodes. This abstraction aimed to share a single document listener per event phase and coordinate dismissal order.

However, in realistic web applications, registering 1 versus 3 listeners on `document` has zero perceptible performance impact. Furthermore, the universal UX expectation for outside clicks on a page background is "clean slate" intent cancellation—all unrelated transient floating elements and cascading menu levels should close simultaneously. A heavy centralized stack manager is unnecessary for outside clicks, whereas keyboard interactions (`useEscapeKey`) are inherently LIFO undo stacks.

## Decision

1. Implement `useOutsideClick` using per-instance document listeners attached and detached directly within the active `open` state lifecycle (`watch([enabled, node.open, ownerDoc])` with `onWatcherCleanup`).
2. Attach listeners directly to the resolved `ownerDocument` of the floating node.
3. Remove the speculative `leafFirst` option from `useOutsideClick`. Anchored floating elements (menus, popovers, tooltips) expect clean-slate dismissal on background clicks. Step-by-step unwinding on pointer clicks is an anti-pattern for floating UI (unlike keyboard Escape, which is handled step-by-step by `useEscapeKey`). Removing `leafFirst` eliminates unnecessary event-stamping machinery (`WeakMap<Event, ...>`) and listener race conditions.
4. Maintain `window.blur` detection per instance to close open floating overlays when focus moves into an external `<iframe>`.
5. Keep `useEscapeKey` as a separate, lightweight LIFO stack, recognizing the asymmetric UX requirement between pointer outside clicks (clean slate dismissal) and keyboard Escape (step-by-step undo).

## Alternatives considered

- Centralized listener multiplexer with string-key diffing: rejected due to high code complexity (~450 lines) and maintenance overhead without measurable performance benefit.
- Global LIFO stack for outside clicks: rejected because clicking the page background outside multiple overlays must dismiss all of them rather than requiring multiple successive clicks.
- `leafFirst` step-by-step pointer unwinding: rejected because anchored floating elements are not drawers or sheets; clicking outside a menu tree must dismiss the entire tree in one shot.
