# Adversarial Review Report: Unified Composite Node Architecture (RFC 0002)

> [!WARNING] **Skepticism Disclaimer**
> High confidence in spatial and topological node mechanics across all 535 Vitest browser tests, but cross-realm/iframe composite hierarchies and rapid asynchronous suspense streaming still rely on standard synchronous DOM dispatch.

## 1. What the prior attempt got wrong

### Issue 1: Independent Tree Escape Event Hijacking
- **Input:** Two independent, open composite floating trees rendered on the same page (Tree 1 and Tree 2). Focus/target is inside an element in Tree 2. User presses Escape.
- **Expected:** Tree 2's open leaf consumes Escape and closes; Tree 1 ignores the event and remains open.
- **Actual:** Tree 1's leaf consumed Escape, called stopImmediatePropagation(), and closed. Tree 2 never received the event and remained open.
- **Root Cause:** use-escape-key.ts attached global document listeners in registration order. Because Tree 1 was registered first and was not aware of the target's owner tree, its fallback root.getDeepestOpenDescendant() matched Tree 1's own leaf and closed it, despite the event originating inside Tree 2.

### Issue 2: Inactive Sibling Branch Starvation & Mismatched Escape Dismissal
- **Input:** An asymmetric tree with multiple open sibling branches (root has branchA and branchB, both open). Focus is on an item inside branchB. User presses Escape.
- **Expected:** branchB (the focused branch) closes; branchA remains open.
- **Actual:** branchA closed and branchB stayed open, or vice versa depending strictly on Set insertion order.
- **Root Cause:** use-escape-key.ts ignored event.target spatial containment entirely, relying solely on topological root.getDeepestOpenDescendant(). In use-floating-node.ts, traverse used depth > maxDepth, which permanently froze deepest to the first inserted child when depths were equal.

### Issue 3: Collection Mutation Hazard During Cascade Teardown
- **Input:** node.closeDescendants() invoked when child nodes trigger reactive watchers or unmount handlers that call parent.removeChild(child).
- **Expected:** Safe completion of descendant closure without throwing or skipping elements.
- **Actual:** Direct for..of traversal over mutable childrenRef.value Set references risked iteration anomalies during cascading unlinks.
- **Root Cause:** Traversal did not create static snapshot arrays (Array.from(childrenRef.value)).

### Issue 4: Incomplete UseDismissContext Contract
- **Input:** A consumer passes an object typed as UseDismissContext to useDismiss().
- **Expected:** node can be safely passed to useEscapeKey(node) with full hierarchy query capability.
- **Actual:** UseDismissContext did not include parent or getDeepestOpenDescendant, leading to type asymmetry and runtime fallback to shallow children checks.
- **Root Cause:** Incomplete interface picking in src/composables/dismiss/use-dismiss.ts.

### Issue 5: Non-Standard Section Banner in use-floating-node.ts
- **Input:** Running pnpm lint and adhering to vfloat-file-structure.
- **Expected:** Only approved section banners (📌 Main, 📌 Helpers, 📌 Types).
- **Actual:** Contained a non-standard // 📌 Internals banner around floatingInternals.
- **Root Cause:** Deviated from vfloat-file-structure section banner rules.

### Issue 6: Fragile Fallback in useHover
- **Input:** Pointer leaves towards a virtual anchor with contextElement or Shadow DOM target when node.contains is not a function.
- **Expected:** Traversal respects Shadow DOM boundaries and virtual elements via isTargetWithinElements.
- **Actual:** Manual anchor instanceof Node && anchor.contains(target) failed for virtual elements and Web Components.
- **Root Cause:** Did not use standard isTargetWithinElements fallback in use-hover.ts.

---

## 2. What I changed

- **src/composables/dismiss/use-escape-key.ts**:
  - Implemented target-aware leaf-first resolution: checks if target is within root.contains(target). If so, inactive sibling branches bail immediately; the node containing the target passes through to open child leaves or consumes if it is the leaf.
  - Added isNeutralTarget helper: if target is a connected element outside root (e.g. inside an independent tree), the node refuses to steal the escape key.
  - Extended UseEscapeKeyContext with contains?: (target: EventTarget | null) => boolean.
- **src/composables/dismiss/use-dismiss.ts**:
  - Added parent and getDeepestOpenDescendant to UseDismissContext to match the composite node requirements.
- **src/composables/floating-tree/use-floating-node.ts**:
  - Relocated floatingInternals to top-level module constants before 📌 Main, removing the non-standard // 📌 Internals section banner.
  - Protected contains, getDeepestOpenDescendant, getFloatingElements, and closeDescendants against set mutation hazards using Array.from snapshots.
  - Changed depth > maxDepth to depth >= maxDepth in getDeepestOpenDescendant to resolve the latest active sibling leaf at equal depths.
- **src/composables/hover/use-hover.ts**:
  - Updated isWithinFamily to use isTargetWithinElements(anchorEl.value, floatingEl.value, target) for consistent Shadow DOM, focus-guard, and virtual-anchor support.
- **src/composables/dismiss/use-escape-key.test.ts**:
  - Added regression test for focused sibling branch isolation (branchB closes while branchA remains open).
  - Added regression test for independent multi-tree isolation (Tree 2 closes while Tree 1 remains open).
- **src/composables/floating-tree/use-floating-node.test.ts**:
  - Added regression test for equal-depth sibling leaf resolution.
  - Added regression test for closeDescendants() unlinking during child setOpen invocation.

---

## 3. Verification Record

- **Deep Verification (ran actual tests):**
  - pnpm lint: Passed 0 warnings and 0 errors across 80 files with oxlint and oxfmt.
  - pnpm run test:ssr: Passed 3/3 SSR tests in Node environment.
  - pnpm build: Succeeded in 4.42s; generated all bundled .d.ts declaration files.
  - pnpm run test:run: Passed 535/535 tests across 28 test files in Vitest Browser Mode (Playwright / Chromium).
- **Shallow Verification (manual only):** None.
- **Unverified aspects:**
  - True cross-origin iframe composite node containment where events cross window boundaries.
  - Concurrent Suspense streaming hydration where parent and child nodes hydrate across asynchronous intervals.

---

## 4. Known Issues

- Minor Robustness Risk: In rare cases where two non-modal floating surfaces are open simultaneously and focus is on document.body, pressing Escape closes the deepest descendant of whichever tree registered its listener first.

---

## 5. Remaining risk & next step

- **Remaining Risk**: Edge case interactions when using custom ignoreEscapeKey filters alongside controlled reactive v-model:open state overrides.
- **Next Step**: The unified composite node architecture (RFC 0002) is complete, all obsolete tree classes and types have been cleanly removed, and all 535 tests pass with zero regressions. The branch is ready for merge.
