# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: Vue 3 application developers building anchored floating interfaces (tooltips, popovers, dropdowns, menus, dialogs, cursor-following surfaces) in web apps.

Secondary audiences (design-system authors, open-source contributors) are plausible from the repo but unconfirmed — left undecided.

## Product Purpose

VFloat is a Vue 3 toolkit for positioning and coordinating anchored floating interfaces. It wraps `@floating-ui/dom` positioning (collision detection, flipping, shifting) in Vue Composition API primitives so developers can ship correctly placed, interactive floating UI with minimal bundle cost.

Success means a Vue developer can compose a tooltip, popover, menu, or dialog from small `useX` primitives sharing one floating node, with correct placement, dismissal, focus behavior, and SSR safety.

## Positioning

Vue-native Composition API — not a fork or direct copy of Floating UI. Neighboring products (Floating UI React/DOM wrappers) could not truthfully copy the grouped `refs`/`state` node shape, the separate `usePosition` positioning step, and the `useFloatingNode` / `useFloatingTree` coordination model without becoming VFloat.

## Operating Context

Developers work in Vue 3.5+ `<script setup>` with `useTemplateRef`-bound `anchorEl` / `floatingEl` / `arrowEl`, composing positioning, interaction, and collection primitives through a shared `context` object. Evaluation happens in VitePress docs (https://vfloat.pages.dev), the local `playground/`, and host apps (desktop and mobile touch browsers, SSR/hydration). Docs are built with VitePress and deployed to Cloudflare Pages from a local machine.

## Capabilities and Constraints

Confirmed capabilities: standalone nodes (`useFloatingNode`), related-node coordination (`useFloatingTree`), positioning (`usePosition`, `useArrow`, `useClientPoint`), interactions (`useClick`, `useHover`, `useFocus`, `useFocusTrap`, `useDismiss`, `useRole`), keyboard navigation (`useRovingFocus`, `useAriaActivedescendant`, `useTypeahead`), and positioning middleware (`offset`, `flip`, `shift`, `hide`, `autoPlacement`, `size`, `inline`, `arrow`).

Durable constraints: WIP status — breaking changes land without deprecation windows and production use is not recommended yet; ESM-only `dist` with `peerDependencies` on `vue >= 3.5.0`; core positioning delegated to `@floating-ui/dom`; full suite ~14.7 kB min+gzip; MIT license; modern browsers plus iOS Safari / Chrome Mobile.

Explicitly undecided: API freeze / stable-release criteria; formal browser matrix beyond "modern + mobile"; formal accessibility conformance level.

## Brand Commitments

Name VFloat. Heavily inspired by Floating UI, explicitly not a fork and not a direct API copy — VFloat naming (`useX`, `anchorEl` / `floatingEl` / `arrowEl`, kebab-case reasons) wins over Floating UI terminology. Credits: Floating UI (positioning algorithms). No binding visual identity, logo, palette, or type commitment volunteered — none recorded.

## Evidence on Hand

Real: `README.md`, `docs/index.md` + `docs/guide/` + `docs/api/`, `src/composables/`, `playground/`, live docs at https://vfloat.pages.dev.

Absent and must not be fabricated: testimonials, customers, case studies, press, pricing/licensing claims beyond MIT, performance benchmarks beyond the stated bundle size.

## Product Principles

1. Vue-native first: APIs follow Composition API idioms, not wrapper transliteration.
2. Small composable primitives over monoliths: positioning, interaction, and navigation connect through shared nodes.
3. Correctness under reality: collision, viewport edges, touch, keyboard, and SSR/hydration are core, not edge cases.
4. Pay only for what you use: tree-shakable surface with minimal bundle impact.
5. WIP honesty: break the API while it is wrong rather than locking the wrong shape.

## Accessibility & Inclusion

Keyboard navigation, focus management (initial focus, trapping, guards, return focus), ARIA roles/states, and touch support are in-scope capabilities. No formal conformance target (e.g. WCAG level) has been established — undecided.
