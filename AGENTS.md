# META INFORMANTION ABOUT THE PROJECT

- This project is named VFloat
- It's heavily inspired by Floating UI, however it's not a fork of it.
- Some of the api is similar to Floating UI, however it's not a direct copy. many parts of the api are different, so keep that in mind.

## Commit Messages

- All commit messages **MUST** adhere to the Conventional Commits specification defined in [.agents/rules/commit-message.md](.agents/rules/commit-message.md).
- Follow [.agents/rules/commit-message.md](.agents/rules/commit-message.md) as the single source of truth for commit types, scopes, SemVer mapping, and the distinction between user-facing library features (`feat`/`fix`) and maintainer/AI tooling (`chore`).

## Explicit Communication & User Agency

- **No Silent Changes**: Never make silent, unrequested modifications to files, configurations, or working state (e.g., altering user-authored configs during a commit request, refactoring code outside the prompt scope).
- **Proactive Reporting with User Decision**: When identifying something that appears incorrect, deprecated, suboptimal, or broken:
  1. Clearly raise the observation and context to the user.
  2. Explain why a change might be beneficial (along with any alternatives or tradeoffs).
  3. Leave the final decision to the user before applying any changes.
- **Respect User Intent**: When given a specific task (such as staging/committing a change or running a script), execute the requested action without unilaterally modifying the underlying subject unless explicitly asked.
- **Strict Staging Isolation**: When asked to commit changes, strictly stage only the specific files modified by the agent as part of the active task (`git add <specific-files>`). Never use blanket commands (`git add .` / `git add -A`) or stage pre-existing unstaged/user-authored changes unless explicitly instructed to commit everything.
- **Rollback Scope Boundary**: When asked to revert, reset, or roll back changes, strictly target only the modifications or commits introduced during the active task. Never reset beyond the task boundary or discard user commits without explicit confirmation.

## Naming Conventions

- Follow existing VFloat naming before borrowing Floating UI terminology. Similarity is fine, but VFloat is not a direct copy.
- Public composables use `useX` export names with kebab-case filenames. Example: `useFloatingContext` lives in `use-floating-context.ts`.
- Element refs and variables should use explicit `*El` names. Prefer `anchorEl`, `floatingEl`, and `arrowEl` over generic names like `reference` or `element`.
- The stable public entrypoint is `useFloatingContext(options)` where `options` contains `refs`, optional `state`, and optional `parentContext`. Preserve that call shape unless a change is explicitly requested.
- Grouped floating return data uses the `refs` and `state` vocabulary. Positioning is a separate composable (`usePosition`). New API additions should fit into those groups rather than flattening more fields onto the root.
- Open-change reasons and similar string-literal event names should use kebab-case. Example: `anchor-click`, `outside-pointer`, and `escape-key`.
- Internal implementation files should use descriptive kebab-case nouns with role-oriented suffixes where helpful, such as `*-controller.ts`, `*-registry.ts`, `*-factory.ts`, `*-strategies.ts`, `*-model.ts`, `*-state.ts`, `*-modality.ts`, `geometry.ts`, `bridge.ts`, and `intent.ts`.
- Tests should mirror the source name they cover and use the `.test.ts` suffix.
- Boolean option names should read like flags. Prefer prefixes such as `enabled`, `allow`, `ignore`, `closeOn`, `openOn`, `prevent`, `require`, `return`, and `focus` when they match the behavior.
- When documenting or demoing the floating root, prefer a local variable name like `context` so examples stay consistent with the grouped API shape.

### Internal Naming

Internal naming covers variables, functions, and patterns inside the implementation — everything that isn't part of the public API surface.

#### Guiding Principle: Let Scope Carry Meaning

A name should only encode information that the reader can't already see from the **file** it's in, the **function** it's inside, the **section banner** above it, or the **type signature**. Don't repeat your surroundings. A long name is fine when it adds genuinely new information; a short name is fine when context already tells the story.

One-line test: _"If I removed a word from this name, would the reader still know what it means from context? If yes, remove it."_

#### Verb Vocabulary

Use a fixed set of verbs with non-overlapping meanings. Do not invent synonyms.

**Creation and lookup:**

| Verb      | Meaning                                                                                            | Example                                                                    |
| --------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `create`  | Factory that allocates a new object or closure. Always returns something new.                      | `createCleanupRegistry()`, `createBranch()`                                |
| `get`     | Pure accessor that retrieves an existing value, reference, or internal state.                      | `getFloatingInternals()`, `getElement(idx)`, `getAnchorElement()`          |
| `find`    | Searches a collection. May return `null`.                                                          | `findDeepestOpenFloatingContext()`, `findNextNavigableIndex()`             |
| `resolve` | Stateless calculation, transformation, or mapping derived purely from inputs without hidden state. | `resolveCollectionSize()`, `resolveKeyIntent()`, `resolveNavigableIndex()` |

Do not use `build` or `make`.

**Cleanup and teardown:**

| Verb      | Meaning                                                                                                | Example                                                           |
| --------- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| `clear`   | Zero out a specific piece of state — a timeout, a ref, a flag. Targeted and surgical.                  | `clearTimeout()`, `clearDragResetTimeout()`, `clearBlurTimeout()` |
| `cleanup` | Tear down listeners, watchers, and side effects. Bulk disposal. The "undo all side effects" operation. | `cleanup()`, `cleanupRegistry.cleanup()`                          |
| `reset`   | Return strategy or tracker state to initial conditions. Acceptable on stateful class instances.        | `TrackingStrategy.reset()`                                        |

Do not use `flush` (unclear).

**Mutation:**

| Verb             | Meaning                                          | Example                               |
| ---------------- | ------------------------------------------------ | ------------------------------------- |
| `set`            | Write a complete value (overwrite).              | `setOpen()`, `setFloatingInternals()` |
| `patch`          | Merge a partial value into an existing one.      | `patchFloatingInternals()`            |
| `add` / `remove` | Collection membership — registries, child lists. | `cleanupRegistry.add()`               |

`sync` (coordination between two data sources) and `restore` (inverse of a previous `set`, e.g. DOM attribute rollback) are acceptable as special-purpose verbs.

#### Event Handlers

All internal event handler functions use the `on` prefix. Do not use `handle`.

| Pattern             | When to use                                | Example                                                          |
| ------------------- | ------------------------------------------ | ---------------------------------------------------------------- |
| `on{Event}`         | Only one handler for that event in scope.  | `onFocus`, `onBlur`, `onClick`                                   |
| `on{Target}{Event}` | Same event handled differently per target. | `onAnchorKeyDown`, `onFloatingKeyDown`, `onFloatingPointerEnter` |

Do not encode purpose in the suffix (no `onPointerMoveForRest`, no `onOutsideClickHandler`).

#### Boolean Predicates

| Prefix   | Meaning                                                                                        | Example                                                            |
| -------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `is`     | Primary boolean predicate — functions, computeds, and inline checks.                           | `isEnabled`, `isItemDisabled(value)`, `isExpanded(value)`          |
| `can`    | Capability gate — whether an action is permitted.                                              | `canFocusDisabledItems`                                            |
| `should` | Computed derivation that combines multiple conditions into a single actionable boolean signal. | `shouldCloseOnFocusOut`, `shouldReturnFocus`, `shouldControlPopup` |

#### Timer and Timeout IDs

- Use `camelCase` for acronyms: `timeoutId`, not `timeoutID`.
- Name pattern: `{purpose}TimeoutId`. Always include what the timer is for.
- A bare `timeoutId` is acceptable only when there is exactly one timer in scope.

#### Accepted Abbreviations

Only these abbreviations are permitted. Everything else must be spelled out.

| Abbreviation | Meaning                                   |
| ------------ | ----------------------------------------- |
| `el`         | element                                   |
| `idx`        | index                                     |
| `ref`        | reference (Vue ref)                       |
| `fn`         | function                                  |
| `e`          | event parameter (always `e`, never `evt`) |
| `dx` / `dy`  | delta x / delta y (math convention)       |
| `id`         | identifier                                |

## Type Conventions

- Public composable companion types use `UseXOptions`, `UseXReturn`, and `UseXContext` when those shapes are exposed. Examples: `UseClickOptions`, `UseArrowReturn`, `UseClickContext`.
- Shared root and state types use the `Floating*` prefix. Examples: `FloatingContext`, `FloatingRefs`, `FloatingState`, `FloatingPosition`, `FloatingInternals`, and `FloatingMiddlewareRegistry`.
- Prefer `interface` for object-shaped public contracts and configuration objects. Examples: `UseFloatingContextOptions`, `UseClickContext`, `FloatingPosition`, and `NavigableCollection`.
- Prefer `type` for unions, function signatures, tuples, and simple aliases. Examples: `OpenChangeReason`, `SafePolygonHandler`, `Point`, `AnchorElement`, `FloatingRole`, and `NavigationIntent`.
- Domain-specific aliases should keep the domain noun in the type name. Prefer names like `AnchorElement`, `FloatingElement`, `Coordinates`, `PointerEventData`, `AxisConstraint`, and `TrackingMode` over generic aliases.
- Internal service and protocol types should use explicit role suffixes when applicable, such as `*Controller`, `*Registry`, `*Strategy`, `*Contract`, and `*Registration`. Example: `TrackingStrategy`, `VirtualElementFactoryContract`.

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

## Modern API & Dependency Standards

- **Runtime & Language Baseline:** Target ECMAScript 2024+, TypeScript 5.9+, Node.js 22+, and Vue 3.5+.
- **Native Platform First:** Always prefer built-in Web APIs, standard DOM methods, and modern ECMAScript features over third-party utility packages.
  - Use `structuredClone()` instead of custom cloning libraries (`lodash.clonedeep`, `clone-deep`).
  - Use `crypto.randomUUID()` instead of external UUID libraries (`uuid`, `nanoid`).
  - Use `Object.groupBy()` or `Map.groupBy()` instead of `lodash.groupBy`.
  - Use `Promise.withResolvers()` instead of manual Deferred wrappers.
  - Use `AbortSignal.timeout()` and `AbortController` for timeout and cancellation handling.
  - Use modern Array methods (`Array.prototype.at()`, `findLast()`, `toReversed()`, `toSorted()`, `toSpliced()`).
  - Use `queueMicrotask()` over `Promise.resolve().then(...)` or `setTimeout(..., 0)` when scheduling microtasks.
  - Use native `node:fs/promises`, `node:path`, `node:util` in scripts without extra helper libraries.
- **Modern Vue 3.5+ Reactivity Idioms:**
  - Always use `toValue()` from Vue to unwrap refs, getters, and plain values. Do not use legacy manual unwrappers or deprecated patterns.
  - Use `shallowRef()` for DOM element references (`anchorEl`, `floatingEl`, `arrowEl`) to avoid unnecessary deep reactivity proxying.
  - Use `effectScope()` and `getCurrentScope()` to encapsulate and dispose composable side effects.
  - Use `useTemplateRef()` when binding template element references in Vue components.
  - **Reactivity Economy & Intentionality:** Do not make static initialization seeds, default values, or one-time options reactive. Options that only seed initial/uncontrolled state (e.g., `defaultOpen: boolean`, `defaultIndex: number`, `initialValue: T`) must be plain, non-reactive primitives—not `MaybeRefOrGetter`. Only wrap options in `MaybeRefOrGetter` when they represent dynamic inputs expected to reactively update over the composable's active lifecycle (e.g., `enabled`, `orientation`, `loop`, `rtl`, `scrollIntoView`).
  - **TypeScript Contract Trust (Zero Defensive Boilerplate):** Always trust TypeScript type contracts. Never add defensive runtime fallbacks (`?? []`, `!elements || elements.length === 0`, `if (!elements) return`) when a parameter is typed as a non-nullable container (e.g., `elementsList: MaybeRefOrGetter<Array<HTMLElement | null>>`). Distinguish container nullability from item nullability: in `Array<HTMLElement | null>`, the array itself is guaranteed to exist; only individual element lookups (`list[idx]`) require null guards when accessing DOM nodes (`el?.focus()`, `if (el)`).
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
- Deploy documentation: `pnpm run docs:deploy`

## Review Checklist for Agents

- [ ] Run `pnpm install` after pulling remote changes and before getting started.
- [ ] Always write targeted regression unit tests whenever fixing a bug, handling an edge case, or addressing an ordering/lifecycle dependency.
- [ ] Add concise code comments explaining _why_ something exists whenever handling edge cases, non-obvious control flow, tradeoffs, or coordination between moving parts.
- [ ] Ensure full SSR compatibility: never access bare `window`/`document` or un-guarded `instanceof HTMLElement` in module/setup scopes; use `useId()` for deterministic IDs; prevent singleton memory retention in SSR.
- [ ] Run `pnpm lint`, `pnpm run test:ssr`, and `pnpm test` to validate changes.
