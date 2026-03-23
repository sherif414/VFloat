---
name: vfloat-doc-writer
description: Write, edit, and review VFloat documentation in docs/api and docs/guide with concrete rules for API references, guides, VitePress syntax, and VFloat-specific examples. Use when creating new API references, guides, tutorials, doc updates, or docs reviews for VFloat.
---

# VFloat Documentation Writer

Use this skill to produce clear, consistent, and friendly VFloat documentation that follows the rules below instead of relying on a vague style label.

## Use This Skill

- Creating or updating files in `docs/api/`
- Creating or updating files in `docs/guide/`
- Reviewing docs for tone, structure, links, and examples
- Aligning docs with source changes in `src/`

## Tone and Voice

VFloat documentation uses a **Conversational and Empathic** tone. Write as if you are a friendly mentor pair-programming with the reader.

- **Use "We" and "Let's":** Never use harsh imperatives ("Install this", "Use `useClick`"). Instead, invite the reader ("Let's install this", "We can use `useClick`"). 
- **Be Empathetic:** Acknowledge that building floating UI and handling DOM positioning is notoriously tricky. Validate the user's pain points before offering the VFloat solution.
- **Narrate the Code:** Don't just drop code blocks on the page. Introduce them conversationally (e.g., "Now that we have our anchor, let's wire up the floating element:").
- **Soften Directives:** Turn commands into helpful suggestions. Instead of "You must manually assign itemsRef", use "We'll want to make sure we manually assign itemsRef, otherwise..."

## Workflow

1. Identify the doc type.
   - API references should stay concise but friendly.
   - Guides should teach a workflow, explain tradeoffs, and hold the reader's hand through the process.
2. Read the relevant source code before writing.
   - Check the composable or utility implementation.
   - Confirm signatures, defaults, edge cases, and naming.
3. Follow the VFloat documentation rules.
   - Apply the conversational tone rules.
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

Use API docs for reference material. They should be technical but maintain a welcoming tone.

Required structure:

````markdown
# functionName

Brief 1-2 sentence friendly description of what this helps us do.

## Type

```ts
function functionName(param: Type): ReturnType
```

## Details

Explain behavior, edge cases, and important notes conversationally.

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

Use guide docs for tutorials and conceptual explanations. They should be highly narrative and empathic.

Recommended structure:

````markdown
# Topic Title

Short, welcoming introduction explaining the problem we are solving and what we'll learn together.

## The Basics

Start with the simplest working example. Emphasize how easy it is to get started.

::: tip
A helpful, friendly note or a small practical tip to make their life easier.
:::

## Deep Dive

Explain the concept progressively. Add edge cases organically.

::: warning Watch out for this gotcha!
A gentle heads-up about common mistakes, caveats, or accessibility concerns.
:::

## Further Reading

- [API Reference](/api/function-name)
- [Related Guide](/guide/related)
````

Guidelines:

- Use VitePress containers such as `::: tip`, `::: warning`, and `::: details`. Give them conversational custom titles when appropriate.
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
- Confirm the tone checks out: Are we using "we/let's"? Is it friendly?
