---
name: documentation-writer
description: Use this skill when creating, updating, reviewing, or syncing VFloat documentation in docs/api or docs/guide, especially after source changes in src/composables/ or when the user asks for VFloat API pages, guides, tutorials, doc fixes, or docs review feedback even if they do not name the docs folders directly.
---

# Documentation Writer

Use this skill to write accurate VFloat docs quickly. Default to problem-first, persuasive prose that teaches VFloat by making the reader understand the shape of the system — not just the steps or API contracts. The voice should be calm, direct, teacherly, and confident in its opinions without sounding like product marketing.

## Default Behavior

- Classify every doc task with Diátaxis first: Tutorial, How-to, Reference, or Explanation.
- Work from source and nearby VFloat docs first.
- Treat `docs/api/` as the canonical contract layer.
- Treat `docs/guide/` as the workflow and decision-making layer.
- In guides and explanations, make the mental model explicit before expanding into details.
- Preserve the nearby page family when making a targeted edit unless the task clearly asks for broader standardization.

## Core Workflow

If this skill is invoked from a `.scratch` issue, read `.agents/workflows/afk-issue-loop.md` first. Update that issue's `Work Log` with documentation scope decisions and `Validation Log` with docs build results.

1. Classify the task.
   - Reference page in `docs/api/`
   - Tutorial, how-to, or explanation in `docs/guide/`
   - Docs review or docs-sync task after code changes
2. Inspect the source of truth.
   - Read the relevant files in `src/composables/` first.
   - Read the matching or neighboring docs pages to preserve local conventions.
   - Confirm exported names, option names, defaults, examples, and edge cases from code or tests before writing.
3. Choose the page family.
   - Read [references/page-patterns.md](references/page-patterns.md).
   - Use the matching family: composable API page, middleware API page, tutorial, how-to guide, or concept guide.
   - If the page type and the page family disagree, fix the page type first.
4. Draft the page.
   - Start from the reader's concrete pain, friction, or decision. Make the reader feel why the page exists before naming the abstraction.
   - Turn the page around one clear mental model, such as the three VFloat layers: context, positioning, and interaction.
   - In tutorials, show the complete working example first, then disassemble it section by section. Readers need the whole picture before the explanation lands.
   - Name sections after what the code does, not after step numbers. Prefer "The Context Ties Everything Together" over "Step 2: Create The Floating Context."
   - Use contrast to define boundaries: what VFloat handles, what the user owns, and what should not be assumed from Floating UI.
   - Argue for the design, don't just describe it. "That three-layer split is the whole idea" is stronger than "VFloat uses three layers."
   - Introduce every code block with one sentence.
   - Prefer `<script setup lang="ts">` examples.
   - Use the smallest runnable example that proves the point.
   - In tutorials and concept pages, include a lifecycle trace when it helps: walk through what happens at runtime step by step (e.g., hover in → open → position → hover out → close).
5. Cross-link instead of duplicating.
   - API pages own signatures, defaults, options, and return values.
   - Guides should teach workflows and tradeoffs, then link the API page for exact contracts.
   - Link the first meaningful mention of a canonical term to its owning page when that helps the reader move forward.
6. Validate before finishing.
   - Read [references/review-checklist.md](references/review-checklist.md).
   - Compare the draft against the source and adjacent docs.
   - Run `vp run docs:build`, fix failures, and rerun until it passes.

## Repo Gotchas

- VFloat is inspired by Floating UI but not a fork. Verify behavior in this repo before reusing wording, defaults, or examples.
- Use project terminology literally: `useFloatingContext`, `usePosition`, `useClick`, `useHover`, `useTree`, `middlewares`, `open`, `context`, and `FloatingContext`.
- Examples should import from `v-float`.
- Use `middlewares` (plural) when referring to the middleware array or the `src/composables/middlewares` module.
- Prefer `<script setup lang="ts">` for Vue examples.
- Destructure `styles` directly from the `usePosition` return value: `const { styles } = usePosition(context, ...)`. Bind `styles` (or `styles.value` in non-template contexts) in examples.
- Do not restate full option interfaces inside guides when the API page already owns that contract.
- Middleware API pages currently use an older family style in this repo. Preserve that family for focused edits unless the task is to standardize the whole family together.
- Link the first useful mention of core VFloat terms in guides and tutorials to their home page, such as `useFloatingContext`, `usePosition`, `useClick`, `useHover`, `useFocus`, `useFocusTrap`, `useEscapeKey`, `useOutsideClick`, `useListNavigation`, `useCollection`, `useTree`, `useClientPoint`, `useRole`, `useArrow`, `offset`, `flip`, `shift`, `size`, `autoPlacement`, `hide`, `arrow`, `safePolygon`, `context`, `middlewares`, `virtual elements`, and `tree coordination`.
- If you add or rename a docs page, update `docs/.vitepress/config.mts` and the relevant overview page such as `docs/api/index.md` or `docs/guide/index.md`.

## Tone

- Aim for the voice of a thoughtful solo maintainer explaining the system clearly: calm, practical, human, and confident.
- Persuade, don't just describe. The docs should make a case for why VFloat is structured this way, not merely report that it is.
- Prefer short sentences, short paragraphs, and plain language over polished or corporate-sounding copy.
- Start with a concrete pain, task, or decision. Make the reader feel why the page exists before naming the abstraction.
- Use sharper declarative sentences when they clarify the model. Example rhythm: "They don't know about positioning. They don't need to."
- Explain through contrast when it helps: components vs composables, context vs positioning, VFloat concepts vs Floating UI call sites. Contrast gives the docs identity without becoming marketing copy.
- Introduce terminology right before the reader needs it. Do not front-load a glossary unless the page genuinely depends on it.
- In tutorials, show the complete working example first, then walk backward through it. Assemble-then-disassemble beats step-by-step assembly because the reader has something concrete to anchor the explanation.
- In concept pages, give the reader a durable frame they can reuse across the library. Avoid merely listing parts.
- In routing sections such as `Where To Go Next`, map reader intent to the next page instead of dumping related links. Each link should say what changes from the current page.
- Use light reassurance when helpful, such as telling the reader not to worry about a detail yet or that a later page will cover it.
- Do not add hype, filler, sales language, or generic advice that is not specific to VFloat.
- Do not sound like product copy, internal marketing, or formal enterprise documentation.

## Style Model

Use `docs/guide/index.md` and `docs/guide/first-tooltip.md` as the current style models for guide and explanation pages.

Good VFloat docs in this style usually:

- Open with the user's real-world friction before introducing VFloat's abstraction.
- Show a complete working example early, then take it apart to explain each piece.
- Make the library's architecture feel simple and inevitable by naming the few pieces that matter.
- Use section names that describe what the code does rather than numbered steps.
- Teach through small examples that prove one point at a time.
- Argue for the design: "That separation is the whole idea" over "VFloat uses separation."
- Use responsibility boundaries explicitly: "VFloat handles this; you still own that."
- Include a lifecycle trace when the page teaches a behavior-driven surface (hover in → open → position → hover out → close).
- Avoid pretending VFloat is Floating UI with renamed exports. Say what transfers conceptually and what does not.
- End by routing readers by intent: first-time path, pattern-specific guide, or API reference for exact contracts.

Do not force this voice onto compact API reference pages. API pages should stay exact, scannable, and restrained, but their summaries and examples can still use the same plain, concrete language.

## Load-On-Demand References

- Read [references/page-patterns.md](references/page-patterns.md) when choosing structure or matching a nearby page family.
- Read [references/review-checklist.md](references/review-checklist.md) before finalizing edits or when the request is a docs review.

## Validation Loop

1. Re-read the relevant source and the edited doc side by side.
2. Check links, headings, VitePress containers, and code block language tags.
3. Run `vp run docs:build`.
4. If build or review fails, fix the doc and repeat the loop.
