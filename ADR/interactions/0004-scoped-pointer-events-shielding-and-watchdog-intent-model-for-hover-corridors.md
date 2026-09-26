---
status: accepted
date: 2026-09-26
---

# Scoped pointer-events shielding and watchdog intent model for hover corridors

## Context

Safely traversing the gap between an anchor element and a floating panel (such as a dropdown or cascading submenu) requires keeping the panel open while the cursor travels through an invisible "safe polygon" corridor.

Previous safe polygon implementations (including upstream Floating UI and VFloat's initial version) suffered from three critical architectural flaws:

1. **Fixed Viewport Overlay Hazards**:
   When `blockPointerEvents` was enabled to prevent background hover triggers during traversal, an invisible overlay (`<div style="position: fixed; inset: 0">`) was appended to the DOM. This overlay competed for z-index and stacking context, frequently occluding floating panels or parent dialogs. In cascading submenus, multiple overlapping overlays collided, while covering the entire viewport blocked legitimate pointer interactions elsewhere on the page.
2. **Parked Cursor Trap in Velocity Detection**:
   Evaluating user intent via cursor velocity (`speed < 0.1 px/ms`) only executes when `pointermove` events fire. If a user moved their cursor into the corridor and parked it motionless, no further events were dispatched. The overlay remained indefinitely open, defeating intent detection.
3. **Submenu Desynchronization**:
   Moving the pointer across a parent menu toward a submenu could prematurely dismiss the parent unless corridor teardown accounted for open child nodes. Additionally, when a child submenu closed, the parent had no mechanism to auto-reconcile its hover state.

## Decision

1. **Scoped Ref-Counted `pointer-events` Shielding**:
   - Replace the fixed viewport DOM overlay with CSS `pointer-events` stylesheet shielding (`startShield()` / `releaseShield()`).
   - Temporarily apply `pointer-events: none` to the designated scope while restoring `pointer-events: auto` on both the reference element and the floating panel. This leaves paint order and stacking contexts completely untouched.
   - Coordinate nested menus via a module-level reference-counted registry (`shieldHolds: WeakMap<HTMLElement, { count: number; previous: string }>`). Overlapping corridors increment and decrement holds, restoring each element's original inline `pointer-events` style verbatim only when the last active corridor finishes.
   - Add a public `getScope` option to `SafePolygonOptions`, allowing consumers to narrow the shielded subtree (e.g., to a navigation bar or sidebar) rather than defaulting to `document.body`.
2. **Intent Watchdog Timer**:
   - Complement velocity detection with an active watchdog timer (`intentTimeout`, default 40ms).
   - Every `pointermove` inside the corridor resets the watchdog. If the cursor stalls motionless inside the corridor and emits no further events, the watchdog timer fires and closes the floating element.
   - Evaluate continuous slow movements against elapsed time and distance deltas (`elapsedTime * MIN_INTENT_SPEED`), immediately rejecting crawls below 0.1 px/ms without indefinitely rearming the watchdog.
3. **Submenu Hierarchy Preservation & Auto-Reconcile**:
   - Coordinate safe polygon closures with `FloatingNode.children`. If any child submenu is open (`closeIfNoOpenChild()`), corridor exit does not dismiss the parent.
   - Register a synchronous watcher on `hasOpenChild` in `useHover` to automatically reconcile parent hover state when child submenus close.
4. **Allocation-Free Rectangular Trough Containment**:
   - Optimize hit-testing in the direct gap between anchor and floating element using axis-aligned bounding box containment (`isInsideAxisAlignedRect`) instead of constructing a dynamic 4-point polygon and executing ray-casting math.

## Alternatives considered

- **Fixed Viewport Overlay (`<div style="position: fixed; inset: 0">`)**: rejected because it disrupts DOM stacking contexts, pollutes the document during transient hover interactions, and causes conflicts in nested submenus.
- **Pure Event-Driven Velocity Math**: rejected because stationary cursors emit no `pointermove` events, causing parked cursors to bypass intent timeout and hold menus open indefinitely.
- **Single-Owner Global Shield Flag**: rejected because the first submenu to close would prematurely unshield the container for surviving sibling or parent corridors, or permanently strand `pointer-events: none` on the scope.
