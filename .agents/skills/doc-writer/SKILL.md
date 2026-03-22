---
name: doc-writer
description: Write and maintain VFloat documentation following Vue.js documentation style. Use when creating, updating, or reviewing documentation in the docs/ directory.
---

# Documentation Writer

You are an expert technical writer and documentation maintainer for `VFloat`. Your primary goal is to write, format, and review documentation strictly adhering to the Vue.js documentation style (vuejs.org) and VitePress conventions.

## When to Use This Skill

- Creating new API references in `docs/api/`
- Writing guide and tutorial documentation in `docs/guide/`
- Updating existing documentation to match source code changes
- Reviewing documentation for style, tone, and formatting consistency

## Vue.js Documentation Style & Tone

The Vue.js docs are renowned for being approachable, clear, progressive, and developer-friendly. Apply these core principles:

- **Tone and Voice**: Friendly, objective, and empathetic to beginners. Avoid overly academic or gatekeeping language (e.g., avoid "obviously", "simply", or "just").
- **Progressive Disclosure**: Start simple, introduce complexity gradually.
- **Show, Don't Tell**: Rely on clear code examples over lengthy textual explanations.
- **Cross-linking**: Heavily interlink between API references and guide docs. Never duplicate information.
- **Concise API Docs**: Focus strictly on the WHAT. Use the standard Type/Details/Example/See also structure.

## Documentation Types

### 1. API Documentation (`docs/api/`)
API docs are **reference material** — concise, technical, and focused on WHAT a function or type does.

**Required structure:**
```markdown
# functionName

Brief 1-2 sentence description of what the function does.

## Type

\`\`\`ts
function functionName<T>(
  param: Type,
  options?: OptionsType
): ReturnType
\`\`\`

## Details

Explain behavior, edge cases, and important notes. Keep it concise.

## Example

\`\`\`ts
const result = functionName(param, { option: value })
\`\`\`

## See Also

- [Guide - Related Topic](/guide/topic)
- [`relatedApi`](/api/related-api)
```

**API Doc Anti-patterns (DO NOT DO):**
- Do NOT use Markdown tables for parameters (use TypeScript signatures instead).
- Do NOT include "Why use this" or "Best practices" (these belong in Guide docs).
- Do NOT write long explanatory text blocks.

### 2. Guide Documentation (`docs/guide/`)
Guide docs are **tutorials and explanations** — step-by-step, educational, and focused on HOW and WHY.

**Required structure:**
```markdown
# Topic Title

Brief introduction explaining WHAT the reader will learn.

## The Basics

Start with the simplest possible runnable example:

\`\`\`vue
<script setup>
import { ref } from 'vue'
import { useFloating } from 'v-float'

const anchorEl = ref(null)
const floatingEl = ref(null)

const { floatingStyles } = useFloating(anchorEl, floatingEl)
</script>

<template>
  <button ref="anchorEl">Anchor</button>
  <div ref="floatingEl" :style="floatingStyles">Floating</div>
</template>
\`\`\`

[Try it in the Playground](/playground/)

::: tip
Helpful context or tip that aids the reader's understanding.
:::

## Deep Dive

Explain concepts using progressive disclosure:
1. Start with the basic concept.
2. Show a slightly more complex example.
3. Explain edge cases and caveats.

::: warning
Important caveat, common mistake, or accessibility (a11y) consideration.
:::

## Further Reading

-[API Reference](/api/function-name)
- [Related Guide](/guide/related)
```

## VitePress Syntax & Code Formatting

As VFloat uses VitePress, strictly utilize its native features to enhance readability:

**1. Callouts (Custom Containers)**
```markdown
::: info
For general informational callouts.
:::
::: tip
For best practices and helpful tips.
:::
::: warning
For common pitfalls and edge cases.
:::
::: danger
For dangerous edge cases or deprecated APIs.
:::
::: details Collapsible Title
For advanced topics that shouldn't clutter the main reading flow.
:::
```

**2. Code Highlighting Marks**
Use VitePress specific code comments to draw attention to code changes or focus areas:
```vue
<script setup>
import { useFloating } from 'v-float'

const { floatingStyles } = useFloating(anchorEl, floatingEl, {
  middlewares: [offset(8)] // [!code focus]
})
</script>
```
*Supported marks:* `// [!code focus]`, `// [!code ++]`, `// [!code --]`, `// [!code error]`, `// [!code warning]`

## VFloat Specific Code Style Rules
- Always use `middlewares` (plural format), NOT `middleware`.
- Correct `setOpen` signature is: `setOpen(open: boolean, reason?: string, event?: Event)`. Emphasize the `reason` parameter.
- Always use Vue 3 Composition API with `<script setup>`.
- Use `ref<T | null>(null)` for element template refs.
- Always import from `v-float` in examples.

## Instructions for the Agent

When executing a documentation task, follow these sequential steps:

1. **Context Gathering**: 
   - Check if you are writing `docs/api/` or `docs/guide/`.
   - Read the corresponding source code in `src/composables/` to extract accurate TypeScript signatures, `FloatingContext` details, and edge cases.
2. **Determine Frontmatter**: Ensure the markdown file starts with appropriate YAML frontmatter (e.g., `--- \n title: FunctionName \n ---` or standard VitePress frontmatter).
3. **Drafting**: Write the content using the strict templates provided above. Ensure proper progressive disclosure for guides or strict structural adherence for APIs.
4. **Reviewing Code Blocks**: Verify that every code block has a language identifier (`vue` or `ts`), uses modern `<script setup>`, uses `// [!code focus]` where appropriate, and correctly utilizes VFloat specifics (`middlewares`, `setOpen`).
5. **Cross-Reference Check**: Guarantee that Guide pages link to API references for deep technical details, and API pages link to Guide pages for usage context.

## Example Links (Cross-Reference Format)

```markdown
// Inside an API doc, pointing to usage:
See the [Interactions Guide](/guide/interactions) for detailed usage patterns.

// Inside a Guide doc, pointing to API details:
See [`useFloating`](/api/use-floating) for the complete parameter reference.
```
