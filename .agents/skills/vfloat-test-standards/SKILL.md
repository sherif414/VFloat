---
name: vfloat-test-standards
description: Enforce Behavior-Driven Development (BDD) testing standards, 3-level suite hierarchy (Feature -> Scenario -> Given/When/Then), tier system (P/S/I), accessible query patterns, and Vitest Browser Mode rules across all VFloat tests. Use when writing new tests, migrating legacy suites, refactoring tests, or reviewing test PRs.
---

# VFloat BDD Test Standards

This skill defines the testing standards and Behavior-Driven Development (BDD) methodology for the VFloat codebase. All VFloat tests run natively in **Vitest Browser Mode** (Playwright / Chromium). Tests must prioritize strict behavioral specifications, zero DOM/reactivity leakage, minimal file structure, and high-fidelity interaction modeling without coupling to internal implementation details.

The reference BDD architectural specification is defined in [RFC 0005: Behavior-Driven Development (BDD) Testing Standards & Migration Framework](file:///C:/projects/VFloat.worktrees/tests_migration_to_bdd/RFC/0005-bdd-testing-standards.md).

## When to Use This Skill

- When writing new unit, composable, or integration tests (`*.test.ts`).
- When migrating existing tests to BDD standards.
- When refactoring existing test suites or adding regression tests.
- When diagnosing flaky tests, unclosed watchers, or DOM leaks between tests.
- When reviewing test PRs or performing test code audits.

---

## 1. Testing Philosophy: User-Facing Behavior & Reactivity Contracts

VFloat is a foundational headless engine built on pure Vue 3.5 reactivity. In VFloat:
- `FloatingNode.open` is a Vue `Ref<boolean>`.
- Interaction composables (`useClick`, `useHover`, `useEscapeKey`, `useOutsideClick`) directly mutate `node.open.value`.
- There are **no** `setOpen` methods, **no** `openChange` events, and **no** string reason codes.

### Strict Prohibition Against Implementation Coupling
- **NEVER** assert private intermediate reactive refs when observable DOM or ARIA states exist in rendered components (`aria-expanded`, `toBeVisible()`, presence in the DOM).
- **NEVER** assert raw DOM activeElement pointers (e.g. `expect(document.activeElement).toBe(el)`). Use `await expect.element(el).toHaveFocus()`.
- **NEVER** dispatch manual synthetic events (e.g. `anchorEl.dispatchEvent(new MouseEvent("click"))`) for standard user interactions. Always use `await userEvent.click(anchorEl)` or `await userEvent.keyboard(...)`.

### When Low-Level DOM Testing is Permitted
Low-level access (`getTestEl`, synthetic event dispatching, geometry stubbing) is strictly restricted to:
1. **Hardware Quirks & Device Normalization**: Simulating device anomalies that `userEvent` abstracts away (e.g. `pointerType: ""` on hybrid laptops, synthetic clicks with `detail === 0`).
2. **Pure Geometric Math (Tier P)**: Testing clipping, flip placement, and safe triangle corridors (`safePolygon`) using isolated coordinate math.

---

## 2. Element Query Strategy: Locators vs. Raw Elements

| Mechanism | Type | Purpose & Usage |
| :--- | :--- | :--- |
| **`page.getByRole(...)` / `page.getByTestId(...)`** | Playwright Locator (Async) | **Default for 80–90% of tests**. User gestures, element visibility, and accessible attribute assertions. |
| **`getTestEl(testId)`** (`@/test-utils`) | Raw `HTMLElement` (Sync) | **Escape hatch**. Reserved strictly for geometry stubs (`stubElementRect`) and synthetic device quirk events. |
| **Fixture Factory (`renderX`)** | Composite Bundle | **The "Given" (Arrange) phase**. Mounts component via `render()`, awaits `nextTick()`, and returns elements + node handles to eliminate boilerplate. |

Rules:
- Suffix all queried DOM element variables with `*El` (`anchorEl`, `floatingEl`, `itemEl`).
- Never query internal implementation classes or private wrapper DOM elements.

---

## 3. BDD Hierarchy & Naming Conventions

Every test suite must follow a maximum 3-level BDD hierarchy:

```
Level 1: Feature      ── describe("Feature: [Capability / Composable Name]")
Level 2: Scenario     ── describe("Scenario: [Context / Circumstance / Precondition]")
Level 3: Behavioral Spec ─ it("Given [Context], When [Action], Then [Expected Outcome]")
                        or it("When [Action], Then [Expected Outcome]")
```

### Spec Naming Rules
- Use active, declarative present tense.
- State-dependent: `it("Given a closed floating element with toggle enabled, When anchor is clicked, Then opens and marks anchor as expanded")`
- Action-driven: `it("When Escape key is pressed, Then closes the floating element and restores focus to anchor")`
- **Forbidden Phrases**: `"should work"`, `"handles correctly"`, `"tests XYZ"`, `"test 1"`, `"edge case"`.

### The Given-When-Then Anatomy Inside `it()`
```ts
it("Given an open popover, When Escape is pressed, Then closes the floating element", async () => {
  // Given: Arrange preconditions & mount fixture
  const { anchorEl, floatingEl } = await renderEscapeKeyFixture({ defaultOpen: true });
  await expect.element(floatingEl).toBeVisible();

  // When: Act with real user gestures
  await userEvent.keyboard("{Escape}");

  // Then: Assert observable user outcome
  await expect.element(floatingEl).not.toBeInTheDocument();
  await expect.element(anchorEl).toHaveFocus();
});
```

---

## 4. Test Tiers

Every test file belongs to exactly one tier. The tier determines required lifecycle hooks and fixtures.

### Tier P — Pure / Logic (no DOM)
For geometry, state machines, matching algorithms, ID generators, and public API surface without rendered output.
- Given initial state/coordinates -> When calculation runs -> Then returns deterministic result.
- No `render()`, no component mounting.
- Lifecycle: `afterEach()` cleans up timers/mocks only if fake timers or scopes were used.

### Tier S — Single Composable, Render-Based (Default for DOM)
For a single composable operating on rendered anchor/floating elements.
- Component mounting via `render()` from `vitest-browser-vue`.
- Clean isolation: Every test renders its own component. **No shared mutable state across tests.**
- Forbidden in new files: Manual `document.createElement`, `trackElement`, `clearTrackedElements`, manual `effectScope`.
- Lifecycle: `afterEach(() => { vi.clearAllMocks(); vi.useRealTimers(); })`.

### Tier I — Integration & Hierarchies
For multiple composables, composite floating trees, nested submenus, collections, or virtualizers.
- Coordinated multi-node interactions and tree bubbling/gating.
- Same isolation and lifecycle rules as Tier S.

### Legacy manual-DOM (Deprecated)
Suites still using `trackElement` + manual `effectScope` must be actively migrated to Tier S BDD render fixtures. Do not copy this pattern into new files.

---

## 5. Test File Layout

Follow this exact order separated by blank lines:

1. **Imports**: `vitest` first, then `vitest-browser-vue`, then `vitest/browser`, then `vue`, then `@floating-ui/dom`, then internal VFloat modules (`@/...`).
2. **Mocks**: `vi.mock()` calls immediately after imports.
3. **Fixture types**: Unexported `FixtureConfig` interface. Never export from a `.test.ts` file.
4. **Factory**: `createTestComponent(options, config)` and `renderX(options, config)` at module scope.
5. **Lifecycle hooks**: Minimal `afterEach` (`vi.clearAllMocks()`, `vi.useRealTimers()`).
6. **Suites**: Single top-level `describe("Feature: useX")` containing `describe("Scenario: ...")` and BDD `it("Given ..., When ..., Then ...")` blocks.

---

## 6. Audit & Review Checklist for BDD Tests

Use this checklist when authoring or reviewing tests:

- [ ] Top-level block uses `describe("Feature: [Name]")`.
- [ ] Sub-blocks use `describe("Scenario: [Context / Circumstance]")`.
- [ ] Test cases follow `it("Given ..., When ..., Then ...")` or `it("When ..., Then ...")` format.
- [ ] No vague phrases (`"should work"`, `"handles correctly"`, `"edge case"`).
- [ ] No assertion of private reactive refs when observable DOM/ARIA state exists in the rendered component (`aria-expanded`, `toBeVisible()`).
- [ ] Focus assertions use `await expect.element(el).toHaveFocus()` (never `document.activeElement === el`).
- [ ] User gestures use `userEvent.*` (never manual `dispatchEvent` for normal user clicks/keypresses).
- [ ] Low-level DOM access (`getTestEl`, synthetic builders) is used *only* for hardware quirks or geometry stubs.
- [ ] Element variables use the `*El` suffix (`anchorEl`, `floatingEl`, `itemEl`).
- [ ] Each test renders its own component; zero state leaks across tests.
- [ ] `vi.clearAllMocks()` and `vi.useRealTimers()` run in `afterEach()`.
- [ ] Nothing is exported from the test file.
