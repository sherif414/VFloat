---
name: documentation-writer
description: Write, edit, and review VFloat documentation in docs/api and docs/guide with concrete rules for API references, guides, VitePress syntax, and VFloat-specific examples. Use when creating new API references, guides, tutorials, doc updates, or docs reviews for VFloat.
---

# VFloat Documentation Writer

Use this skill to produce clear, consistent, and friendly VFloat documentation that follows the rules below instead of relying on a vague style label.

## Use This Skill

- Creating or updating files in `docs/api/`
- Creating or updating files in `docs/guide/`
- Reviewing docs for tone, structure, links, and examples
- Aligning docs with source changes in `src/`

## Writing Style

The core identity is **The Friendly Mentor**. The docs should feel like we are sitting next to the developer, pair-programming with them. Floating UI is inherently tricky, so we should acknowledge that friction and show how VFloat makes the work easier.

### The 4 Golden Rules of Tone

- **Use natural inclusive language:** Prefer `we` and `let's` when they sound natural, but do not force them into every sentence.
- **Show empathy:** Validate the reader's struggle before the solution. If a pattern is hard, say so plainly before introducing the fix.
- **Narrate the code:** Never drop a naked code block. Always introduce the snippet with a sentence that explains what we are about to build.
- **Soften directives:** Turn strict warnings into helpful guidance. Use language like `Watch out for this gotcha!` and explain what might happen if we take the wrong path.

### Style Habits

- **Lead with the job to be done:** Start from the reader's task, then explain the smallest useful path.
- **Prefer concise prose:** Use short paragraphs and short sections. If a sentence can be shorter without losing meaning, shorten it.
- **Stay literal with terminology:** Use the project's actual words, such as `positioning library`, `useFloating`, `middlewares`, `open`, and `context`.
- **Avoid filler and hype:** Do not add motivational language, disclaimers, or repeated reassurance.
- **Sound human, not templated:** Use plain words, contractions, and varied sentence openings when they make the text easier to read.
- **Keep the rhythm natural:** Avoid repeating the same sentence pattern across multiple bullets or paragraphs.
- **Explain like a teammate:** Favor direct, conversational phrasing over formal, handbook-style wording.
- **Separate explanation from reference:** Keep exact signatures, defaults, and return values in API pages. In guides, point to the API page instead of restating contracts.
- **Use examples to teach:** Show the smallest runnable example that supports the point, then explain the tradeoff or next step.

## Workflow

1. Identify the doc type.
   - API references should stay concise and technical.
   - Guides should teach a workflow, explain tradeoffs, and stay narrative-first.
2. Read the relevant source code before writing.
   - Check the composable or utility implementation.
   - Confirm signatures, defaults, edge cases, and naming.
3. Follow the VFloat documentation rules.
   - Follow the writing style rules.
   - Prefer examples over long, dry explanations.
   - Introduce complexity gradually so we don't overwhelm the reader.
4. Cross-link instead of duplicating.
   - Link API docs to related guides.
   - Link guides to the relevant API reference.
5. Check formatting before finishing.
   - Use valid VitePress markdown.
   - Keep code blocks language-tagged.
   - Make links and headings consistent with nearby docs.

## Documentation Architecture

Use a two-layer structure for VFloat docs:

- `docs/api/` is the canonical reference layer.
- `docs/guide/` is the learning and decision-making layer.

Rules:

- Keep API and guide responsibilities separate. Do not merge them into one page type.
- Give every public export a single canonical API page.
- Add a guide page only when the topic teaches a workflow, pattern, or tradeoff that is not obvious from the API reference alone.
- For composables such as `useClick`, keep the API page as the reference source of truth and cover usage inside a broader guide such as `Interactions` unless the composable deserves a dedicated teaching page.
- Avoid creating near-duplicate guide and API pages for the same symbol.
- If a guide needs exact option or signature details, link to the API page instead of repeating them.

## API Docs

Use API docs for reference material. They should be brief, scannable, friendly in tone, and canonical.

Required structure:

````markdown
# functionName

Brief 1-2 sentence description of what this does.

## Type

```ts
function functionName(param: Type): ReturnType
```

## Details

Explain behavior, edge cases, and important notes directly.

## Example

```ts
const result = functionName(value)
```

## See Also

- [Related Guide](/guide/related)
- [`relatedApi`](/api/related-api)
````

Rules:

- Use TypeScript signatures instead of parameter tables.
- Keep the focus on what the API does.
- Avoid long background sections or marketing language.
- Keep explanations brief unless edge cases need extra detail.
- Link to a guide when usage context matters more than the raw signature.
- Keep composable API pages short enough to scan quickly, with one canonical example and links to the most relevant guide(s).
- Include workflow notes only when they clarify edge cases, defaults, or interoperability with other composables.

## Guide Docs

Use guide docs for tutorials and conceptual explanations. They should be narrative-first, task-oriented, and guide the reader through the journey.

Recommended structure:

````markdown
# Topic Title

Short introduction explaining the problem being solved and what the reader will learn.

## The Basics

Start with the simplest working example. Keep it minimal and immediately usable.

Before every code block, add a sentence that explains what we are about to do in the snippet.

::: tip
A helpful, practical note that removes friction or clarifies the next step.
:::

## Deep Dive

Explain the concept progressively. Add edge cases organically.

::: warning Watch out for this gotcha!
A direct heads-up about common mistakes, caveats, or accessibility concerns.
:::

## Further Reading

- [API Reference](/api/function-name)
- [Related Guide](/guide/related)
````

Guidelines:

- Use VitePress containers such as `::: tip`, `::: warning`, and `::: details`. Give them descriptive custom titles when appropriate.
- Introduce every code block with a sentence that explains what we are about to do.
- Prefer `<script setup>` examples.
- Keep examples runnable and minimal.
- Use code highlights only when they clarify the point.
- Explain the why and how, not just the API surface.
- Move detailed reference material to API docs instead of repeating it.
- Prefer task-oriented pages over symbol-oriented pages.
- Use guides to teach combinations of composables, accessibility patterns, debugging, and real-world workflows.
- If a composable already has API coverage, a guide should add context, sequencing, or tradeoffs rather than restating the signature.

## VFloat Conventions

- Always use `middlewares` in examples, not `middleware`.
- Import examples from `v-float`.

## Final Checks

- Confirm the doc matches the correct folder and audience.
- Confirm code examples use the right language tags.
- Confirm internal links point to valid VFloat docs paths.
- Confirm the text does not repeat information already covered elsewhere.
- Confirm the tone checks out: Does it sound like a friendly mentor speaking naturally, not a generated checklist?
