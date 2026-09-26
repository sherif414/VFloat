---
trigger: model_decision
description: when writing, reviewing, refactoring, or running tests
---

# Rules for AI Agent Test Generation & Review

All test suites in VFloat **MUST** adhere to Behavior-Driven Development (BDD) testing standards. This rule applies to all test files (`*.test.ts`) across all packages.

For detailed test tiers, fixtures, test file layout templates, and review checklists, refer to the `vfloat-test-standards` skill.

---

## Core Invariants

1. **Three-Level BDD Suite Structure**:
   - Every test file **MUST** follow a 3-level hierarchy: `Feature:` -> `Scenario:` -> `Given/When/Then` (or `When/Then`).
   - Descriptions **MUST** use active present tense and declarative phrasing.
   - Vague phrases (e.g. `"should work"`, `"handles correctly"`, `"tests XYZ"`, `"test 1"`, `"edge case"`) are strictly forbidden.

2. **User-Facing Behavioral & Accessibility Contracts**:
   - Tests **MUST** assert user-observable DOM and accessibility states (`aria-*` attributes, visibility, element presence in the DOM).
   - Tests **MUST NOT** assert private intermediate reactive state or inspect raw DOM activeElement pointers. Tests **MUST** use dedicated focus matchers (e.g. `expect.element(el).toHaveFocus()`).
   - Standard user interactions **MUST** use realistic user gesture simulations (e.g. `userEvent`), never manual synthetic event dispatching (`dispatchEvent`).
   - Headless state contracts: when asserting public reactivity contracts directly on headless instances, assert observable state transitions on the public open ref without assuming private setters or event codes.

3. **Locators & Element Variables**:
   - Accessible locators (`page.getByRole`, `page.getByTestId`) are the default for element queries and gestures.
   - Direct DOM element access is an escape hatch restricted to synthetic device anomaly simulation and isolated coordinate math.
   - All DOM element references **MUST** be suffixed with `*El` (`anchorEl`, `floatingEl`, `itemEl`).

4. **Strict Isolation & Minimal Lifecycle**:
   - Each test **MUST** render its own isolated component instance without shared mutable state across test blocks.
   - Suites **MUST** perform minimal lifecycle cleanup in `afterEach` to clear mocks and restore real timers.
   - Fake timers **MUST** only be active around buffer/timeout assertions and restored in `afterEach`.
   - Legacy manual DOM tracking or manual effect scopes **MUST NOT** be used in any new or migrated test files.
