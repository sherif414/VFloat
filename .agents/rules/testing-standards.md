---
trigger: model_decision
description: when writing, reviewing, refactoring, or running tests
---

# Rules for AI Agent Test Generation & Review

All test suites in VFloat **MUST** adhere to Behavior-Driven Development (BDD) testing standards. This rule applies to all test files (`*.test.ts`) across all packages.

The single source of truth for the testing standards is [.agents/skills/vfloat-test-standards/SKILL.md](../skills/vfloat-test-standards/SKILL.md). Historical note: `RFC/0005-bdd-testing-standards.md` was removed from the repository in commit `6f7f07e`; recover it with `git show 6f7f07e^:RFC/0005-bdd-testing-standards.md`.

---

## 1. Core Principles

- **Living Behavioral Specifications**: Tests **MUST** read as specifications of user-observable behavior and public composable contracts, not imperative scripts exercising code lines.
- **Strict Prohibition Against Implementation Coupling**:
  - Tests **MUST NOT** assert private intermediate reactive refs when observable DOM or ARIA states exist in rendered components (`aria-expanded`, `toBeVisible()`, element presence in the DOM).
  - Tests **MUST NOT** inspect raw DOM `document.activeElement === el`. Tests **MUST** use `await expect.element(el).toHaveFocus()`.
  - Tests **MUST NOT** dispatch manual synthetic events (`dispatchEvent(new MouseEvent('click'))`) for normal user interactions. Tests **MUST** use `await userEvent.click(anchorEl)` or `await userEvent.keyboard(...)`.
- **Public Reactivity Contract**:
  - In VFloat, `node.open` is a Vue `Ref<boolean>` mutated directly by interaction composables (`useClick`, `useHover`, `useEscapeKey`, `useOutsideClick`). There are no `setOpen` methods, `openChange` events, or reason code strings.
  - In Tier S / Tier I render-based component tests, assert observable DOM and ARIA attributes (`aria-expanded`, `expect.element(floatingEl).toBeVisible()`).
  - When testing headless composable contracts directly, assert the public `node.open.value` state transition.
- **Strict Isolation**: Each test **MUST** render its own component instance via `render()`. Tests **MUST NOT** share mutable state across `it()` blocks.

---

## 2. Three-Level BDD Suite Structure

Every test file **MUST** follow a maximum 3-level hierarchy:

```
Level 1: Feature      ── describe("Feature: [Capability / Composable Name]")
Level 2: Scenario     ── describe("Scenario: [Context / Circumstance / Precondition]")
Level 3: Behavioral Spec ─ it("Given [Context], When [Action], Then [Expected Outcome]")
                        or it("When [Action], Then [Expected Outcome]")
```

### Phrasing Requirements:
- Top-level describe **MUST** start with `"Feature: "`.
- Scenario describe **MUST** start with `"Scenario: "`.
- Spec descriptions **MUST** use active present tense and follow Given-When-Then:
  - `it("Given a closed floating element with toggle enabled, When anchor is clicked, Then opens the floating element and sets aria-expanded")`
  - `it("When Escape key is pressed, Then closes the floating element and restores focus to anchor")`
- Spec descriptions **MUST NOT** use vague phrases (`"should work"`, `"handles correctly"`, `"tests XYZ"`, `"test 1"`, `"edge case"`).

---

## 3. Element Querying & Locators

- **Default (`page.getBy*`)**: Tests **MUST** use `page.getByRole(...)` or `page.getByTestId(...)` for user gesture simulations and UI state assertions.
- **Escape Hatch (`getTestEl`)**: Raw `HTMLElement` access is restricted to:
  1. Low-level synthetic hardware quirk simulation (e.g. `pointerType: ""` on hybrid laptops, synthetic clicks with `detail === 0`).
  2. Viewport geometry stubs (`stubElementRect`) in Tier P tests.
- **Variables**: All DOM element references **MUST** be suffixed with `*El` (`anchorEl`, `floatingEl`, `itemEl`).

---

## 4. Test Lifecycle & Cleanup

- For Tier S and Tier I render-based suites, lifecycle **MUST** remain minimal:
  ```ts
  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });
  ```
- Fake timers (`vi.useFakeTimers()`) **MUST** only be active around buffer/timeout assertions and restored in `afterEach()`.
- Legacy `trackElement` and manual `effectScope` **MUST NOT** be used in any new or migrated test files.
