---
name: vfloat-test-standards
description: Enforce the unified test file layout, tier system (pure / render-based / legacy), and Vitest Browser Mode standards across all VFloat tests. Render-based component testing is mandatory for DOM/interaction coverage. Use when writing new tests, migrating legacy suites, or reviewing test PRs.
---

# VFloat Test Standards

This skill defines the testing standards for the VFloat codebase. All VFloat tests run natively in **Vitest Browser Mode** (Playwright / Chromium). Tests must prioritize strict isolation, zero DOM/reactivity leakage, minimal file structure, and high-fidelity interaction modeling.

The reference pattern for all DOM/interaction tests is the list-navigation suites
(`src/composables/keyboard-navigation/use-roving-focus.test.ts`,
`src/composables/keyboard-navigation/use-aria-activedescendant.test.ts`):
component rendering via `vitest-browser-vue`, accessible queries via `page`,
and real user gestures via `userEvent`.

## When to Use This Skill

- When writing new unit or composable tests (`*.test.ts`).
- When migrating legacy manual-DOM suites to the render-based pattern.
- When refactoring existing test suites or adding regression tests.
- When diagnosing flaky tests, unclosed watchers, or DOM leaks between tests.
- When reviewing test PRs or performing test code audits.

---

## 1. Test Tiers

Every test file belongs to exactly one tier. The tier determines which sections
and lifecycle hooks are required.

### Tier P — Pure / logic (no DOM)

For geometry, matching, ID generation, public API surface, and state machines
without rendered output. Reference: `polygon-geometry.test.ts`,
`public-api.test.ts`, `use-collection.test.ts`.

- No `render()`, no manual `effectScope()` wrapping beyond the lifecycle below.
- DOM-utility suites (tab order, inert stack, focus guards) may create stub
  elements with `document.createElement`, but must register them with the
  shared `trackElement` / `clearTrackedElements` from `@/test-utils` — never a
  local copy.
- `effectScope()` in `beforeEach()` only when the composable under test needs a
  reactive scope; otherwise no lifecycle hooks at all.
- `afterEach()` stops the scope and resets mocks/timers when a scope or fake
  timers were used.

### Tier S — Single composable, render-based (default for DOM)

For one composable with rendered anchor/floating elements. Reference:
list-navigation suites; pilot: `use-typeahead.test.ts`.

- **Mandatory:** `render()` from `vitest-browser-vue`, element lookup from the
  rendered output (`page.getByRole()` or `document.body.querySelector()`),
  and `userEvent` or the shared `dispatchKey` builder for key input.
- **Forbidden in new files:** manual `document.createElement` /
  `trackElement` / `clearTrackedElements` / manual `effectScope()` wrapping.
  The component instance owns its scope; `render()` owns DOM cleanup.
- Minimal lifecycle: `afterEach(() => { vi.clearAllMocks(); vi.useRealTimers(); })`
  only. No `beforeEach` fixture setup — each test renders its own component.

### Tier I — Integration, render-based

For multiple composables plus tree, collection, or virtualizer coordination.
Same rules as Tier S, plus reactive controls (`countRef`, `activeIndex` refs)
returned from the factory for bounds auto-correction and virtualizer tests.
Reference: `use-aria-activedescendant.test.ts` Suites 18/21.

### Legacy manual-DOM (deprecated)

Suites still using `trackElement` + manual `effectScope` (`use-click`,
`use-hover`, `use-focus`, `use-position`, `use-arrow`, `use-role`,
`use-outside-click`, `use-client-point`) keep the full cleanup below until
migrated. Do not copy this pattern into new files.

```typescript
afterEach(() => {
  scope?.stop();
  clearTrackedElements();
  vi.clearAllMocks();
  vi.useRealTimers();
});
```

---

## 2. Test File Layout

Test files stay minimal: blank-line separated sections, no decorative section
banners. Follow this exact order:

1. **Imports**: `vitest` first, then `vitest-browser-vue`, then
   `vitest/browser`, then `vue`, then `@floating-ui/dom`, then internal
   VFloat modules (`@/...`). For Tier S/I the render imports are required:
   `render`, `page`/`userEvent`, `defineComponent`, `h`, `useTemplateRef`.
2. **Mocks**: `vi.mock()` calls only, immediately after imports.
3. **Fixture types**: unexported `FixtureConfig` interface and setup option
   types. Never export from a `.test.ts` file.
4. **Factory**: `createTestComponent(options, config)` at module scope
   returning `{ Component, getReturn, ...refs }`. The component wires
   `useFloatingNode` + the composable under test with `useTemplateRef` refs
   and exposes getters for assertions. Per-test inline components are allowed
   only for exotic cases (e.g. virtual anchors).
5. **Lifecycle hooks**: Tier S/I use the minimal `afterEach` above; Tier P
   uses scope/timer cleanup only when needed.
6. **Suites**: single top-level `describe("useX")` with nested behavior groups
   (`describe("prefix matching")`) following the `use-roving-focus`
   convention. Mega-files (1000+ lines) may use numbered suites
   (`describe("Suite N: title")`) following the `use-aria-activedescendant`
   convention.

---

## 3. Vitest Browser Mode: Interaction Guidelines

| Strategy                                                     | When to Use                                                                          | Example                                                                                                    |
| :----------------------------------------------------------- | :----------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------- |
| **`render` + `userEvent`**                                   | Default for Tier S/I user gestures: focus, clicks, tabs, keyboard search             | `await render(Component);` `await userEvent.click(anchor);` `await userEvent.keyboard("{ArrowDown}");`     |
| **`render` + `dispatchKey`** (`@/test-utils/event-builders`) | Deterministic key/pointer input with fake timers, geometry, or `pointerType` control | `dispatchKey(floatingEl, "b");` `vi.advanceTimersByTime(500);`                                             |
| **Accessible queries**                                       | Element lookup from rendered output                                                  | `page.getByRole("button", { name: "Anchor" });` `document.body.querySelector('[data-testid="floating"]');` |
| **Direct Vue reactivity**                                    | Dynamic option changes and reactive sync                                             | `enabledRef.value = false;` `await nextTick();`                                                            |

Rules:

- Never share mutable state across `it()` blocks. Each test renders its own
  component and queries its own elements.
- Use `vi.useFakeTimers()` only around buffer/timeout assertions and always
  pair with `vi.useRealTimers()` in `afterEach()`.
- Prefer `await expect.element(el).toHaveFocus()` for focus assertions.

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

- [ ] File declares its tier (P pure, S render-based, I integration) and follows that tier's lifecycle.
- [ ] New DOM/interaction tests use `render()` + accessible queries; no `trackElement`, no manual `effectScope`.
- [ ] Sections follow the Imports → Mocks → Fixture types → Factory → Lifecycle → Suites order.
- [ ] Factory is `createTestComponent` at module scope (inline components only for exotic cases).
- [ ] Suites use behavior names; only mega-files (1000+ lines) may use numbered `Suite N` describes.
- [ ] No state or DOM mutations leak between `it()` blocks; each test renders its own component.
- [ ] `vi.clearAllMocks()` runs in `afterEach`; fake timers are always restored with `vi.useRealTimers()`.
- [ ] `userEvent` is used for user gesture flows; `dispatchKey` for timer-controlled or coordinate input.
- [ ] Open-change reasons use kebab-case string literals.
- [ ] Element variables use the `*El` suffix; nothing is exported from the test file.
- [ ] Shared builders come from `@/test-utils/*`, never copy-pasted between files.
