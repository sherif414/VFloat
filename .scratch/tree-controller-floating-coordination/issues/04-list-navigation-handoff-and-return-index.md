# List navigation handoff and return-index behavior

Status: ready-for-human

## Parent

`C:\projects\VFloat\.scratch\tree-controller-floating-coordination\PRD.md`

## What to build

Keep submenu keyboard handoff behavior robust while preserving the decision that list-navigation handoff metadata remains private to interaction bridging rather than becoming tree-core API.

## Acceptance criteria

- [ ] Arrow-forward opens child branches and hands off focus/navigation as expected.
- [ ] Arrow-back and Escape return navigation to the correct opener item in parent lists.
- [ ] Handoff metadata remains private to interaction bridges and does not leak into tree-core public contracts.

## Blocked by

- `03-interaction-adapter-alignment.md`
