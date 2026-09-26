---
name: vfloat-test-standards
description: Enforce Behavior-Driven Development (BDD) testing standards, 3-level suite hierarchy (Feature -> Scenario -> Given/When/Then), tier system (P/S/I), accessible locators, fixture factory patterns, and Vitest Browser Mode validation. Use when authoring new tests, migrating legacy suites, refactoring tests, diagnosing test failures, or reviewing test PRs.
---

# VFloat BDD Test Standards

This skill defines the Behavior-Driven Development (BDD) testing methodology and operational runbooks for the VFloat codebase. All VFloat tests execute natively in **Vitest Browser Mode** (Playwright / Chromium).

---

## 1. Testing Philosophy & Public Contracts

VFloat is a headless engine built on pure Vue 3.5 reactivity:
- **Public Reactivity Contract**: Interaction composables directly mutate open state (`node.open.value`). There are no private setters, `openChange` events, or reason strings.
- **Observable Invariants Over Implementation Details**:
  - In render-based suites (Tier S / Tier I), assert observable DOM and ARIA attributes (`aria-expanded`, visibility via `toBeVisible()`, presence in the DOM, element focus).
  - When asserting headless composable contracts directly, assert the public `open.value` state transition.
  - Never assert private reactive refs when observable DOM/ARIA state exists.
- **Realistic User Interactions**: Always simulate user interactions via high-level user gesture utilities (`await userEvent.click(anchorEl)`, `await userEvent.keyboard(...)`). Never dispatch manual synthetic events for normal user gestures.
- **Focus Verification**: Always assert focus using dedicated matchers (`await expect.element(el).toHaveFocus()`), never by inspecting raw DOM pointers (`document.activeElement === el`).

---

## 2. The Test Tier System

Every test file belongs to exactly one tier. The tier determines required fixtures and lifecycle hooks:

| Tier | Focus | DOM / Mounting | Fixture Pattern | Lifecycle Cleanup |
| :--- | :--- | :--- | :--- | :--- |
| **Tier P** (Pure / Logic) | Geometry math, collision algorithms, state machines, utilities | No DOM mounting | Pure functions or isolated state refs | Clear timers/mocks if used |
| **Tier S** (Single Composable) | Individual interaction composable mounted on anchor/floating elements | Component mount via `render()` | `createTestComponent` + `renderX` factory | `vi.clearAllMocks()`, `vi.useRealTimers()` |
| **Tier I** (Integration / Trees) | Multi-node hierarchies, nested submenus, floating trees, focus trapping | Component mount via `render()` | Multi-node tree fixture factory | `vi.clearAllMocks()`, `vi.useRealTimers()` |

---

## 3. Operational Workflows

### Workflow A: Authoring a New Test Suite

1. **Determine the Tier**: Identify whether the functionality belongs to Tier P (pure logic), Tier S (single composable), or Tier I (composite tree).
2. **Implement the Fixture Factory**:
   - For Tier S / I, write `createTestComponent` and `renderX` at module scope (see [Canonical Fixture Archetype](#4-canonical-fixture-archetype-tier-s)).
   - Expose accessible locators (`page.getByTestId`, `page.getByRole`) and necessary reactive handles from the factory.
3. **Draft the BDD Hierarchy**:
   - Single top-level `describe("Feature: [Capability / Composable Name]")`.
   - Group conditions with `describe("Scenario: [Context / Circumstance]")`.
   - Write behavioral specs using active present tense: `it("Given [Context], When [Action], Then [Expected Outcome]")`.
4. **Implement Steps with User Gestures**:
   - **Given**: Call `await renderX(...)` and assert initial preconditions.
   - **When**: Trigger action using `await userEvent.*`.
   - **Then**: Assert observable DOM outcomes (`expect.element(el)...`).
5. **Validate with Vitest**: Execute the targeted test run (see [Validation Commands](#6-validation-commands)).

---

### Workflow B: Migrating a Legacy Suite to BDD

1. **Identify Deprecated Patterns**:
   - Look for manual DOM creation (`document.createElement`), legacy element tracking arrays, or manual `effectScope()` instantiation.
   - Look for imperative synthetic events (`el.dispatchEvent(new MouseEvent(...))`) and raw focus checks (`expect(document.activeElement).toBe(el)`).
2. **Replace Setup with Component Fixtures**:
   - Convert manual DOM creation into a Vue component using `defineComponent` and `useFloatingNode`.
   - Mount using `render()` from `vitest-browser-vue` inside an async `renderX` factory.
3. **Refactor Assertions to User-Facing Invariants**:
   - Replace synthetic dispatches with `await userEvent.click(anchorEl)` or `await userEvent.keyboard(...)`.
   - Replace raw DOM activeElement checks with `await expect.element(el).toHaveFocus()`.
   - Replace private state inspection with accessible attributes (`aria-expanded`, `expect.element(floatingEl).toBeVisible()`).
4. **Restructure into 3-Level BDD Hierarchy**:
   - Nest test cases under `Feature:` and `Scenario:` blocks.
   - Rename `it("should ...")` blocks to `it("Given ..., When ..., Then ...")` or `it("When ..., Then ...")`.
5. **Verify Lifecycle**:
   - Add minimal `afterEach(() => { vi.clearAllMocks(); vi.useRealTimers(); })`.
   - Remove manual teardown calls (`clearTrackedElements`, `scope.stop()`).

---

### Workflow C: Diagnosing Flaky Tests & Leaks

1. **Timer Leakage**:
   - Ensure fake timers (`vi.useFakeTimers()`) are only enabled immediately around time-dependent assertions and restored with `vi.useRealTimers()` in `afterEach`.
2. **Asynchronous DOM Flushes**:
   - When modifying reactive state directly, always `await nextTick()` before querying or asserting DOM updates.
3. **Shared State Pollution**:
   - Ensure every `it()` block creates its own isolated fixture instance via `await renderX(...)`. Never share components, elements, or mutable refs across tests.
4. **Focusable Targets in Browser Mode**:
   - Vitest Browser Mode runs real Chromium focus logic. Ensure trigger elements are genuinely focusable (native `<button>`, `<input>`, or elements with `tabindex="0"`) before asserting focus.

---

## 4. Canonical Fixture Archetype (Tier S)

Use this minimal, copy-pasteable archetype when authoring Tier S render suites:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-vue";
import { page, userEvent } from "vitest/browser";
import { defineComponent, h, nextTick, ref, useTemplateRef } from "vue";
import { type FloatingNode, useFloatingNode, useTargetComposable } from "@/composables";

// Fixture Configuration
interface FixtureConfig {
  defaultOpen?: boolean;
}

function createTestComponent(options = {}, config: FixtureConfig = {}) {
  const openRef = ref(config.defaultOpen ?? false);
  let node!: FloatingNode;

  const Component = defineComponent(() => {
    const anchorEl = useTemplateRef<HTMLElement>("anchor");
    const floatingEl = useTemplateRef<HTMLElement>("floating");

    node = useFloatingNode({
      anchorEl,
      floatingEl,
      open: openRef,
    });
    useTargetComposable(node, options);

    return () =>
      h("div", { class: "test-wrapper" }, [
        h("button", {
          ref: "anchor",
          "data-testid": "anchor",
          "aria-expanded": String(openRef.value),
        }, "Anchor"),
        openRef.value ? h("div", { ref: "floating", "data-testid": "floating" }, "Floating Content") : null,
      ]);
  });

  return { Component, getNode: () => node, openRef };
}

async function renderFixture(options = {}, config: FixtureConfig = {}) {
  const fixture = createTestComponent(options, config);
  await render(fixture.Component);
  await nextTick();
  return {
    anchorEl: page.getByTestId("anchor"),
    floatingEl: page.getByTestId("floating"),
    node: fixture.getNode(),
    openRef: fixture.openRef,
  };
}

// BDD Test Suite
describe("Feature: Target Composable Capability", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe("Scenario: Toggle activation on user click", () => {
    it("Given a closed floating element, When anchor is clicked, Then opens and marks anchor as expanded", async () => {
      // Given: Arrange preconditions
      const { anchorEl, floatingEl } = await renderFixture();
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "false");
      await expect.element(floatingEl).not.toBeInTheDocument();

      // When: Act with real user gesture
      await userEvent.click(anchorEl);

      // Then: Assert observable outcome
      await expect.element(anchorEl).toHaveAttribute("aria-expanded", "true");
      await expect.element(floatingEl).toBeVisible();
    });
  });
});
```

---

## 5. Element Query & Gesture Strategy

| Mechanism | Type | Purpose & Usage |
| :--- | :--- | :--- |
| **`page.getByRole(...)` / `page.getByTestId(...)`** | Playwright Locator (Async) | **Default (80–90% of tests)**. User gestures, element visibility, and accessible attribute assertions. |
| **`getTestEl(testId)`** | Raw `HTMLElement` (Sync) | **Escape hatch**. Reserved strictly for device anomaly simulations and isolated geometry calculations. |
| **Fixture Factory (`renderX`)** | Composite Bundle | **The "Given" phase**. Mounts component via `render()`, awaits `nextTick()`, and returns locators and node handles. |

### Locator Conventions:
- Suffix all queried element references with `*El` (e.g. `anchorEl`, `floatingEl`, `itemEl`).
- Never query private internal wrapper elements or CSS classes. Query accessible roles or explicit `data-testid` attributes.

---

## 6. Validation Commands

Always run targeted validation commands to falsify or confirm changes:

```bash
# 1. Run a specific targeted test file (Browser Mode):
pnpm --filter v-float test:run packages/vue/src/composables/<feature>/<file>.test.ts
# or directly:
pnpm vitest run packages/vue/src/composables/<feature>/<file>.test.ts

# 2. Run all unit and browser test suites:
pnpm run test:run

# 3. Run SSR environment tests (Node mode):
pnpm run test:ssr
```

---

## 7. Review & Audit Checklist

> [!IMPORTANT]
> **Proportional Review Scope**:
> - **Diff-Scoped (Surgical)**: When adding a regression test or modifying an existing spec, apply this checklist **strictly to the modified code and newly added `it(...)` blocks**. Do not audit or refactor untouched tests in the file.
> - **Full-File**: Audit top-to-bottom only when authoring a new test file from scratch, performing an explicit suite migration, or conducting a requested test review.

- [ ] Top-level block uses `describe("Feature: [Capability / Name]")`.
- [ ] Scenario sub-blocks use `describe("Scenario: [Context / Circumstance]")`.
- [ ] Specs follow `it("Given [Context], When [Action], Then [Expected]")` or `it("When [Action], Then [Expected]")`.
- [ ] No vague phrases (`"should work"`, `"handles correctly"`, `"tests XYZ"`, `"test 1"`, `"edge case"`).
- [ ] No assertions on private reactive refs when observable DOM/ARIA state exists.
- [ ] Focus assertions use `await expect.element(el).toHaveFocus()` (never `document.activeElement === el`).
- [ ] User gestures use `await userEvent.*` (never manual `dispatchEvent`).
- [ ] Raw DOM access (`getTestEl`) is strictly isolated to hardware quirk simulations or geometry stubs.
- [ ] Queried element variables use the `*El` suffix (`anchorEl`, `floatingEl`, `itemEl`).
- [ ] Every test renders its own component; zero shared mutable state between tests.
- [ ] Lifecycle includes `afterEach(() => { vi.clearAllMocks(); vi.useRealTimers(); })`.
- [ ] Nothing is exported from the test file.
