# RFC 0006: useClientPoint Reactivity and Lifecycle Hardening

- **Date**: 2026-09-30
- **Relevant Subsystems**: `use-client-point`, `use-position`, `floating-node`

---

## 1. Framing

This RFC is derived from VFloat's own invariants, not from feature parity with `@floating-ui/react`. Upstream is a source of ideas, not a specification.

Three rules constrain everything below:

1. **Vue-first.** State lives in refs and computeds. Vue's `computed` *is* the lazy-measurement primitive; a manual "have I been read yet" flag is a smell. `watchEffect(onCleanup)` replaces imperative effect-plus-cleanup-ref pairs. No closure mutation inside virtual elements.
2. **VFloat-first.** `useClientPoint` is a positioning module that owns `node.refs.anchorEl`. It does not require interaction composables to cooperate, and they are not modified to serve it. It is free to use VFloat-specific capabilities — the composite node hierarchy, `useArrow`, cross-realm geometry — that have no upstream equivalent.
3. **Where VFloat is already ahead, keep it.** `x`, `y`, and `enabled` are `MaybeRefOrGetter`; upstream's are plain non-reactive values. `trackingMode: 'static'` and `trackingAreaEl` are ours. `sanitizeCoordinate` uses `Number.isFinite`, which is strictly better than upstream's `data.x &&` truthiness check that silently skips `x === 0`.
4. **Virtual anchors are upstream's design, not a VFloat workaround.** `ReferenceElement = Element | VirtualElement` is declared by `@floating-ui/dom` and threaded through `computePosition`, `autoUpdate`, `detectOverflow`, and every middleware by design. `AnchorElement = HTMLElement | VirtualElement | null` is therefore correct, and `getAnchorElement` is the correct way to recover a real element for composables that genuinely require one (focus trap's `ownerDocument`, roving focus, `aria-activedescendant`). Do not restructure this.

Scope: correctness, reactivity economy, and lifecycle. Not feature parity.

---

## 2. The problem

Five defects, all internal to `use-client-point.ts` and its interaction with `usePosition`.

1. **Anchor identity churn rebuilds `autoUpdate` on every `pointermove`.** The composable assigns a brand new virtual element each time coordinates change, and `usePosition` watches `anchorEl` identity. Every pointer event tears down and re-registers the entire `autoUpdate` listener set (ancestor traversal, scroll, resize, `ResizeObserver`) plus a `computePosition` call. Cursor-following is the most expensive positioning mode we ship, and it is the one paying full setup cost per frame.

   ```ts
   // Today
   watchEffect(() => {
     const rect = resolveBoundingRect(target, coordinates.value);
     node.refs.anchorEl.value = { getBoundingClientRect: () => rect /* ... */ };
   });

   // use-position.ts:165 — `update()` has exactly two call sites: this watcher
   // and the autoUpdate callback (scroll / resize / ResizeObserver). Nothing else.
   watch([anchorEl, floatingEl /* ... */], () => floatingUIAutoUpdate(anchor, floating, update));
   ```

   **The corollary is the real design problem.** Today the anchor swap *is* the reposition trigger: identity churn is what makes `usePosition` recompute. Stabilize the anchor without addressing this and the panel stops following the cursor entirely — `pointermove` changes no watched dependency, `update()` never runs, `x`/`y` never change. The win is only real if reposition triggers are decoupled from anchor identity.

   This is a watch-dependency defect in `usePosition`, not an architectural one. `anchorEl` is doing double duty as *the reference* and *the reposition signal*.

2. **Eager rect snapshots force layout for nobody.** `resolveBoundingRect` reads `trackingAreaEl.getBoundingClientRect()` and allocates a cross-realm `DOMRect` during the `watchEffect` — not when a consumer asks for geometry. A `pointerdown` on a closed panel pays a synchronous layout flush that nothing reads.

3. **Pen input never follows.** `isMouseLikePointerType(event.pointerType, true)` is strict mouse-only, so stylus users get a frozen panel. The pointer type is also re-read per event instead of latched, so a `mousemove` synthesized without a preceding `pointerdown` is misclassified.

4. **Following freezes mid-transition.** The gate is `node.open.value`, so a mouse-following panel stops dead the instant `open` flips false — visibly stalling while it animates out. Touch must *not* follow during close (it would slide to the dismissal point), but mouse and pen should.

5. **Interactive surfaces chase their own cursor.** No self-hover guard. A cursor-following panel containing buttons or inputs will drag its own anchor as the pointer moves across it.

6. **`getAnchorElement` has three implementations.** `shared/elements.ts:12` is canonical, but `use-role.ts:172` and `hover/polygon/bridge.ts:351` reimplement it inline. A small wart, but it should be one exported helper.

7. **`isVirtualElement` duck-types unsafely.** `shared/dom.ts:114` tests `"contextElement" in el` before any element check, so a real `HTMLElement` carrying a `contextElement` property is misclassified.

---

## 3. The proposed solution

1. **One stable virtual anchor, plus an explicit reposition trigger.** These are a single change and neither works alone.

   *Stable anchor.* Create the object a single time and mutate `contextElement` in place. `usePosition`'s watcher never sees a new identity, so `autoUpdate` attaches once per enable cycle instead of once per frame.

   *Reposition trigger.* With the anchor stable, `autoUpdate` only needs to care about reference *identity*, which no longer changes — so the trigger does not need to flow through the watcher at all. `usePosition` simply publishes its existing `update` alongside the three fields it already writes to `floatingInternals`, and `useClientPoint` calls it.

   ```ts
   // use-position.ts — same idiom as the existing placement / middlewareData writes
   internals.requestUpdate = update;

   // use-client-point.ts — resolved at call time, so composition order is irrelevant
   watch(internalCoordinates, () => floatingInternals.get(node.id)?.requestUpdate?.());
   ```

   No new public surface (`update` is already returned on `FloatingPosition`), no watcher signature change, and no interaction composable touched. `update()` already reads `anchorEl.value` at call time, so it needs no argument. Composition order is safe because the registry lookup happens inside the watcher callback, not at setup.

   Keep the existing "preserve the anchor while open when disabled, clear it on close" contract untouched.

2. **Lazy rect via `computed`.** `getBoundingClientRect()` reads a `computed` at call time. Nothing touches the DOM until a consumer actually measures. This is also why upstream needs an `isAutoUpdateEvent` dirty flag to detect first measurement inside a closure — Vue's `computed` makes that distinction structural, so we never need the flag.

3. **Latch `pointerType` in a ref**, written from `pointerdown` and `pointerenter` only, and switch to non-strict `isMouseLikePointerType` so pen follows alongside mouse.

4. **Gate on liveness, not on `open`.** Follow while `node.open` is true, or — for mouse-like pointers — while `floatingEl` is still mounted. Touch keeps the strict `open` gate.

5. **Self-hover guard through `node.contains()`.** Skip the follow write when the event target is inside this node or any open descendant. The composite hierarchy makes this a one-line check that correctly covers a cursor panel nested in a menu, which a naive `floatingEl.contains()` would miss.

6. **Controlled mode activates on either axis.** The absent axis falls through to the existing `coords.x ?? fallbackX` resolution.

7. **Collapse `getAnchorElement` to one implementation.** Export the canonical helper from `shared/elements.ts` and replace the inline reimplementations in `use-role.ts:172` and `hover/polygon/bridge.ts:351`.

8. **Harden `isVirtualElement`.** Check `isElement(el)` before the `"contextElement" in el` duck-type so a real element carrying that property is not misclassified.

```ts
// Inside useClientPoint — the shape the module converges on.
const pointerType = ref<string | undefined>();
const point = computed<Coordinates>(() =>
  isControlled.value ? { x: externalX.value, y: externalY.value } : internalCoordinates.value,
);

// `contextElement` must stay reactive for autoUpdate's overflow-ancestor
// traversal. Verify a getter satisfies `getOverflowAncestors` before
// committing; a watchEffect that rewrites the field is the fallback.
const virtualAnchor: VirtualElement = {
  get contextElement() { return targetEl.value ?? undefined; },
  getBoundingClientRect: () => resolveRect(point.value),
  getClientRects: () => [resolveRect(point.value)],
};

watchEffect(() => {
  if (!isEnabled.value) return;
  node.refs.anchorEl.value = virtualAnchor;
});

function isFollowLive(): boolean {
  return isMouseLikePointerType(pointerType.value)
    ? Boolean(node.refs.floatingEl.value)
    : node.open.value;
}

function handlePointer(event: PointerEvent): void {
  if (isControlled.value || !isEnabled.value) return;
  if (event.type === 'pointerdown' || event.type === 'pointerenter') {
    pointerType.value = event.pointerType;
  }
  if (node.contains(getTarget(event))) return;
  // ... existing follow / static capture logic
}
```

---

## 4. What we killed (do not implement)

| Discarded concept | Why we dropped it |
| :--- | :--- |
| **Splitting positioning into mutually-exclusive `usePosition` / virtual-anchor peers** | `computePosition`, `autoUpdate`, and every middleware are typed `ReferenceElement = Element \| VirtualElement` (`@floating-ui/dom` `d.ts:313`). The controller must still accept a virtual element wherever it is; moving who constructs it removes nothing. `usePosition` *already* accepts virtual anchors for the documented selection-range pattern, so the proposed boundary does not exist. |
| **A `Reference` discriminated union on the node** | Every consumer would still branch on which arm it holds, which is what `getAnchorElement` already centralizes. Strictly more machinery for the same ambiguity. |
| **Narrowing `AnchorElement` to `HTMLElement \| null`** | `VirtualElement` is upstream's designed extension point, and the virtual-anchors guide teaches hand-rolling one. Removing it is a semver-major that breaks a documented pattern to save an accessor that already exists and is correct. |
| **Rebuilding positioning to drop virtual elements entirely** | Would mean reimplementing `computePosition`, `autoUpdate`, `flip`, `shift`, `arrow`, `size`, `inline`, and `detectOverflow`. Contradicts RFC 0004's stance on `focus-trap`: reuse upstream rather than reimplement a solved problem. |
| **A reactive "reference revision" counter watched by `usePosition`** | Once the anchor is stable, `autoUpdate` only cares about identity and never needs re-attaching, so the trigger does not have to flow through the watcher at all. `requestUpdate` is smaller and has no dead watcher dependency. |
| **Open-event gating** | Matching upstream requires `useHover`, `useClick`, and `useFocus` to record their open event so a positioning module can read it — a positioning module dictating requirements to interaction composables. A cursor panel opened by keyboard anchoring at the last pointer position is defensible, not a defect. |
| **`axis` option** | Genuinely additive and VFloat-justified — against a 0x0 anchor, `useArrow` and `size` are both meaningless. But there is no bug behind it and no user yet. Belongs in its own RFC, not bundled into a correctness pass. |
| **Upstream's `offsetX`/`offsetY` first-tick compensation** | It corrects for `domReference` geometry diverging from the point. VFloat's `trackingAreaEl` is a listener surface and fallback provider — there is no reference whose position the point is correcting for. Porting it would shift the anchor off the cursor. |
| **`isAutoUpdateEvent` dirty flag** | Upstream needs it to detect first measurement inside a closure. Vue's `computed` laziness makes the distinction structural rather than a tracked boolean. |
| **React's `setReactive([])` effect-dependency hack** | An artifact of React's dep array. `watchEffect` re-runs on reactive reads with no ceremony. |
| **`initialRef` / `cleanupListenerRef` imperative bookkeeping** | React needs refs to carry effect-to-effect state. Vue holds it in refs and lets `onCleanup` run teardown. |
| **A writable public `coordinates`** | Creates a second source of truth against `trackingMode: 'static'` capture. Stays a read-only computed. |
| **Porting upstream's `data.x &&` truthiness guard** | Fails at `x === 0`. `Number.isFinite` is already correct here. |

---

## 5. API and types

No public API change except the controlled-mode trigger. `internals.requestUpdate` is an internal-only field, in the same class as the `placement` / `middlewareData` / `middlewareRegistry` fields `usePosition` already writes.

```ts
import type { MaybeRefOrGetter, Ref } from 'vue';
import type { FloatingNode } from '@/composables/floating-node';

export interface UseClientPointOptions {
  enabled?: MaybeRefOrGetter<boolean>;
  trackingAreaEl?: Ref<HTMLElement | null>;
  trackingMode?: TrackingMode;
  /**
   * Explicit x client coordinate. When either `x` or `y` resolves to a finite
   * number the composable enters controlled mode and pointer tracking detaches;
   * the absent axis falls back to the tracking area's origin.
   */
  x?: MaybeRefOrGetter<number | null>;
  y?: MaybeRefOrGetter<number | null>;
}

```ts
export interface UseClientPointReturn {
  coordinates: Readonly<Ref<Coordinates>>;
}

export function useClientPoint(
  node: FloatingNode,
  options?: UseClientPointOptions,
): UseClientPointReturn;

// @internal — added alongside the existing placement / middlewareData fields
export interface FloatingInternals {
  requestUpdate?: () => Promise<void>;
}
```

`Coordinates`, `TrackingMode`, `UseClientPointContext`, and the return shape are unchanged.

### Breaking change

Controlled mode activates on **either** axis rather than both. Callers currently passing a single `x` or `y` and expecting it to be ignored will start seeing controlled positioning. Migrate by passing both coordinates, or by dropping `useClientPoint` in favor of a hand-rolled `VirtualElement` passed as `anchorEl`, which the virtual-anchors guide already documents. `x: NaN` and `x: null` remain inert via `sanitizeCoordinate`.

---

## 6. Verification plan

- **Follows without identity change (the load-bearing test)**: dispatch a burst of `pointermove` events and assert the floating element's `transform` actually changes between events. This is the test that catches a frozen panel. Assert simultaneously that `node.refs.anchorEl.value` is reference-equal across the burst and that `autoUpdate` attaches exactly once.
- **Composition order**: mount `useClientPoint` *before* `usePosition` and confirm reposition still fires, then the reverse order. Guards the lazy `floatingInternals` lookup.
- **Lazy rect**: with the panel closed, dispatch `pointerdown` and assert no `getBoundingClientRect` call on `trackingAreaEl` occurs until `node.refs.anchorEl.value!.getBoundingClientRect()` is invoked.
- **Cross-realm rect**: run the existing suite inside a same-origin iframe and assert `instanceof` holds against the iframe's `DOMRect`.
- **Pen follows**: `pointerType: 'pen'` with `trackingMode: 'follow'` updates coordinates while open.
- **Transition-out follow**: set `open` false while `floatingEl` remains mounted, dispatch `pointermove` with `pointerType: 'mouse'`, assert coordinates still update; assert the opposite for `pointerType: 'touch'`.
- **Self-hover guard**: dispatch `pointermove` with the target inside `floatingEl`, assert coordinates are unchanged. Repeat with the panel nested under an open parent node to cover the `node.contains()` hierarchy path.
- **Controlled mode**: activates on `x` only, on `y` only, on `x: 0`, and stays dormant on `NaN` or `null`.
- **Regression**: the existing `use-client-point.test.ts` suite passes unchanged, especially the `enabled`-while-open anchor-preservation and static-mode trigger-precedence scenarios.
- **`isVirtualElement` regression**: assert a real `HTMLElement` with an own `contextElement` property is still classified as an element, not a virtual anchor.
- **`getAnchorElement` consolidation**: assert `use-role` and the safe-polygon bridge resolve virtual anchors identically to the shared helper (cover the iframe cross-realm case already present in `utils-and-core.test.ts:395`).
- **Validation**: `pnpm lint` plus the targeted specs; add `pnpm run test:ssr` for the cross-realm `DOMRect` path.

---

## 7. Scope note

Touches `use-client-point.ts` and `use-position.ts` for the core fix, plus `use-role.ts`, `hover/polygon/bridge.ts`, and `shared/dom.ts` for the two shared-helper consolidations. `internals.requestUpdate` extends the shared `FloatingInternals` contract but changes no other composable's behavior, so it is an additive internal field rather than a behavioral coupling. No ADR required.

---

## 8. Deferred

- **`axis`** (with `useArrow` and `size` as the motivating use cases) is deferred to a future RFC. Until then the anchor stays 0x0 on both axes.
- **Whether `useClientPoint` should return a `FloatingPosition`** — making it a positioning peer of `usePosition` — was raised and left open. It is a genuine API question, but it is independent of the anchor-identity work above and is not a prerequisite for any of it.