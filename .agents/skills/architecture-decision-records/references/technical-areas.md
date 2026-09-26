# Technical areas in VFloat

VFloat groups Architecture Decision Records (ADRs) by technical area. Each group has its own folder under [`ADR/`](file:///c:/projects/VFloat/ADR).

## Existing groups

Group | What it covers | Common topics and keywords | Real example
:--- | :--- | :--- | :---
`architecture` | Core system structure, boundary rules, and environment safety | Dynamic `ownerDocument` and `ownerWindow` resolution, same-origin iframe isolation, realm-safe timers, `shallowRef` DOM references | [`ADR-architecture-0001`](file:///c:/projects/VFloat/ADR/architecture/0001-cross-realm-dom-and-iframe-environment-resolution.md)
`positioning` | Calculating coordinates and placing floating elements | Floating UI middleware pipelines (`offset`, `flip`, `shift`, `arrow`, `size`, `autoPlacement`), virtual reference elements, transform styles | Future positioning ADRs
`interactions` | Mouse, touch, and pointer events for floating elements | Outside click dismissal (`useDismiss`), hover corridors (`safePolygon`), pointer speed watchdogs, touch emulation | [`ADR-interactions-0004`](file:///c:/projects/VFloat/ADR/interactions/0004-scoped-pointer-events-shielding-and-watchdog-intent-model-for-hover-corridors.md)
`keyboard-navigation` | Moving focus and navigating with keys | Focus trapping (`useFocusTrap`), roving tabindex (`useRovingFocus`), `aria-activedescendant`, typeahead search | Future keyboard ADRs
`runtime` | Vue 3.5 reactivity conventions and SSR safety | `toValue()` unwrapping rules, `effectScope()` cleanup, hydration guards, server-side rendering fallbacks | See Vue 3.5 rules in [`AGENTS.md`](file:///c:/projects/VFloat/AGENTS.md)
`tooling` | Repository scripts, build tools, tests, and releases | Vitest Browser Mode, API Extractor, Oxlint and Oxfmt, changelog scripts | Future tooling ADRs

## How to choose a group

1. Pick an existing group from the table above whenever possible.
2. If your decision touches two areas (for example, a positioning middleware that reacts to pointer clicks), pick the area that drives the technical limitation.
3. Keep group names lowercase and hyphenated (kebab-case).

## When to add a new group

Add a new group folder only when:
- The decision does not fit into any existing area.
- You expect to add more than one ADR to this new area over time.
- The name uses only lowercase letters, numbers, and hyphens (like `virtual-scrolling`).

Do not create a new group for a single one-off feature, component, or PR.
