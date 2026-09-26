---
name: rfc-writer
description: Write lean, fast-to-read VFloat RFCs in RFC/. Use ONLY when explicitly instructed by the user to write or review a proposal in RFC/. Never read or treat RFC/ as a source of truth for normal development.
---

# VFloat RFC writer

Use this skill to draft quick, high-signal Requests for Comments (RFCs) in [`RFC/`](file:///c:/projects/VFloat/RFC).

An RFC in VFloat is an engineer-to-engineer design note. It is not corporate paperwork. Its only job is to align on the technical approach, show the code, and kill bad ideas before spending days writing PRs.

---

## The zero-maintenance rule

**Once an RFC is committed, never touch it again.**

An RFC is a frozen snapshot of an idea at the moment it was pitched. It is not a living document:

- **Never a source of truth.** RFC files contain discarded ideas, experimental proposals, and abandoned prototypes. Agents must never consult, search, or cite `RFC/` during normal development, bug fixing, or refactoring unless explicitly instructed by the user. The living code in `packages/vue/src/` and docs in `docs/` are the authoritative truth.
- **No post-merge status updates.** Never go back to edit the file to say "accepted", "implemented", or to add commit hashes. Git history already tracks what merged.
- **No backlinking.** If a newer RFC replaces an older one, mention the old RFC in the new file. Never edit the old RFC file.
- **No drift tracking.** As the code evolves in future releases, do not update the RFC.
- **Write once, commit once, forget about it.**

---

## When to write an RFC

- **Write an RFC** for big architectural shifts, brand new subsystems, breaking API changes, or deep audits against external libraries.
- **Skip the RFC** for bug fixes, small refactors, internal helpers, or features that fit existing composables cleanly. Just write the code and tests.
- **Settled architectural constraints** that are already running in production belong in [`ADR/`](file:///c:/projects/VFloat/ADR), not RFCs.

---

## File naming and numbering

Create a single file directly in [`RFC/`](file:///c:/projects/VFloat/RFC):

```
RFC/<0000>-<slug>.md
```

To pick the next number, check the highest number across active files and git history:

```bash
git log --all --name-only -- "RFC/*.md"
```

For example, if `0005` was the last number used, name the next file `RFC/0006-virtual-anchor.md`.

---

## How to write a VFloat RFC

Keep the document lean, skimmable, and code-first. Aim for under 200 lines. A reviewer should grasp the problem and the proposed fix in three minutes.

### Golden rules

1. **Show, do not tell.** Start with a bad code snippet from today, then show the clean code of tomorrow.
2. **Direct Vue 3.5 reactivity.** Composable state uses plain `Ref<boolean>`. Mutate it directly (`node.open.value = false`). Never introduce synthetic event dispatchers or custom event buses unless the DOM forces it.
3. **Zero dependencies.** VFloat is a zero-dependency headless engine. Never propose pulling in an npm package.
4. **Cross-realm and SSR safety.** Anchors and floatings may live in same-origin iframes. Always resolve `ownerDocument` and `defaultView`. Never touch `window` or `document` at module evaluation time.
5. **Kill bad ideas on paper.** Always include a "What we killed" table so rejected ideas stay dead.

---

## Minimal RFC template

Copy this template into `RFC/<0000>-<slug>.md`:

```markdown
# RFC {{NUMBER}}: {{TITLE}}

- **Date**: YYYY-MM-DD
- **Relevant Subsystems**: `use-focus-trap`, `floating-node`, etc.

---

## 1. The problem

What is broken, slow, or frustrating today? Keep it to one or two short paragraphs.

Show the pain point with a quick code snippet:

\`\`\`ts
// What the user has to write today, or how it breaks
\`\`\`

---

## 2. The proposed solution

State the core idea in plain English. What is the mental model?

Show what the consumer code looks like:

\`\`\`vue
<script setup lang="ts">
import { ref } from 'vue';
import { useFloatingNode, usePosition } from 'v-float';

const anchorEl = ref<HTMLElement | null>(null);
const floatingEl = ref<HTMLElement | null>(null);

const node = useFloatingNode({ anchorEl, floatingEl });
usePosition(node);
</script>

<template>
  <button ref="anchorEl">Toggle</button>
  <div v-if="node.open.value" ref="floatingEl">Floating panel</div>
</template>
\`\`\`

---

## 3. What we killed (do not implement)

Ideas considered and dropped, so we do not re-argue them later:

| Discarded concept | Why we dropped it |
| :--- | :--- |
| **Global event bus** | Broke multiple popovers and added global state. |
| **Synthetic action dispatcher** | Unnecessary boilerplate; direct ref mutation is simpler and Vue-native. |

---

## 4. API and types

The exact TypeScript interfaces and function signatures proposed:

\`\`\`ts
export interface ExampleOptions {
  enabled?: boolean;
}

export function useExample(node: FloatingNode, options?: ExampleOptions): void;
\`\`\`

---

## 5. Verification plan

Quick list of tests needed:
- Unit test for edge cases.
- Browser test in Vitest Browser Mode for real DOM and focus behavior.
- SSR check (`pnpm test:ssr`) to ensure no window leaks.
```
