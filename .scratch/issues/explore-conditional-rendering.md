Status: needs-triage
Category: enhancement
Assignee: unassigned
Branch/worktree: not-started
Parent: None
Blocked by: None

# Explore: Recommend context.state.open.value vs. position.isPositioned.value for conditional rendering

## What to build

Investigate the visual layout shifts and rendering dynamics of VFloat when conditionally rendering the floating element. Specifically:

1. Evaluate using `context.state.open.value` (e.g., `<div v-if="context.state.open.value">`) which causes the element to render immediately upon opening, but before it is positioned (as positioning is asynchronous and occurs on the next frame). This can cause a 1-frame visual layout flash/jump to `(0, 0)`.
2. Evaluate using `position.isPositioned.value` for conditional rendering. If `v-if="position.isPositioned.value"` is used, the floating element never renders because `floatingEl` ref is `null`, preventing positioning calculations from starting in the first place (a chicken-and-egg problem).
3. Determine a standard recommendation/best practice (such as rendering using `v-if="context.state.open.value"` but visually hiding the element via style/opacity/visibility until `position.isPositioned.value` is true).
4. Update the codebase documentation/guides (like [docs/guide/first-tooltip.md](file:///c:/projects/VFloat/docs/guide/first-tooltip.md)) or provide utility CSS helper guidelines.

## Acceptance criteria

- [ ] Investigate the rendering behavior and layout shift of VFloat floating elements during initial mount/opening.
- [ ] Document the chicken-and-egg behavior of using `v-if="position.isPositioned.value"`.
- [ ] Outline the recommended design pattern to prevent visual flashes (e.g., using `v-if="context.state.open.value"` combined with style hiding until `position.isPositioned.value` is true).
- [ ] Decide if VFloat should expose a helper/utility style object, or if documenting the `visibility` pattern is sufficient.
- [ ] Propose documentation edits to the VFloat guide.

## Agent Brief

**Summary:** Explore rendering recommendation (context.state.open vs position.isPositioned).

**Current behavior:**
The user guide example in `docs/guide/first-tooltip.md` uses:

```vue
<div v-if="context.state.open.value" ref="floatingEl" role="tooltip" :style="styles">
```

Which might lead to a 1-frame layout shift/flash at `(0, 0)` before positioning is completed.

**Desired behavior:**
A clear decision on the recommended pattern, documented in the user guide, addressing any layout flashes.

**Key interfaces:**

- `FloatingContext` (`state.open`)
- `FloatingPosition` (`isPositioned`)

**Validation expectations:**

- Analyze the code and run the dev server (`vp dev`) to observe layout shifts with tooltips or popovers under normal network/render cycles.

**Out of scope:**

- Major API rewrites. The goal is exploration and documentation recommendation.

## Work Log

- Not started.

## Validation Log

- Not run.

## Review Notes

- Not reviewed.

## Comments
