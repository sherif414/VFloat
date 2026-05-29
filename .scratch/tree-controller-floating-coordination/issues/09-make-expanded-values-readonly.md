# Make expanded values readonly

Status: needs-triage

## Parent

`C:\projects\VFloat\.scratch\tree-controller-floating-coordination\PRD.md`

## What to build

Stop exposing `expandedValues` as a writable `Ref<Set<string>>` and make the public tree interface readonly instead, so consumers cannot mutate the underlying `Set` in place and accidentally bypass Vue reactivity.

## Why this matters

`useTree` already treats expansion state as immutable internally: `expandBranch()`, `collapseBranch()`, and `collapseAll()` all replace the set rather than mutating it in place. But the public `expandedValues` ref still allows direct `.add()` / `.delete()` / `.clear()` calls, which can silently fail to trigger recomputation because the ref value itself does not change. Making the ref readonly matches the actual contract and prevents a subtle class of stale UI bugs.

## Acceptance criteria

- [ ] `expandedValues` is exposed as a readonly ref in the public tree return type.
- [ ] Consumers cannot mutate the expansion set in place through the public interface.
- [ ] Existing tree mutators continue to update expansion state reactively.
- [ ] Type coverage or tests demonstrate that expansion state must be changed through tree methods.

## Suggested implementation shape

- Change the public return type to expose `expandedValues` as readonly.
- Keep the internal `shallowRef<Set<string>>` implementation if that fits the current module shape.
- Consider whether `isExpanded()` and the branch mutators are sufficient for all intended callers, or whether a new setter should be added later.

## Blocked by

None - can start immediately.
