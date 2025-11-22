---
trigger: model_decision
description: when writing or refactoring guide documentation
---

---
# This frontmatter is optional; adjust per VitePress config
# title: <Guide Title>
# description: <1–2 sentence summary>
# outline: deep
# aside: true
# lastUpdated: true
# head:
#   - ["meta", { name: "keywords", content: "v-float, vue, floating ui, <topic>" }]
---

# <Guide Title>

A concise 1–2 sentence summary describing WHAT the reader will build/learn.

- **Audience:** <Beginner | Intermediate | Advanced>
- **Prerequisites:** Vue 3.2+, basic Composition API, VitePress familiarity (optional)
- **Estimated time:** <e.g., 10–15 minutes>
- **Works with:** V-Float vX.Y.Z

## Learning Outcomes

- Understand <core concept 1> and <why it matters>
- Implement <feature/interaction> using `useFloating` and related composables
- Apply accessibility and performance best practices to <component>

## TL;DR (Quick Start)

Provide an immediately runnable minimal example. Keep it short; deeper explanations come later.

```vue
<script setup>
import { ref } from 'vue'
import { useFloating, offset, flip, shift } from 'v-float'

const anchorEl = ref<HTMLElement | null>(null)
const floatingEl = ref<HTMLElement | null>(null)

const { floatingStyles, open, setOpen } = useFloating(anchorEl, floatingEl, {
  placement: 'bottom-start',
  middlewares: [offset(6), flip(), shift({ padding: 8 })],
})
</script>

<template>
  <button ref="anchorEl" @click="setOpen(true, 'programmatic')">Open</button>
  <div v-if="open" ref="floatingEl" :style="floatingStyles">Hello</div>
</template>
```

::: tip When to use this guide
Use this when you need <scenario> such as <example>.
:::

## Before You Begin

- Install dependencies: Node 18+, Vue 3.2+
- Add V-Float to your project:

```bash
# pnpm
pnpm add v-float

# npm
npm install v-float
# yarn
yarn add v-float
```

- Verify your environment (framework, bundler, SSR) if relevant.

## Step-by-Step Implementation

Break the build into small, verifiable steps. Each step should:
- Show the minimal code diff
- Explain the rationale
- Note pitfalls and testing hints

### 1) Set up elements and positioning

```vue
<script setup>
import { ref } from 'vue'
import { useFloating } from 'v-float'

const anchorEl = ref<HTMLElement | null>(null)
const floatingEl = ref<HTMLElement | null>(null)

const context = useFloating(anchorEl, floatingEl, {
  placement: 'bottom',
})

const { floatingStyles, open, setOpen, refs } = context
</script>

<template>
  <button ref="anchorEl">Anchor</button>
  <div v-if="open" ref="floatingEl" :style="floatingStyles">Content</div>
</template>
```

### 2) Add interactions

```ts
import { useClick, useHover, useFocus, useEscapeKey } from 'v-float'

useClick(context, { outsideClick: true })
useHover(context, { delay: { open: 100, close: 150 } })
useFocus(context)
useEscapeKey(context, { onEscape: () => context.setOpen(false, 'escape-key') })
```

### 3) Compose middleware

- Prefer `offset()` for spacing
- Use `flip()` + `shift()` for collision handling

```ts
import { offset, flip, shift } from 'v-float'

// In useFloating options
middlewares: [offset(8), flip(), shift({ padding: 8 })]
```

## Explanation & Concepts

- **Positioning model:** placements, strategy, reactivity, updates
- **Interactions model:** centralized `open` with `setOpen(open, reason?, event?)`
- **State flow:** programmatic vs user-driven reasons (e.g., 'anchor-click', 'hover', 'focus', 'escape-key', 'tree-ancestor-close')
- **Tree-aware behavior:** when to adopt `useFloatingTree` and how it cascades close with reasons

## Accessibility

- Keyboard operability (Tab, Shift+Tab, Escape)
- ARIA roles/attributes for the pattern (e.g., `role="menu"`, `aria-haspopup`, `aria-expanded`)
- Focus management and roving tabindex where relevant
- Screen reader expectations

## Performance

- Use `autoUpdate` options wisely; avoid unnecessary watchers
- Prefer CSS transforms (default) for GPU-friendly positioning
- Keep middleware minimal and ordered by cost
- Throttle expensive handlers (pointer move) if needed

## SSR / Hydration Notes (if applicable)

- Guard DOM access during SSR
- Defer measurements to onMounted
- Ensure deterministic IDs if rendering trees

## Mobile & Pointer Considerations

- Use `mouseOnly` for hover on desktop
- Prefer click or long-press on touch
- Consider `useClientPoint` for context menus or cursor-based positioning

## Testing

- Unit: assert `setOpen` calls with reasons
- E2E: validate focus order and escape close
- Snapshot: placement classes and inline styles when stable

## Troubleshooting

- Floating not visible: check `open`, refs are set, z-index
- Wrong placement: verify middleware order and container overflow
- Scroll/resize desync: enable `autoUpdate` or call `update()`

## Variations / Recipes

- Tooltip on hover with delay and safe polygon
- Dropdown with click-outside to close
- Context menu at pointer using `useClientPoint`
- Nested menus using `useFloatingTree`

## Common Pitfalls (and How to Avoid Them)

- Duplicating API docs in guides → link to the authoritative API pages
- Using `middleware` instead of `middlewares`
- Forgetting `reason` for `setOpen` in custom interactions
- Accessing `.value` on objects already returned as refs in templates

## Migration Notes (if relevant)

- From version X → Y: list breaking changes to examples, renamed options, removed props

## See Also

- [`useFloating`](/api/use-floating)
- [`useFloatingTree`](/api/use-floating-tree)
- Interaction APIs: [`useClick`](/api/use-click), [`useHover`](/api/use-hover), [`useFocus`](/api/use-focus), [`useEscapeKey`](/api/use-escape-key), [`useClientPoint`](/api/use-client-point)
- Middleware: [`offset`](/api/offset), [`flip`](/api/flip), [`shift`](/api/shift), [`arrow`](/api/arrow), [`size`](/api/size), [`hide`](/api/hide), [`autoPlacement`](/api/autoplacement)

## Author Checklist (delete before publishing)

- [ ] Has a clear audience, prerequisites, and outcomes
- [ ] Starts with a runnable TL;DR
- [ ] Step-by-step sections are minimal and verifiable
- [ ] Explains concepts without duplicating API docs
- [ ] Includes accessibility and performance considerations
- [ ] Links to relevant API pages instead of restating them
- [ ] Troubleshooting covers likely failures
- [ ] Code uses current API names (e.g., `middlewares`, `setOpen(reason)`)
- [ ] All examples compile under Vue 3 + V-Float
