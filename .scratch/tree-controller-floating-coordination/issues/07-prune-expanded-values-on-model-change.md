# Prune expanded values on model change

Status: needs-triage

## Parent

`C:\projects\VFloat\.scratch\tree-controller-floating-coordination\PRD.md`

## What to build

Reconcile `expandedValues` against the current tree model whenever the `items` input changes, so stale expanded branch IDs are removed while still preserving expansion state for branches that remain valid in the new model.

## Why this matters

`expandedValues` currently behaves like model-shape state, but it is only partially reconciled when the tree model changes. Active values are cleared when they disappear, yet expanded branch IDs can remain in the set even after the corresponding branch no longer exists. That leaves stale state behind, can cause unexpected reopen behavior if an ID returns later, and makes the tree harder to reason about after item refreshes.

## Acceptance criteria

- [ ] When the tree model changes, `expandedValues` drops IDs that are no longer present as expandable branches in the new model.
- [ ] Valid expanded branch IDs are preserved across harmless data refreshes.
- [ ] Reconciling expansion state does not clear unrelated active state unless the existing active-value rules already require it.
- [ ] Existing branch navigation behavior remains unchanged for stable models.

## Suggested implementation shape

- Add a model-change reconciliation step in `useTree`.
- Prune `expandedValues` by intersecting it with the new model's branch-parent set.
- Keep the root branch reference stable while still allowing child-branch cache invalidation as needed.

## Blocked by

None - can start immediately.
