---
name: vfloat-test-standards
description: Enforce test isolation, lifecycle cleanup (DOM/effectScope/timers), minimal test file layout, and Vitest browser mode testing standards across all VFloat unit and composable tests. Use this when writing new tests, refactoring test suites, debugging test flakiness or DOM leaks, or performing test code reviews.
---

# VFloat Test Standards

This skill defines the testing standards for the VFloat codebase. All VFloat tests run natively in **Vitest Browser Mode** (Playwright / Chromium). Tests must prioritize strict isolation, zero DOM/reactivity leakage, minimal file structure, and high-fidelity interaction modeling.

## When to Use This Skill

- When writing new unit or composable tests (`*.test.ts`).
- When refactoring existing test suites or adding regression tests.
- When diagnosing flaky tests, unclosed watchers, or DOM leaks between tests.
- When reviewing test PRs or performing test code audits.

---

## 1. Test Isolation & Teardown Protocol

Every test suite must guarantee that no DOM elements, Vue reactive effects, timers, or event listeners leak across tests. Follow the four golden rules of test isolation:

### Rule 1: Track and Tear Down Every DOM Element

All DOM elements appended during tests must be registered with a tracking helper and removed in reverse order during `afterEach()`.

```typescript
const trackedElements: HTMLElement[] = [];

function trackElement<T extends HTMLElement>(el: T): T {
  trackedElements.push(el);
  return el;
}

function clearTrackedElements() {
  for (const el of [...trackedElements].reverse()) {
    if (el.isConnected) {
      el.remove();
    }
  }
  trackedElements.length = 0;
}
```

### Rule 2: Explicitly Dispose Vue `effectScope`

Composables attach reactive watchers, `watchPostEffect`, and document event listeners. Wrap composable instantiation in an `effectScope()` and stop it in `afterEach()`.

```typescript
let scope: ReturnType<typeof effectScope>;

afterEach(() => {
  scope?.stop();
  clearTrackedElements();
  vi.clearAllMocks();
  vi.useRealTimers();
});
```

### Rule 3: Restore Timers & Reset Mocks

Always reset mocks with `vi.clearAllMocks()` and restore fake timers with `vi.useRealTimers()` in `afterEach()`. If a test uses `vi.useFakeTimers()`, ensure timers are flushed or restored before teardown.

### Rule 4: Zero Cross-Test State Leakage

Never share mutable state (e.g., modified DOM elements, shared refs, unresolved promises) across `it()` blocks. Each test must construct its own fresh state or rely on fresh setup in `beforeEach()`.

---

## 2. Minimal Test File Layout

Test files should be clean, lightweight, and easy to scan without heavy decorative banner comments. Follow this standard sequence:

1. **Imports**:
   - Third-party test utilities (`vitest`, `@vitest/browser/context`).
   - Vue reactivity APIs (`ref`, `computed`, `effectScope`, `nextTick`).
   - Internal composables and types (`@/composables/...`).
2. **Helpers & Fixtures**:
   - DOM element tracking helper (`trackElement`, `clearTrackedElements`).
   - Context factory / helper functions (e.g., `createElements()`, `setupContext()`).
3. **Lifecycle Hooks**:
   - `beforeEach()` to set up fresh fixtures.
   - `afterEach()` for guaranteed cleanup (`scope?.stop()`, `clearTrackedElements()`, `vi.clearAllMocks()`, `vi.useRealTimers()`).
4. **`describe` Suites**:
   - Top-level `describe("useX", () => { ... })`.
   - Nested `describe("feature or behavior", () => { ... })` grouping related assertions.

---

## 3. Vitest Browser Mode: Interaction Guidelines

In Vitest Browser Mode, choose the most effective tool for each layer of testing:

| Strategy                                      | When to Use                                                                                                                            | Example                                                                                                   |
| :-------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------- |
| **`userEvent`** (`@vitest/browser/context`)   | End-to-end user gestures where real browser focus, sequential event bubbling, or keyboard handling is tested.                          | `await userEvent.click(anchorEl);`<br>`await userEvent.keyboard("{Escape}");`<br>`await userEvent.tab();` |
| **Synthetic DOM Events** (`dispatchEvent`)    | Coordinate-level geometry tests, mouse speed calculations, safe-polygon raycasting, or specific `pointerType` values (`touch`, `pen`). | `anchorEl.dispatchEvent(new PointerEvent("pointerenter", { clientX: 10, clientY: 20 }));`                 |
| **Direct Vue Reactivity** (`ref.value = ...`) | Dynamic option changes, prop updates, and testing reactive state synchronization.                                                      | `openRef.value = true;`<br>`await nextTick();`                                                            |

---

## 4. Naming & Assertion Conventions

- **Test File Naming**: Match the source file name with `.test.ts` (e.g. `use-click.test.ts` for `use-click.ts`).
- **Element Variables**: Suffix all DOM element references with `El` (e.g., `anchorEl`, `floatingEl`, `arrowEl`, `outsideEl`).
- **Test Descriptions**: Write `it()` descriptions in the active present tense describing observable behavior (e.g., `it("toggles open state on click")`, `it("closes when escape is pressed")`).
- **Open-Change Reasons**: Always assert specific kebab-case reason strings when testing `setOpen` (e.g. `"outside-pointer"`, `"anchor-click"`, `"escape-key"`, `"hover"`).
- **Exact Argument Assertions**: Verify exact argument signatures rather than loose truthy checks:
  ```typescript
  expect(setOpenMock).toHaveBeenCalledWith(false, "outside-pointer", expect.any(Event));
  ```
- **Abbreviation Rules**: Use only accepted project abbreviations (`el`, `idx`, `ref`, `fn`, `e`, `dx`, `dy`, `id`).

---

## 5. Coverage & Regression Testing Strategy

1. **Public API & Core Behavior First**: Test the primary interface contracts, default option values, and expected DOM/state side effects.
2. **Detailed Call-Order & Arguments**: Assert specific event sequences, call counts, and reason arguments to prevent regressions in downstream consumers.
3. **Regression Tests**: Whenever fixing a bug or handling an edge case, add a dedicated unit test. Include a concise code comment explaining _why_ the edge case exists or what non-obvious lifecycle interaction it guards against.

---

## 6. Audit & Review Checklist

Use this checklist when writing or reviewing tests:

- [ ] All created DOM elements are registered with `trackElement()` and removed in `afterEach()`.
- [ ] Composable execution is wrapped in an `effectScope()` and stopped in `afterEach()`.
- [ ] `vi.clearAllMocks()` and `vi.useRealTimers()` are called in `afterEach()`.
- [ ] No state or DOM mutations leak between `it()` blocks.
- [ ] `userEvent` is used for user interaction flows (clicks, tabs, keyboard).
- [ ] Synthetic `dispatchEvent` is used for coordinate/geometry/pointerType mocks.
- [ ] Open-change reasons use kebab-case string literals.
- [ ] Element variables use the `*El` naming suffix.
- [ ] File structure is minimal without decorative section banners.
