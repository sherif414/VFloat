Status: ready-for-human

## Problem Statement

VFloat currently treats the core floating context and the positioning engine as the same public entrypoint. A developer who wants shared refs, open state, open-change reasons, click behavior, focus behavior, roles, Escape handling, or list navigation must instantiate the same composable that also owns coordinate computation, middleware, positioning styles, and automatic layout updates.

That coupling makes the mental model heavier than it needs to be. Static surfaces such as dialogs, sheets, centered modals, command palettes, and CSS-positioned panels still need VFloat's interaction state and accessibility helpers, but they do not necessarily need JavaScript positioning. It also makes future positioning strategies harder to support because native CSS anchoring, static layout, virtual anchors, and JavaScript geometry all have to pass through the same root abstraction.

The current API shape makes positioning feel like the core product, while the more durable primitive is the shared floating context: refs, open state, reasoned state changes, and the identity object that behavior composables cooperate through.

## Solution

Split the public architecture so the floating context owner and the positioning engine are separate composables.

The working name for the context owner is `useFloatingContext`. This composable owns the floating context itself: element refs, open state, state mutation, open-change reasons, and the shared context identity that companion composables consume.

The working name for the geometry engine is `usePosition`. This composable accepts the floating context as its first argument, just like other companion composables. It owns only positioning behavior: coordinate computation, placement, strategy, middleware, styles, auto-update wiring, and manual position updates.

After the refactor, positioning becomes one optional behavior composable among peers. Developers can use click, hover, focus, role, Escape, focus trap, and list navigation behavior without paying for geometry. Developers who need JavaScript positioning opt into `usePosition`. Developers who use CSS layout, native CSS Anchor Positioning, or static placement can omit it entirely.

This is a major refactor and may break public API where the break makes the resulting model clearer. The old monolithic `useFloating(anchorEl, floatingEl, options)` entrypoint should be removed rather than preserved as a compatibility wrapper. The final naming remains open, but the responsibility boundary is settled: state ownership belongs to the context owner, and positioning belongs to the positioning composable.

## User Stories

1. As a VFloat user, I want to create a shared floating context without enabling positioning, so that I can use VFloat interactions for statically placed surfaces.
2. As a VFloat user, I want the context owner to manage anchor, floating, and arrow refs, so that every behavior composable can coordinate through one object.
3. As a VFloat user, I want the context owner to manage open state, so that visibility lifecycle has a single source of truth.
4. As a VFloat user, I want open changes to preserve reasons and source events, so that I can distinguish clicks, keyboard activation, hover, Escape, and programmatic changes.
5. As a VFloat user, I want positioning to be an opt-in composable, so that JavaScript geometry is only active when I explicitly ask for it.
6. As a VFloat user, I want the positioning composable to accept the shared context as its first argument, so that it feels consistent with click, hover, role, focus, and Escape composables.
7. As a VFloat user, I want `usePosition` to return coordinates, placement, strategy, middleware data, styles, and update controls, so that templates and advanced integrations can consume geometry directly.
8. As a VFloat user, I want `usePosition` to accept an enabled signal, so that position updates and auto-update listeners can follow my own lifecycle policy.
9. As a VFloat user, I want `usePosition` to avoid owning or mutating open state, so that geometry does not decide whether my surface is visible.
10. As a VFloat user building a modal, I want to use state, role, Escape, and focus trap without positioning, so that the modal can remain controlled by normal CSS layout.
11. As a VFloat user building a sheet or drawer, I want to use context and dismissal behavior without coordinate computation, so that fixed or grid-based layouts stay lightweight.
12. As a VFloat user building a tooltip or menu, I want to opt into positioning when I need anchor-relative placement, so that dynamic floating surfaces still have collision-aware geometry.
13. As a VFloat user exploring CSS Anchor Positioning, I want VFloat's state and interaction helpers to work without the JavaScript positioning engine, so that native layout features can be adopted gradually.
14. As a VFloat user, I want interaction composables to depend on the narrowest context they need, so that they do not imply positioning unless they actually require geometry.
15. As a VFloat user, I want `useClick` to work with the context owner only, so that click-triggered static surfaces are first-class.
16. As a VFloat user, I want `useFocus` to work with the context owner only, so that focus-triggered static surfaces are first-class.
17. As a VFloat user, I want `useEscapeKey` to work with the context owner only, so that dismissal behavior is independent from layout.
18. As a VFloat user, I want `useFocusTrap` to work with the context owner only, so that dialog-style surfaces can be built without positioning.
19. As a VFloat user, I want `useRole` to work with the context owner only, so that semantic attributes are independent from geometry.
20. As a VFloat user, I want `useListNavigation` to work with the context owner where possible, so that keyboard navigation does not require coordinate computation.
21. As a VFloat user, I want hover behavior to remain useful without positioning, so that hover-triggered static or CSS-positioned content still works.
22. As a VFloat user, I want geometry-sensitive hover features to declare their geometry dependency clearly, so that safe-polygon behavior does not hide an implicit positioning requirement.
23. As a VFloat user, I want arrow behavior to attach to positioning rather than open state, so that arrows remain tied to middleware data and placement.
24. As a VFloat user, I want pointer-based virtual anchor helpers to be compatible with the new split, so that they can update refs and optionally request a position update without owning open state.
25. As a VFloat user, I want migration guidance from the old monolithic entrypoint to the new context-plus-position model, so that breaking changes are easy to apply.
26. As a VFloat maintainer, I want the context owner tested independently from positioning, so that open-state behavior is reliable and easy to reason about.
27. As a VFloat maintainer, I want the positioning engine tested independently from interactions, so that geometry behavior can evolve without destabilizing state lifecycle.
28. As a VFloat maintainer, I want the public API to communicate responsibility boundaries through names and function signatures, so that consumers do not infer hidden behavior.
29. As a VFloat maintainer, I want the architecture to support future positioning strategies, so that JavaScript positioning, native CSS anchoring, and static layout can coexist.
30. As a VFloat maintainer, I want the refactor to remove positioning from the role of "core composable", so that future behavior composables all attach to the same context model.

## Implementation Decisions

- Treat this as a public API refactor. Backwards compatibility is not required where it would preserve the wrong mental model.
- Introduce a dedicated floating context owner. Working name: `useFloatingContext`.
- The context owner owns element refs, open state, state mutation, open-change reason forwarding, event forwarding, and context identity.
- The context owner does not compute coordinates, generate styles, run middleware, register auto-update listeners, or expose placement as state it owns.
- Introduce a dedicated positioning composable. Working name: `usePosition`.
- `usePosition` accepts the floating context as its first argument, matching the companion-composable pattern used throughout VFloat.
- `usePosition` owns coordinate computation, preferred and resolved placement, strategy, middleware data, generated positioning styles, manual updates, middleware registration, and auto-update wiring.
- `usePosition` may accept an enabled option that gates computation and auto-update listeners, but enabled is not open state ownership.
- The context owner remains the only module that creates or owns open state.
- Interaction composables should accept the narrowest context shape they require.
- Click, focus, focus trap, Escape key, role, and most list navigation behavior should depend on context refs and state, not positioning.
- Hover behavior should keep basic hover state context-only. Geometry-sensitive safe-polygon behavior should receive placement or position data explicitly rather than requiring the entire context to own positioning.
- Arrow behavior should depend on positioning output and middleware registration, not on state ownership.
- Pointer or virtual-anchor helpers should mutate context refs and optionally request position updates when a positioning result is present. They should not create or own open state.
- Existing context vocabulary should continue to use grouped `refs`, `state`, and positioning return data rather than flattening fields onto the root.
- The old monolithic `useFloating(anchorEl, floatingEl, options)` entrypoint should be removed. Do not preserve a compatibility wrapper for this refactor.
- Documentation should present the context owner first, then show positioning as one optional behavior composable among others.
- Examples should include at least one geometry-less surface and one positioned surface to make the split obvious.
- Final public names are still open before implementation, but the PRD uses `useFloatingContext` and `usePosition` as working names.

## Testing Decisions

- Tests should assert externally visible behavior rather than implementation details such as watcher structure or private helper calls.
- Add context-owner tests that verify default open state, controlled open state, ref ownership, `setOpen`, reason fallback, event forwarding, and no-op behavior when setting the current state.
- Add tests proving the context owner does not instantiate positioning side effects.
- Add positioning tests that verify coordinate computation, styles, middleware data, manual update, option reactivity, and auto-update cleanup when enabled.
- Add tests proving `usePosition` does not create, own, or mutate open state.
- Add integration tests showing click, role, focus trap, and Escape behavior working with a geometry-less context.
- Add integration tests showing a positioned tooltip or menu composed from context owner plus positioning.
- Add migration-oriented tests for key public examples that previously used the monolithic root.
- Add hover-specific tests once the safe-polygon geometry dependency is finalized.
- Add arrow-specific tests showing arrow middleware and styles attach through positioning, not through open-state ownership.
- Use existing composable tests as prior art for behavior assertions and focused module-level coverage.

## Out of Scope

- Finalizing project rebrand terminology beyond the working names needed for this PRD.
- Implementing native CSS Anchor Positioning helpers directly.
- Changing visual styling or adding UI components.
- Reworking collection/list-navigation architecture beyond the context dependency changes required by this split.
- Adding a full compatibility layer unless maintainers explicitly choose one during implementation planning.
- Rewriting all documentation unrelated to the affected context, positioning, and interaction examples.

## Further Notes

This refactor intentionally changes the center of VFloat's public model. The durable primitive is the floating context, not the positioning engine. Positioning should become one task-specific composable beside click, hover, role, focus, Escape, focus trap, list navigation, and future behavior modules.

The architectural success condition is that a developer can build a fully interactive static dialog without invoking positioning, and a developer can build a positioned tooltip by adding positioning to the same context object.
