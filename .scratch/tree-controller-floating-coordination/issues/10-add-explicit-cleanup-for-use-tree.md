# Add explicit cleanup for useTree

Status: needs-triage

## Parent

`C:\projects\VFloat\.scratch\tree-controller-floating-coordination\PRD.md`

## What to build

Give `useTree` an explicit cleanup path for the watchers it creates, so the module can be torn down predictably outside of a normal component effect scope.

## Why this matters

`useTree` currently creates internal watchers for active-value reconciliation and branch-cache invalidation, but it does not return any cleanup handle. That is fine when the composable is used inside a standard Vue lifecycle, yet it makes the module awkward in stores, tests, and manually managed scopes. The module already treats cleanup as a first-class concern in nearby composables, so tree should match that pattern.

## Acceptance criteria

- [ ] `useTree` exposes a cleanup function or equivalent teardown handle.
- [ ] The internal watchers created by `useTree` stop cleanly when cleanup runs.
- [ ] Existing component-scoped usage still works without extra caller burden.
- [ ] The cleanup story is documented in the tree return type or inline source comments, whichever best fits the repo’s existing style.

## Suggested implementation shape

- Keep the current watchers, but register their stop handles in a local cleanup registry.
- Return the cleanup handle alongside the tree state and branch helpers.
- Keep `tryOnScopeDispose` compatibility so component-scoped callers still get automatic teardown.

## Blocked by

None - can start immediately.
