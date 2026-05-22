# Thin node contract and explicit linking

Status: wontfix

## Parent

`C:\projects\VFloat\.scratch\tree-controller-floating-coordination\PRD.md`

## What to build

Refactor node registration so nodes are structural wrappers around explicit tree topology and lifecycle registration only. Remove node-owned policy flags and policy decision logic, and enforce explicit parent/tree linkage semantics in the public node contract.

## Acceptance criteria

- [ ] Node behavior is limited to explicit linkage, lifecycle registration, structural state, and thin action forwarding.
- [ ] Node-level policy flags and node-owned policy decision paths are removed.
- [ ] Missing or invalid topology produces deterministic behavior aligned with explicit-linking expectations.

## Blocked by

- `01-tree-controller-core-and-reason-propagation.md`
