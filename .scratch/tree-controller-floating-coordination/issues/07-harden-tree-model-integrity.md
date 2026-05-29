# Harden tree model integrity

Status: needs-triage

## Parent

`C:\projects\VFloat\.scratch\tree-controller-floating-coordination\PRD.md`

## What to build

Make `TreeModel` detect and report structural integrity problems in the input tree, instead of silently accepting malformed data such as duplicate IDs or cyclic child references.

## Why this matters

The current model-building pass overwrites duplicate IDs without warning and recursively traverses child relationships without cycle protection. That means a malformed tree can silently corrupt lookups, produce unpredictable parent mappings, or blow up traversal at runtime. For a public tree primitive, those failures are too quiet.

## Acceptance criteria

- [ ] Duplicate item IDs are detected and reported clearly.
- [ ] Cyclic parent/child relationships do not recurse forever.
- [ ] Structural failures are surfaced in a way that helps consumers fix their input quickly.
- [ ] Valid trees continue to behave exactly as they do today.

## Suggested implementation shape

- Add dev-mode assertions or warnings for duplicate IDs.
- Track traversal ancestry during model construction to detect cycles.
- Decide whether malformed input should throw, warn, or fail closed, and keep that behavior consistent across the tree module.

## Blocked by

None - can start immediately.
