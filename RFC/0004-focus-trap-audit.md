# RFC 0004: Focus Trap Audit Against focus-trap 8.2.2

- **Start Date**: 2026-09-20
- **Status**: Implemented (fixes landed in this repository, see §8)
- **Target Version**: 0.15.0
- **Relevant Subsystems**: `focus-trap` (`use-focus-trap.ts`, `tabbable.ts`, `focus-guards.ts`, `inert-stack.ts`)

---

## 1. Summary

This document records the original audit of VFloat's `useFocusTrap` against
[focus-trap 8.2.2](https://github.com/focus-trap/focus-trap) (reviewed at
`C:\projects\forks\focus-trap`), conducted **before any code modifications**. It
captures the observed behaviors, the bug and edge-case reports, the limitation
and performance comparison, and the resulting verdict. The fixes that were
subsequently implemented are summarized in §8 for cross-reference; the
observations below are the pre-modification baseline.

The audit concluded: do **not** adopt `focus-trap` as a core dependency. Borrow
its proven concepts and fix VFloat's own implementation, keeping the library
zero-dependency and Vue-native.

---

## 2. Scope and Method

Both implementations were read end to end:

- VFloat: `src/composables/focus-trap/use-focus-trap.ts` (~575 lines),
  `tabbable.ts`, `focus-guards.ts`, `inert-stack.ts`, plus the surrounding
  shared utilities (`shared/dom.ts`, `shared/env.ts`, `shared/elements.ts`,
  `shared/use-event-listener.ts`, `shared/lifecycle.ts`).
- focus-trap 8.2.2: `index.js` (~1,362 lines) and `index.d.ts`, including its
  dependency relationship to `tabbable@6.5`.

Existing test suites on both sides were catalogued to identify coverage gaps:
VFloat's four focus-trap test files versus focus-trap's
`basic`/`isolateSubtrees`/`lifecycleTiming`/`shadowDom` Jest suites plus a real
keyboard (Cypress) suite.

---

## 3. Approach Comparison (as observed)

### 3.1 VFloat's approach

`useFocusTrap(node, options)` is coupled to a `FloatingNode` and its `open`
state. On open it waits a tick, saves the focused element, inserts two guard
spans around the panel, marks outside elements `inert` (or `aria-hidden`), and
focuses the first tabbable child or the panel itself.

While open, containment used four layers:

1. A `keydown` listener **on the floating element** that wrapped Tab between
   first and last tabbable nodes.
2. A `focusout` listener **on the floating element** with a
   `queueMicrotask`-deferred pull-back when focus landed outside the family.
3. Guard `span[tabindex=0][aria-hidden=true]` elements before/after the panel to
   catch Tab at portal boundaries.
4. Outside isolation via `inert`/`aria-hidden` on body children not in the
   floating family.

Non-modal dismissal (close on outside focus or Tab) lived on document-level
`focusin`/`pointerdown` listeners. Escape and outside-click were deliberately
delegated to `useEscapeKey` and `useOutsideClick`.

### 3.2 focus-trap's approach

`createFocusTrap(containers, options)` is a framework-agnostic imperative
factory. Containers accept elements, SVG elements, or selector strings. It
builds cached tabbable groups via the `tabbable` package and refreshes them on
activation, `focusin`, Tab, and DOM mutation. All listeners (focusin, keydown,
mousedown, touchstart, click) attach to the **document** in capture phase. A
global `trapStack` auto-pauses the previous trap on activation and unpauses the
one below on deactivation, with manual `pause()`/`unpause()`. Its option set
includes `fallbackFocus`, `checkCanFocusTrap`/`delayInitialFocus` for animated
mounts, `setReturnFocus`/`checkCanReturnFocus`/`delayReturnFocus`, custom
`isKeyForward`/`isKeyBackward` (enabling arrow-key traps), multi-container
support, `allowOutsideClick`/`clickOutsideDeactivates`/`escapeDeactivates`,
`isolateSubtrees` (`true | 'inert' | 'aria-hidden'`), and `tabbableOptions`.

---

## 4. Original Observations and Bug Reports

### 4.1 Tabbable detection gaps (`tabbable.ts`, pre-fix)

Hand-rolled enumeration based on one `CANDIDATE_SELECTOR` plus
`el.matches()` and `el.tabIndex`:

- **BUG T1** — `area[href]`, `iframe`, `object`, `embed` were not enumerated.
- **BUG T2** — SVG elements never qualified: `isHTMLElement()` fails for them
  and the selector only matches HTML tags.
- **BUG T3** — `tabindex` set as a property (`el.tabIndex = 0`) without the
  attribute was missed by `querySelectorAll("[tabindex]")` and
  `el.matches("[tabindex]")`.
- **BUG T4** — Content of a closed `<details>` (other than its summary) was
  still returned as tabbable.
- **BUG T5** — `:disabled` matching alone did not implement the disabled
  fieldset rule; descendants of a disabled fieldset were handled only as far as
  CSS matching reached, with no first-`<legend>` exemption.
- **BUG T6** — Radio group tabbability was scoped to `radio.form ??
ownerDocument` (document-wide). A checked radio _outside_ the trap with the
  same `name` suppressed the checked/first-radio rule for the group _inside_
  the trap.
- **BUG T7** — The non-`checkVisibility` fallback only inspected the element's
  own `display`/`visibility`; an ancestor with `visibility: hidden` or
  `display: none` leaked through.
- **GAP T8** — `querySelectorAll` does not pierce Shadow DOM; slotted or
  shadow-rooted content was invisible to enumeration (containment checks did
  pierce via `getDomPath()`, so the two systems disagreed).
- **NOTE T9** — Positive `tabindex` sorting relied on stable sort of
  `el.tabIndex`, which is fine in modern engines, but the value source
  (normalized property vs parsed attribute) differed from tabbable's
  normalization for invalid attributes.

### 4.2 Containment mechanics (`use-focus-trap.ts`, pre-fix)

- **BUG C1** — Tab was intercepted **only on the floating element**. If focus
  had already escaped (body, address bar, outside programmatic focus), the
  listener never fired and Tab moved focus outside the modal. focus-trap
  intercepts on the document and wraps even after escape.
- **BUG C2** — Outside focus pull-back was deferred one microtask via
  `focusout` + `queueMicrotask`. Assistive tech could announce the outside
  element for a frame; programmatic `outsideEl.focus()` with no `focusout`
  from the panel was never corrected.
- **BUG C3** — Two independent `modal: true` traps (two dialogs, dialog +
  drawer, separate trees) each ran `isolateOutsideElements` over body children
  with no refcount. The second activation overwrote the first's saved state;
  the first `restore()` stripped `inert` the second still needed. No pause
  stack existed.
- **BUG C4** — `restoreFocus()` permanently added `tabindex="-1"` to a return
  target that was not focusable (e.g. a `div` trigger) and never removed it.
  The floating container fallback had the same permanent mutation.
- **BUG C5** — `previouslyActiveElement` was captured inside the deferred
  `activate()` (after `nextTick`). A synchronous focus move between
  `open = true` and activation saved the wrong "trigger".
- **BUG C6** — The 100 ms `isPointerDownOutside` suppression window (set on
  outside `pointerdown`) also suppressed the modal pull-back if a keyboard user
  Tabbed back inside within the window; nothing cleared the flag on inside
  focus.
- **BUG C7** — `watchPostEffect` re-ran `activate()` when `modal`, `guards`,
  `inert`, or `preventScroll` options changed while open, re-running
  `applyInitialFocus` and stealing focus from wherever the user was working.
- **BUG C8** — `supportsInert` was evaluated once at module load from the
  global `HTMLElement` (`inert-stack.ts`). Inside an iframe realm without
  `inert` the check lied.
- **GAP C9** — No MutationObserver: removal of the focused node depended on the
  `focusout` → body → microtask chain. Reorder/hide without blur could strand
  focus on body.
- **GAP C10** — An empty trap silently focused the panel (auto-adding
  `tabindex`), masking configuration errors; focus-trap throws unless
  `fallbackFocus` is provided.
- **GAP C11** — No `fallbackFocus`-equivalent, no async gate
  (`checkCanFocusTrap`/`delayInitialFocus`) for animated mounts: first `focus()`
  often no-oped during an enter transition with no retry.
- **GAP C12** — Guards carry `aria-hidden="true"` while being focusable, which
  can confuse some screen readers (same pattern as Radix; noted as a known
  tradeoff, kept).
- **NOTE C13** — VFloat correctly ignored Tab during IME composition
  (`isImeComposing`), which focus-trap does not. Kept as a VFloat advantage.
- **NOTE C14** — `deactivate()` sets `open = false`, conflating "stop trapping"
  with "close the surface". No pause-without-close exists. Accepted as a
  deliberate API shape for the FloatingNode model, documented rather than
  changed.

### 4.3 Stack/nesting model

- **BUG S1** — Nesting worked only when child nodes were explicitly parented
  under the trapped node and a single trap owned the tree (verified by the
  existing tree-coordination test). Sibling submenus with their own traps
  double-isolated and double-refocused.
- **GAP S2** — No global trap stack: independent roots could not yield
  Tab/focus routing to the newest modal, and there was no manual
  pause/unpause-without-close.

### 4.4 SSR / realm / performance observations

- **NOTE P1** — VFloat was already the stronger SSR/realm citizen:
  owner-document resolution, owner-window timers, effect-scope cleanup, server
  guards. focus-trap touches `window` at import time and uses bare timeouts,
  requiring client-only instantiation.
- **NOTE P2** — VFloat re-queried tabbables on every Tab/focusout/guard hit and
  ran a per-radio `querySelectorAll`, giving `O(R·N)` worst case for
  radio-heavy forms; focus-trap caches groups and refreshes on
  focus/Tab/mutation. Neither handles very large dialogs without jank.
  VFloat's body-walk isolation wrote more nodes on activate/deactivate than
  focus-trap's sibling marking, but held fewer idle listeners.
- **NOTE P3** — Bundle: VFloat adds nothing beyond Vue and `@floating-ui/dom`;
  adopting focus-trap would have added roughly half of VFloat's entire
  min+gzip size (~14.7 kB at audit time) for one composable, contradicting the
  "pay only for what you use" principle.

---

## 5. Limitation Comparison (as recorded)

VFloat pre-fix: single-tree focus coordination only; no
SVG/iframe/property-tabindex enumeration; no shadow DOM enumeration; no async
mount handling; `aria-hidden` fallback does not block keyboard focus
(screen-reader-only containment); `deactivate()` closes the node; trigger
tabindex pollution; option toggles refocused unexpectedly.

focus-trap: async `delayInitialFocus`/`delayReturnFocus` can flash;
pre-8.0 lifecycle ordering bugs existed (fixed upstream in 8.0.0/8.2.1);
`clickOutsideDeactivates` vs `allowOutsideClick` precedence confuses consumers;
cached groups can go stale on CSS-only visibility changes; duplicate library
copies fight unless a shared `trapStack` is provided; no guards for
portal-boundary positive-tabindex edges; Safari requires the "Press Tab to
highlight each item" preference for standard tab order (documented upstream).

---

## 6. Adoption Decision

Three options were evaluated:

1. **Wrap focus-trap** behind `useFocusTrap`. Rejected: it would carry two
   sources of truth for stacking and isolation, need watchers just to keep an
   imperative object in sync with reactive options, still require VFloat's own
   non-modal code (focus-trap is modal-oriented), and add a large dependency to
   a library whose whole suite was ~14.7 kB min+gzip. Precedent: Floating UI
   React and Radix own their focus scopes for the same tree/portal/lifecycle
   reasons.
2. **Adopt `tabbable` alone.** Deferred: contained and attractive if enumeration
   keeps biting, but the two functions actually needed (hidden checks, tab index
   normalization) are MIT-licensed and small enough to port.
3. **Fix VFloat's own implementation** (chosen): port the proven concepts, keep
   zero deps and the Vue-native shape.

---

## 7. Nothing else of note

Beyond the items above, nothing in the audit surfaced a concern worth changing:
the shared `useEventListener`/cleanup registry patterns, the escape/outside-click
separation, and the guard styling were sound and consistent with the rest of the
library.

---

## 8. Outcome (post-audit implementation, for cross-reference)

The following fixes were subsequently implemented in this repository, mapped to
the reports above:

| Report | Fix                                                                                     |
| ------ | --------------------------------------------------------------------------------------- |
| C1     | Document-level capture `keydown` Tab wrapping when modal and open                       |
| C2     | Synchronous document `focusin` backstop + shared `pullFocusInside()`                    |
| C3     | New per-document modal trap stack (`focus-trap-stack.ts`) + refcounted `inert-stack.ts` |
| C4     | Temporary-only `tabindex` (panel fallback and return target), removed after use         |
| C5     | Synchronous trigger capture on `open` transition before `nextTick`                      |
| C6     | Inside focus clears the outside-pointer flag                                            |
| C7     | Option toggles re-apply side effects without moving focus (`reapplyIsolation`)          |
| C8     | `inert` support resolved per owner realm (`supportsInertIn`)                            |
| C11    | One-frame retry of initial focus for animated mounts                                    |
| T1     | `iframe` added to candidates                                                            |
| T3     | Attribute-parsed `tabindex` + property-set tabindex honored                             |
| T4     | Closed `details` content excluded (summary kept)                                        |
| T5     | Disabled fieldset walk with first-`<legend>` exemption                                  |
| T6     | Radio groups scoped to trap containers via `data-vfloat-trap-scope`                     |
| T7     | Ancestor-walking visibility fallback                                                    |

Not implemented (deliberate scope cuts, still open):
T2 (SVG), T8 (shadow DOM enumeration), C9 (MutationObserver), C10 (throw on
empty trap), S2 (manual pause/unpause API), and stack-mediated isolation
re-application for sibling traps (the lower modal's panel can remain `inert`
while a sibling-trap modal covers it).
