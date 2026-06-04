# Review Checklist

Use this file before finalizing a docs edit or when the task is explicitly a docs review.

## Source Accuracy

- Read the relevant source file in `src/composables/` before claiming behavior.
- Confirm exported names, option names, defaults, and return shapes from code.
- Check tests when behavior or edge cases are not obvious from the implementation alone.
- Compare with adjacent docs pages so the edited page matches the local family and terminology.

## Structure And Audience

- Tutorial: shows the complete working example first, then disassembles it piece by piece. Sections are named after what the code does, not step numbers.
- How-to guide: solves one specific task or workflow.
- Reference page: keeps the contract exact, compact, and scannable.
- Explanation page: explains the mental model, tradeoffs, and why the design exists.
- Intro or overview page: starts from real friction, gives one memorable architecture model, sets boundaries, and routes readers by intent.
- API page: keep the contract canonical, concise, and scannable.
- Middleware API page: preserve the existing family style unless the whole middleware family is being standardized together.
- Guide page: teach a workflow or mental model; do not paste full interfaces that belong on the API page.
- New or renamed page: update `docs/.vitepress/config.mts` and the relevant overview page.

## Tone And Readability

- Prefer a calm, direct, teacherly voice with a clear point of view. The docs should feel like a maintainer explaining the system, not product copy.
- Check that the page argues for the design rather than merely describing it. "That separation is the whole idea" over "VFloat uses separation."
- Keep intros short and useful. Get to the example, concept, or next step quickly.
- Check that guide intros start from a concrete problem, task, or confusion before introducing abstractions.
- Check that concept pages teach a reusable mental model rather than listing pieces.
- Use contrast where it clarifies boundaries: components vs composables, context vs positioning, VFloat concepts vs Floating UI call sites.
- Make responsibility boundaries explicit when relevant: what VFloat handles and what the user's app still owns.
- Explain terms near first use instead of front-loading a large glossary.
- In tutorials, check that the complete working example appears before the disassembly begins.
- In tutorials and concept pages, check for a lifecycle trace that walks through runtime behavior.
- Use plain language, short paragraphs, and concrete wording.
- Cut hype, filler, and corporate-sounding phrasing before finalizing.

## Examples And Markdown

- Import examples from `v-float`.
- Use `middlewares` (plural) when referring to the middleware array or module.
- Prefer `<script setup lang="ts">`.
- Introduce every code block with one sentence.
- Use the correct reactive form for style bindings in the surrounding page family, and fix stale examples when you are already editing the page.
- Add VitePress containers only when they remove friction or call out a real gotcha.
- Keep code block language tags accurate.

## Links And Navigation

- Check every internal docs link.
- Link the first meaningful mention of canonical terms in tutorials and guides to the page that owns them.
- API pages should link to the most relevant guides or sibling APIs.
- Guides should point to API pages for exact contracts.
- Tutorials should link outward to the next step or the owning reference page when the reader needs the exact contract.
- `Where To Go Next` sections should map reader intent to specific pages instead of dumping related links. Each link should say what changes from the current page.
- If the page is new, confirm the sidebar and overview pages mention it.

## Final Validation Loop

1. Re-read the edited page next to the source and adjacent docs.
2. Scan for duplicated contract details between API and guide pages.
3. Run `vp run docs:build`.
4. Fix issues and rerun until the build passes cleanly.
