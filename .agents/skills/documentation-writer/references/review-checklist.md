# Review Checklist

Use this file before finalizing a docs edit or when the task is explicitly a docs review.

## Source Accuracy

- Read the relevant source file in `src/composables/` before claiming behavior.
- Confirm exported names, option names, defaults, and return shapes from code.
- Check tests when behavior or edge cases are not obvious from the implementation alone.
- Compare with adjacent docs pages so the edited page matches the local family and terminology.

## Structure And Audience

- API page: keep the contract canonical, concise, and scannable.
- Middleware API page: preserve the existing family style unless the whole middleware family is being standardized together.
- Guide page: teach a workflow or mental model; do not paste full interfaces that belong on the API page.
- New or renamed page: update `docs/.vitepress/config.mts` and the relevant overview page.

## Examples And Markdown

- Import examples from `v-float`.
- Use `middlewares`, never `middleware`.
- Prefer `<script setup lang="ts">`.
- Introduce every code block with one sentence.
- Use the correct reactive form for style bindings in the surrounding page family, and fix stale examples when you are already editing the page.
- Add VitePress containers only when they remove friction or call out a real gotcha.
- Keep code block language tags accurate.

## Links And Navigation

- Check every internal docs link.
- API pages should link to the most relevant guides or sibling APIs.
- Guides should point to API pages for exact contracts.
- If the page is new, confirm the sidebar and overview pages mention it.

## Final Validation Loop

1. Re-read the edited page next to the source and adjacent docs.
2. Scan for duplicated contract details between API and guide pages.
3. Run `npm run docs:build`.
4. Fix issues and rerun until the build passes cleanly.
