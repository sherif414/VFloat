---
name: documentation-writer
description: Use this skill when creating, updating, reviewing, or syncing VFloat documentation in docs/api or docs/guide, especially after source changes in src/composables/ or when the user asks for VFloat API pages, guides, tutorials, doc fixes, or docs review feedback even if they do not name the docs folders directly.
---

# Documentation Writer

Use this skill to write accurate VFloat docs quickly. Default to concise, task-first prose with a light teammate-like tone.

## Default Behavior

- Classify every doc task with Diátaxis first: Tutorial, How-to, Reference, or Explanation.
- Work from source and nearby VFloat docs first.
- Treat `docs/api/` as the canonical contract layer.
- Treat `docs/guide/` as the workflow and decision-making layer.
- Preserve the nearby page family when making a targeted edit unless the task clearly asks for broader standardization.

## Core Workflow

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
   - Start from the reader's task.
   - Introduce every code block with one sentence.
   - Prefer `<script setup lang="ts">` examples.
   - Use the smallest runnable example that proves the point.
5. Cross-link instead of duplicating.
   - API pages own signatures, defaults, options, and return values.
   - Guides should teach workflows and tradeoffs, then link the API page for exact contracts.
   - Link the first meaningful mention of a canonical term to its owning page when that helps the reader move forward.
6. Validate before finishing.
   - Read [references/review-checklist.md](references/review-checklist.md).
   - Compare the draft against the source and adjacent docs.
   - Run `npm run docs:build`, fix failures, and rerun until it passes.

## Repo Gotchas

- VFloat is inspired by Floating UI but not a fork. Verify behavior in this repo before reusing wording, defaults, or examples.
- Use project terminology literally: `useFloating`, `middlewares`, `open`, `context`, and `FloatingContext`.
- Examples should import from `v-float`.
- Use `middlewares`, never `middleware`.
- Prefer `<script setup lang="ts">` for Vue examples.
- Bind `context.position.styles.value` in examples unless the surrounding page family is being preserved deliberately during a focused edit.
- Do not restate full option interfaces inside guides when the API page already owns that contract.
- Middleware API pages currently use an older family style in this repo. Preserve that family for focused edits unless the task is to standardize the whole family together.
- Link the first useful mention of core VFloat terms in guides and tutorials to their home page, such as `useFloating`, `useClick`, `useHover`, `useListNavigation`, `useClientPoint`, `useFloatingTree`, `offset`, `flip`, `shift`, `size`, `autoPlacement`, `hide`, `arrow`, `safePolygon`, `context`, `middlewares`, `virtual elements`, and `tree coordination`.
- If you add or rename a docs page, update `docs/.vitepress/config.mts` and the relevant overview page such as `docs/api/index.md` or `docs/guide/index.md`.

## Tone

- Keep the voice light, direct, and teammate-like.
- Prefer short paragraphs and concrete wording.
- Do not add hype, filler, or generic advice that is not specific to VFloat.

## Load-On-Demand References

- Read [references/page-patterns.md](references/page-patterns.md) when choosing structure or matching a nearby page family.
- Read [references/review-checklist.md](references/review-checklist.md) before finalizing edits or when the request is a docs review.

## Validation Loop

1. Re-read the relevant source and the edited doc side by side.
2. Check links, headings, VitePress containers, and code block language tags.
3. Run `npm run docs:build`.
4. If build or review fails, fix the doc and repeat the loop.
