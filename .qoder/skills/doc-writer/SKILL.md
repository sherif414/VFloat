---
name: vfloat-doc-writer
description: Write, edit, and review VFloat documentation in docs/api and docs/guide with concrete rules for API references, guides, VitePress syntax, and VFloat-specific examples. Use when creating new API references, guides, tutorials, doc updates, or docs reviews for VFloat.
---

# VFloat Documentation Writer

Use this skill to produce clear, consistent VFloat documentation that follows the rules below instead of relying on a vague style label.

## Use This Skill

- Creating or updating files in `docs/api/`
- Creating or updating files in `docs/guide/`
- Reviewing docs for tone, structure, links, and examples
- Aligning docs with source changes in `src/`

## Workflow

1. Identify the doc type.
   - API references should stay concise and technical.
   - Guides should teach a workflow and explain tradeoffs.
2. Read the relevant source code before writing.
   - Check the composable or utility implementation.
   - Confirm signatures, defaults, edge cases, and naming.
3. Follow the VFloat documentation rules.
   - Keep the tone clear, direct, and practical.
   - Prefer examples over long explanations.
   - Introduce complexity gradually.
4. Cross-link instead of duplicating.
   - Link API docs to related guides.
   - Link guides to the relevant API reference.
5. Check formatting before finishing.
   - Use valid VitePress markdown.
   - Keep code blocks language-tagged.
   - Make links and headings consistent with nearby docs.

## API Docs

Use API docs for reference material.

Required structure:

````markdown
# functionName

Brief 1-2 sentence description.

## Type

```ts
function functionName(param: Type): ReturnType
```

## Details

Explain behavior, edge cases, and important notes.

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

## Guide Docs

Use guide docs for tutorials and conceptual explanations.

Recommended structure:

````markdown
# Topic Title

Short introduction explaining what the reader will learn.

## The Basics

Start with the simplest working example.

::: tip
Helpful context or a small practical note.
:::

## Deep Dive

Explain the concept progressively and add edge cases.

::: warning
Call out common mistakes, caveats, or accessibility concerns.
:::

## Further Reading

- [API Reference](/api/function-name)
- [Related Guide](/guide/related)
````

Guidelines:

- Use VitePress containers such as `::: tip`, `::: warning`, and `::: details`.
- Prefer `<script setup>` examples.
- Keep examples runnable and minimal.
- Use code highlights only when they clarify the point.
- Explain the why and how, not just the API surface.
- Move detailed reference material to API docs instead of repeating it.

## VFloat Conventions

- Always use `middlewares` in examples, not `middleware`.
- Use `setOpen(open: boolean, reason?: string, event?: Event)` and mention `reason` when relevant.
- Use `ref<T | null>(null)` for template refs.
- Import examples from `v-float`.
- Keep docs aligned with the rewrite identity of VFloat. Do not describe it as a Floating UI fork.

## Final Checks

- Confirm the doc matches the correct folder and audience.
- Confirm code examples use the right language tags.
- Confirm internal links point to valid VFloat docs paths.
- Confirm the text does not repeat information already covered elsewhere.
