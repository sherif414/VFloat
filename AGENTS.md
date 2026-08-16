# META INFORMANTION ABOUT THE PROJECT

- This project is named VFloat
- It's heavily inspired by Floating UI, however it's not a fork of it.
- Some of the api is similar to Floating UI, however it's not a direct copy. many parts of the api are different, so keep that in mind.

## Commit Messages

- Follow Conventional Commits for all Git commit messages.
- Use lowercase commit types such as `feat`, `fix`, `docs`, `refactor`, `chore`, `test`, `ci`, `build`, `perf`, `style`, and `revert`.
- Keep the header in the form `type(scope)!: description`.
- Treat `0.x` as an unstable pre-1.0 line and use the "infinite minor" pattern for ongoing API evolution.
- Use `fix` for patches, `feat` for new features, and `1.0.0` as the point where breaking changes should become major releases.

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

| Verb      | Meaning                                                                                                                    | Example                                                                      |
| --------- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `create`  | Factory that allocates a new object or closure. Always returns something new.                                              | `createCleanupRegistry()`, `createBranch()`                                  |
| `get`     | Pure accessor that reads an existing value. No side effects, no searching. Includes derivations and lookups with fallback. | `getFloatingInternals()`, `getFirstEnabledDescendantValue()`                 |
| `find`    | Searches a collection. May return `null`.                                                                                  | `findDeepestOpenFloatingContext()`                                           |
| `resolve` | Stateless transformation or normalization of inputs. Maps raw values to derived forms without side effects.                | `resolveKeyboardIntent()`, `resolveInitialFocus()`, `resolveIsolationMode()` |

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

#### Computed Wrappers for Options

When a composable destructures an option and wraps it in a `computed`, use the `*Option` suffix on the destructured value so the computed gets the clean name.

```ts
// Boolean options → computed uses `is*`
const { enabled: enabledOption = true } = options;
const isEnabled = computed(() => toValue(enabledOption));

// Non-boolean options → computed gets the clean name
const { delay: delayOption = 0 } = options;
const delay = computed(() => toValue(delayOption));
```

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

# Package Management and Development Toolchain

This project uses `pnpm` as its package manager alongside **OXC** (`oxlint` and `oxfmt`) for linting and formatting, **Vitest** for testing, and **Vite** for dev server and building.

## pnpm Workflow

- Install dependencies: `pnpm install`
- Run dev server: `pnpm dev`
- Run build: `pnpm build`
- Run linting: `pnpm lint`
- Fix lint & format: `pnpm lint:fix`
- Format code: `pnpm format`
- Check format: `pnpm format:check`
- Run type checking: `pnpm type-check`
- Run tests: `pnpm test`

## Review Checklist for Agents

- [ ] Run `pnpm install` after pulling remote changes and before getting started.
- [ ] Always write targeted regression unit tests whenever fixing a bug, handling an edge case, or addressing an ordering/lifecycle dependency.
- [ ] Add concise code comments explaining _why_ something exists whenever handling edge cases, non-obvious control flow, tradeoffs, or coordination between moving parts.
- [ ] Run `pnpm lint`, `pnpm type-check`, and `pnpm test` to validate changes.
