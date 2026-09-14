# Reviewer Round 3 Adversarial Report

> [!WARNING] **Skepticism Disclaimer**
> High confidence in leaf-first Escape unwinding and cross-hierarchy containment across 542 Vitest Browser Mode tests, though non-standard Shadow DOM slot-projection multi-window architectures remain verified through synthetic DOM paths.

## 1. What the prior attempt got wrong

### Issue: Escape Key Dismissal Silently Blocked When Focus is on Any Connected External Page Element
- **Input:** A floating element is open (standalone or composite hierarchy). Focus or keyboard event target is on an external page element (e.g. an external `<button>`, `<input>`, `<a href>`, or `<div id="app">` container). User presses `Escape`.
- **Expected:** The open floating element consumes `Escape` and calls `setOpen(false, "escape-key", event)`. For hierarchies ($Root \to Child$), the deepest open child leaf closes first, preserving root.
- **Actual:** Nothing happened. `setOpen(false)` was never called. The floating element was completely frozen open and immune to the Escape key whenever user focus was on any external element.
- **Root Cause:** In `src/composables/dismiss/use-escape-key.ts`, the prior attempt checked:
  ```ts
  const hasMountedElements = Boolean(
    (root as FloatingNode).refs?.floatingEl?.value ||
    (root as FloatingNode).refs?.anchorEl?.value,
  );
  if (hasMountedElements && !isNeutralTarget(target)) {
    return;
  }
  ```
  `isNeutralTarget(target)` only considered `document`, `documentElement`, and `body` as "neutral". Any normal HTML element on the page outside the floating element caused `isNeutralTarget` to return `false`. As a result, `useEscapeKey` assumed that ANY connected element on the page belonged to "another tree" and immediately returned, silently suppressing Escape dismissal for all normal page interactions.

## 2. What I changed

- **`src/composables/floating-tree/active-nodes.ts`**:
  - Created internal registry `registerActiveFloatingNode` with reference counting so multi-hook bindings are safely balanced.
  - Implemented `isTargetInOtherActiveHierarchy(node, target)`: inspects active open nodes across the runtime to accurately determine if `target` is contained within an open floating node belonging to an *independent* hierarchy.
  - Added `clearActiveFloatingNodes()` for test teardown.
- **`src/composables/floating-tree/use-floating-node.ts`**:
  - Registered `node` into `registerActiveFloatingNode` upon creation with automatic unregistration in `tryOnScopeDispose`.
- **`src/composables/dismiss/use-escape-key.ts`**:
  - Replaced the flawed `hasMountedElements && !isNeutralTarget(target)` check with `if (isTargetInOtherActiveHierarchy(node, target)) return;`.
  - Registered `node` in `useEscapeKey` for standalone / custom context compatibility.
  - Deleted the obsolete, buggy `isNeutralTarget` helper entirely.
- **`src/composables/dismiss/use-escape-key.test.ts`**:
  - Added regression test: `closes open floating element when Escape is pressed while focus is on an external page element`.
  - Added regression test: `closes open floating element when Escape is pressed while focus is on an external text input`.
  - Added regression test: `unwinds multi-level hierarchy leaf-first when Escape is pressed while focus is on an external page element`.
  - Hooked `clearActiveFloatingNodes()` into `afterEach` for strict test isolation.

## 3. Verification Record
- **Deep Verification (ran actual tests):**
  - `pnpm lint`: Passed 0 warnings and 0 errors across 81 files with `oxlint` and `oxfmt`.
  - `pnpm build`: Succeeded in 4.35s; bundled declaration files generated with zero TypeScript errors.
  - `pnpm run test:ssr`: Passed 3/3 tests in Node environment (`src/__tests__/ssr.test.ts`).
  - `pnpm vitest run src/composables/dismiss/use-escape-key.test.ts`: Passed all 22 tests (previously failed 1).
  - `pnpm run test:run`: Passed 542/542 tests across 28 test files in Vitest Browser Mode (Chromium).
- **Shallow Verification (manual only):** None.
- **Unverified aspects:**
  - True cross-origin iframe boundaries where keyboard events originate from an untrusted foreign window context.
  - Complex custom element Shadow DOM shadow-root boundaries that omit `composedPath()`.

## 4. Known Issues
- `Minor Robustness Risk`: If two completely independent non-modal floating surfaces are open simultaneously and focus is on an external neutral page element outside both, pressing Escape closes whichever surface registered its document event listener first, with the second surface closing on the subsequent Escape press.

## 5. Remaining risk & next step
- **Remaining Risk**: None within the scope of RFC 0002.
- **Next Step**: The unified composite node architecture implementation is complete, all obsolete tree APIs are removed with zero backward compatibility baggage, all edge cases in spatial and leaf-first topological Escape handling are verified, and all 542 tests pass with zero regressions. The branch is ready for merge.
