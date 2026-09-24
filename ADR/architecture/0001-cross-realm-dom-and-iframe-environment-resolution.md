---
status: accepted
date: 2026-09-24
---

# Cross-realm DOM and iframe environment resolution

## Context

VFloat composables interact with DOM nodes that may reside inside same-origin iframes, portals, or detached windows. Initially, VFloat explored a multi-tenant `createStackManager` using `WeakMap<Document, Manager>` to maintain isolated stacks across documents. However, in standard web architectures (Storybook, CMS previews, widgets), iframes execute within their own JavaScript execution realms with isolated heaps and module instances, providing natural runtime isolation without custom WeakMap infrastructure. Furthermore, for cross-document portals within a single bundle, per-document stack segregation introduced failure modes where interactions in the parent window could not dismiss overlays teleported into an iframe.

## Decision

1. Resolve DOM environment targets dynamically from active elements:
   - `ownerDocument = computed(() => element.value?.ownerDocument ?? getDocument())`
   - `ownerWindow = computed(() => ownerDocument.value?.defaultView ?? getWindow())`
2. Never access bare `window` or `document` in DOM interaction composables.
3. Use structural type guards (`nodeType === 1`, `isHTMLElement`, `isElement`) rather than `instanceof HTMLElement` or `instanceof Element` to prevent prototype mismatches across realm boundaries.
4. Execute timers (`setTimeout`, `clearTimeout`) exclusively on the resolved `ownerWindow`.
5. Retire per-document `WeakMap<Document, Manager>` multi-tenant stack isolation. Stacks are scoped to the current JavaScript runtime instance.

## Alternatives considered

- Multi-document `WeakMap<Document, Manager>` stacks: rejected as speculative complexity for already-isolated realms that also broke cross-document portal interactions.
- Hardcoded global `window` and `document`: rejected because components mounted inside iframes fail to capture events or calculate layout offsets.
