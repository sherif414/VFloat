# Page Patterns

Use this file when choosing the structure for a VFloat docs task. Match the family that already exists nearby instead of forcing one universal template.

## Diátaxis Map

- Tutorial: a guided path from zero to a working result.
- How-to guide: a focused workflow for solving one problem.
- Reference: the exact API contract, defaults, and return shape.
- Explanation: the mental model, tradeoffs, and why the design works the way it does.

For VFloat, `docs/api/` is the reference layer, and `docs/guide/` covers tutorials, how-to guides, and explanations.

## Composable API Page

Use for `useX` pages in `docs/api/`.

Examples:

- `docs/api/use-click.md`
- `docs/api/use-hover.md`
- `docs/api/use-focus-trap.md`

Typical shape:

```markdown
# useThing

Short summary.

## Type

## Details

## Example

## See Also
```

Rules:

- Keep the summary to 1-2 sentences.
- Put exact signatures in a TypeScript block.
- Put defaults, behavior notes, edge cases, and interoperability details in `## Details`.
- Use one small Vue example imported from `v-float`.
- Link to the most relevant guide pages or sibling APIs.

## Middleware API Page

Use for middleware helpers such as `offset`, `flip`, `shift`, `size`, `arrow`, `autoPlacement`, and `hide`.

Examples:

- `docs/api/offset.md`
- `docs/api/flip.md`
- `docs/api/arrow.md`

Current family shape in this repo:

```markdown
# offset

Short summary.

- Type
- Details
- Example
- See also
```

Rules:

- Preserve the current middleware family style when making a targeted edit to one existing page.
- Keep the explanation centered on what the middleware changes and when to pair it with others.
- Use examples that pass `middlewares: [...]`.
- Mention ordering or option interactions when they materially affect behavior.
- If the task is a family-wide cleanup, standardize the whole middleware family together rather than mixing styles page by page.

## Step-By-Step Guide

Use for workflow pages that teach composition or sequencing.

Examples:

- `docs/guide/interactions.md`
- `docs/guide/middleware.md`

Typical shape:

- Short introduction
- `## Step 1`, `## Step 2`, and later steps
- `::: tip` or `::: warning` where they remove real friction
- `## Further Reading`

Rules:

- Teach the smallest working setup first.
- Introduce each code block with one sentence.
- Add complexity gradually.
- Explain why the pattern is chosen, not just the raw calls.
- Link API pages for exact signatures or option details.

## Concept Guide

Use for mental models or focused topics that are not primarily a recipe.

Examples:

- `docs/guide/how-it-works.md`
- `docs/guide/virtual-elements.md`

Typical shape:

- Short framing introduction
- Explanatory sections with narrow headings
- One or two focused examples
- Optional summary or `## Further Reading`

Rules:

- Explain the model first, then show the smallest example that makes it concrete.
- Keep sections narrow and task-oriented.
- Use examples to support the explanation rather than exhaust every option.

## Choosing Between API And Guide

- Use `docs/api/` when the reader needs exact signatures, defaults, options, return values, or precise behavior notes.
- Use `docs/guide/` when the reader needs a workflow, comparison, combination of composables, debugging help, or an accessibility tradeoff.
- When a guide needs exact contract details, link the API page instead of repeating the contract inline.
