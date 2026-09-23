# META INFORMANTION ABOUT THE PROJECT

- This project is named VFloat
- It's heavily inspired by Floating UI, however it's not a fork of it.
- Some of the api is similar to Floating UI, however it's not a direct copy. many parts of the api are different, so keep that in mind.

## Commit Messages

- All commit messages **MUST** adhere to the Conventional Commits specification defined in [.agents/rules/commit-message.md](.agents/rules/commit-message.md).
- Follow [.agents/rules/commit-message.md](.agents/rules/commit-message.md) as the single source of truth for commit types, scopes, SemVer mapping, and the distinction between user-facing library features (`feat`/`fix`) and maintainer/AI tooling (`chore`).

## Testing Standards

- All tests **MUST** adhere to the Behavior-Driven Development (BDD) standards defined in [.agents/rules/testing-standards.md](.agents/rules/testing-standards.md) and [.agents/skills/vfloat-test-standards/SKILL.md](.agents/skills/vfloat-test-standards/SKILL.md).
- Follow the 3-level hierarchy: `Feature:` -> `Scenario:` -> `Given/When/Then`.
- Assert user-facing accessibility invariants (`aria-expanded`, `expect.element(el).toHaveFocus()`, visibility); never assert private reactive internals or inspect raw DOM activeElement pointers.

## Explicit Communication & User Agency

- **No Silent Changes**: Never make silent, unrequested modifications to files, configurations, or working state (e.g., altering user-authored configs during a commit request, refactoring code outside the prompt scope).
- **Proactive Reporting with User Decision**: When identifying something that appears incorrect, deprecated, suboptimal, or broken:
  1. Clearly raise the observation and context to the user.
  2. Explain why a change might be beneficial (along with any alternatives or tradeoffs).
  3. Leave the final decision to the user before applying any changes.
- **Respect User Intent**: When given a specific task (such as staging/committing a change or running a script), execute the requested action without unilaterally modifying the underlying subject unless explicitly asked.
- **Strict Staging Isolation**: When asked to commit changes, strictly stage only the specific files modified by the agent as part of the active task (`git add <specific-files>`). Never use blanket commands (`git add .` / `git add -A`) or stage pre-existing unstaged/user-authored changes unless explicitly instructed to commit everything.
- **Rollback Scope Boundary**: When asked to revert, reset, or roll back changes, strictly target only the modifications or commits introduced during the active task. Never reset beyond the task boundary or discard user commits without explicit confirmation.
- **Pragmatic Scope Discipline**: When investigating or hardening architectural concerns (such as cross-realm or SSR safety), focus strictly on realistic library use cases (such as elements inside same-origin iframes, portals, and SVG anchors). Do not over-engineer or divert focus into irrelevant or near-impossible scenarios (such as cross-origin security restrictions, obscure XML parsers, or synthetic mocks) unless explicitly requested.

## Coding Style

- Add JSDoc-style docstrings to source functions and public exports when they define behavior or API shape.
- Skip docstrings for generated files, trivial accessors, and obvious type-only declarations.
- Add code comments when they explain why something exists, tradeoffs, non-obvious control flow, edge cases, or coordination between moving parts.
- Do not add comments that only restate what the code already says.

### Composable Architecture & Concern Separation

- **Pure & Idempotent Helpers**: All module-level helper functions and non-main composable utilities (`📌 Helpers`) must be completely pure and idempotent with zero side effects. They must not mutate DOM elements, mutate refs, or create Vue reactivity scopes/effects.
- **Side-Effect Containment**: All side effects (DOM attribute mutation, DOM focus/scrolling, ref updates, event listener binding, and external callbacks) must reside exclusively inside the main composable function.
- **Single-Concern Separation for Effects, Watchers & Event Handlers**:
  - Never conflate multiple distinct concerns within a single `watch`, `watchPostEffect`, or effect handler. Each distinct responsibility (e.g., reactive bounds auto-correction, DOM attribute synchronization, DOM focus synchronization) must have its own independent watcher.
  - Event listeners and handlers must not combine unrelated logic representing independent capabilities or concerns when they do not depend on call order. Keep independent behaviors decoupled in dedicated event listeners within their respective feature sections.
- **Composable Domain Separation & Non-Overreach**: Each composable must strictly adhere to its defined functional capability (e.g., focus orchestration, pointer interactions, positioning, keyboard navigation). Never implement ad-hoc fallback listeners or shortcuts representing an unrelated concern (e.g., handling pointer dismissal inside a focus composable). Instead, keep composables focused and rely on composition with the dedicated companion composable.

### Module Encapsulation & Export Discipline

- **Internals Must Never Be Exported**: Internals are functions, interfaces, types, constants, and variables that are only used within their defining module and never outside of it. If an entity is not imported and consumed by an outside file, it must never have `export`.
- **No Speculative Exports**: Never export symbols out of habit, convenience, or speculative future reuse.
- **Composable File Exports**:
  - Export only the primary composable function (for example, `useClick`) and its public companion types (`UseClickOptions`, `UseClickReturn`, `UseClickContext`).
  - Keep helper functions in `📌 Helpers` strictly unexported. Use `function helperName(...)`, not `export function helperName(...)`.
  - Keep internal types, working interfaces, state objects, constants, and lookup tables private to the module file.
- **Internal Helper Modules**:
  - In internal multi-file directories (such as `*-controller.ts`, `geometry.ts`, `intent.ts`), export only the specific symbols that collaborating files explicitly import.
  - Any function, type, or constant used only within that helper file must remain unexported.
  - Never re-export internal utilities, state registries, or classes from `src/index.ts` or public entrypoints.
- **Never Export for Tests**:
  - Do not export module internals solely to test them in isolation. Test behavior through the composable's public API.

## Modern API & Dependency Standards

- **Runtime & Language Baseline:** Target ECMAScript 2024+, TypeScript 5.9+, Node.js 22+, and Vue 3.5+.
- **Native Platform First:** Always prefer built-in Web APIs, standard DOM methods, and modern ECMAScript features over third-party utility packages.
- **Modern Vue 3.5+ Reactivity Idioms:**
  - Always use `toValue()` from Vue to unwrap refs, getters, and plain values. Do not use legacy manual unwrappers or deprecated patterns.
  - Use `shallowRef()` for DOM element references (`anchorEl`, `floatingEl`, `arrowEl`) to avoid unnecessary deep reactivity proxying.
  - Use `effectScope()` and `getCurrentScope()` to encapsulate and dispose composable side effects.
  - Use `useTemplateRef()` when binding template element references in Vue components.
  - **Reactivity Economy & Intentionality:** Do not make static initialization seeds, default values, or one-time options reactive. Options that only seed initial/uncontrolled state (e.g., `defaultIndex: number`, `initialValue: T`) must be plain, non-reactive primitives—not `MaybeRefOrGetter`. Only wrap options in `MaybeRefOrGetter` when they represent dynamic inputs expected to reactively update over the composable's active lifecycle (e.g., `enabled`, `orientation`, `loop`, `rtl`, `scrollIntoView`).
  - **TypeScript Contract Trust (Zero Defensive Boilerplate):** Always trust TypeScript type contracts. Never add defensive runtime fallbacks (`?? []`, `!elements || elements.length === 0`, `if (!elements) return`) when a parameter is typed as a non-nullable container (e.g., `elementsList: MaybeRefOrGetter<Array<HTMLElement | null>>`). Distinguish container nullability from item nullability: in `Array<HTMLElement | null>`, the array itself is guaranteed to exist; only individual element lookups (`list[idx]`) require null guards when accessing DOM nodes (`el?.focus()`, `if (el)`).
  - **Modern Optional Chaining (`?.()`, `?.prop`) Over Legacy Truthy Boilerplate:** Always use modern optional chaining (`options.callback?.(arg)`, `element?.isConnected`) instead of pre-ES2020 / pre-TS 4.4 truthy guard patterns (`options.callback && options.callback(arg)`, `element && element.isConnected`). In conditional statements, `undefined` naturally evaluates as falsy—never write redundant double-lookup boilerplate.
- **Cross-Realm (Iframe) & SSR Environment Safety:**
  - **Zero Bare Globals:** Never access bare `window` or `document` directly in DOM interaction logic or composable setup scopes.
  - **Dynamic Owner Resolution:** Always resolve DOM environment targets dynamically from active elements:
    - Document: `const ownerDoc = computed(() => element.value?.ownerDocument ?? getDocument());`
    - Window: `const ownerWin = computed(() => ownerDoc.value?.defaultView ?? getWindow());`
    - Always use safe SSR fallbacks (`getDocument()`, `getWindow()`, `isClient`) from `@/shared/env`.
  - **Realm-Scoped Timers:** Always schedule and clear timers (`setTimeout`, `clearTimeout`, `requestAnimationFrame`, `cancelAnimationFrame`) on the resolved `ownerWindow`, never on the global `window`:
    ```ts
    // ❌ Fragile (leaks across iframes, breaks in SSR):
    timeoutId = window.setTimeout(fn, delay);
    clearTimeout(timeoutId);

    // ✅ Realm-safe & SSR-safe:
    timeoutId = ownerWindow.value?.setTimeout(fn, delay);
    ownerWindow.value?.clearTimeout(timeoutId);
    ```
  - **Cross-Realm Type Checks:**
    - Never use bare `instanceof Element`, `instanceof HTMLElement`, or `instanceof Window` across realm boundaries. Always use `isElement(target)` or `isHTMLElement(target)` from `@/shared/dom`.
    - **Structural Checks Over Prototype Chains:** Prefer standard DOM structural properties (`nodeType === 1`, string `tagName`) over prototype chain inspection (`instanceof`), which breaks when iframes detach or constructor prototypes differ across realms.
    - **Tag Checks Over Class Constructors:** For specialized inputs, check `element.tagName === "INPUT"` and `element.tagName === "TEXTAREA"` instead of `instanceof HTMLInputElement` or `instanceof HTMLTextAreaElement`.
    - **SVG vs. HTML Element Awareness:** Use `isElement` (not `isHTMLElement`) whenever an element could be an SVG node (e.g., tooltip anchors, hover corridor targets, and modal inert background traversal) so SVG elements are not erroneously rejected.
- **Dependency Guard:**
  - **NEVER** install or suggest legacy/outdated utility packages (e.g., `lodash`, `underscore`, `axios`, `moment`, `deepmerge`, `vue-demi`, `rimraf`).
  - Always inspect `package.json` before assuming any dependency exists.
  - Do not introduce new dependencies without confirming that no standard browser or Node 22+ API exists to solve the problem.

# Package Management and Development Toolchain

This project uses `pnpm` as its package manager alongside **OXC** (`oxlint` and `oxfmt`) for linting and formatting, **Vitest** for testing, and **Vite** for dev server and building.

## pnpm Workflow

- Install dependencies: `pnpm install`
- Run dev server: `pnpm dev`
- Run build: `pnpm build`
- Run linting: `pnpm lint`
- Fix lint & format: `pnpm lint:fix`
- Format code: `pnpm format`
- Run tests (watch): `pnpm test`
- Run tests (single run): `pnpm run test:run`
- Run SSR tests (Node mode): `pnpm run test:ssr`
- Run dry-run release simulation: `pnpm run release:dry`
- Build documentation: `pnpm docs:build`
- Deploy documentation: `pnpm run docs:deploy`
- Run documentation linting: `pnpm docs:lint`
- Fix documentation lint & format: `pnpm docs:lint:fix`
- Format documentation: `pnpm docs:format`

## Review Checklist for Agents

- [ ] Run `pnpm install` after pulling remote changes and before getting started.
- [ ] Always write targeted regression unit tests whenever fixing a bug, handling an edge case, or addressing an ordering/lifecycle dependency.
- [ ] Enforce BDD testing standards for all new and modified test files: use the 3-level hierarchy (`Feature:` -> `Scenario:` -> `Given/When/Then`), prioritize user-facing accessibility invariants, and prevent implementation coupling.
- [ ] Add concise code comments explaining _why_ something exists whenever handling edge cases, non-obvious control flow, tradeoffs, or coordination between moving parts.
- [ ] Ensure full SSR & cross-realm (iframe) safety: resolve documents via `element.ownerDocument ?? getDocument()` and windows via `ownerDocument.defaultView ?? getWindow()`; execute timers (`setTimeout`, `clearTimeout`) on `ownerWindow`; never access bare `window`/`document` or un-guarded `instanceof Element` / `instanceof HTMLElement` in module/setup scopes; use `useId()` for deterministic IDs; prevent singleton memory retention in SSR.
- [ ] Scope-aware validation:
  - For library changes in `packages/vue/src/`: Run `pnpm lint`, `pnpm run test:ssr`, and `pnpm test:run`.
  - For `docs/` changes: Run `pnpm docs:lint` and `pnpm docs:build`.
  - For `playground/` changes: Run `pnpm --filter v-float-playground build`.
- [ ] Keep module internals private: never export functions, interfaces, types, constants, or variables that are only used within their defining module and not imported outside of it.
