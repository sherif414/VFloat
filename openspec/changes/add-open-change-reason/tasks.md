# Tasks: add-open-change-reason

Order of execution favors minimal, verifiable increments. Each step should be committed with tests when possible.

1) Types and API surface
- [x] Add `OpenChangeReason` to `src/types.ts` with the initial union listed in the spec.
- [x] Update `FloatingContext.setOpen` signature in `src/composables/use-floating.ts` to `(open: boolean, reason?: OpenChangeReason, event?: Event) => void` (back-compat preserved).
- [x] Add `onOpenChange?: (open: boolean, reason: OpenChangeReason, event?: Event) => void` to `useFloating` options. Invoke it whenever `setOpen` changes state.
- [x] Default reason to `"programmatic"` if none provided by callers.

2) Interaction composables: pass reasons
- [x] `use-click.ts`: pass `"anchor-click"` for anchor activations; `"keyboard-activate"` when distinguishing Enter/Space; pass `"outside-pointer"` for outside interactions; include the triggering event.
- [x] `use-focus.ts`: pass `"focus"` on open via focus; `"blur"` on close via focus transitions; include `FocusEvent` where available.
- [x] `use-hover.ts`: pass `"hover"` for opens/closes; include the pointer event.
- [x] `use-escape-key.ts`: pass `"escape-key"` on dismissal.
- [x] Tree coordination (if applicable where closing ancestors/descendants): use `"tree-ancestor-close"` when a parent explicitly closes a descendant.

3) Tests
- [x] Update or add tests under `src/composables/__tests__/` to assert `onOpenChange` receives expected reasons and events for each interaction scenario.
- [x] Add regression tests to ensure old `(open: boolean)` calls still work without errors and default to `"programmatic"`.

4) Docs
- [ ] Update `README.md` to document `onOpenChange` and the reasons table briefly, with examples.
- [ ] Add a VitePress docs snippet or playground demo showing a logger of reasons for each interaction.

5) Validation & CI
- [ ] Run `openspec validate add-open-change-reason --strict` and address any warnings.
- [ ] Run `npm run lint && npm run test` and ensure coverage for new scenarios.

6) Release prep
- [ ] Add a changelog entry under "Features": Reasoned open state changes via `onOpenChange` and updated interactions.
- [ ] If any breaking signature changes are introduced inadvertently, call out explicitly; otherwise ensure back-compat.
