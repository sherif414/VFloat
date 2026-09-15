# Documentation & Theme Guidelines (`docs/`)

This guide applies to all documentation pages, VitePress configuration, and theme components within `docs/`.

---

## Toolchain & Verification

- **Dev Server**: `pnpm docs:dev`
- **Build & SSR Validation**: `pnpm docs:build` (authoritative verification for all `docs/` changes)
- **Preview**: `pnpm docs:preview`
- **Deploy**: `pnpm run docs:deploy`

> [!NOTE]
> `pnpm test` (Vitest) and `pnpm lint` (oxlint) do not validate or type-check `docs/` Vue components or Markdown files. Always run `pnpm docs:build` to ensure zero compilation or SSR hydration errors.

---

## Theme & Showcase Component Architecture

### 1. SSR Compatibility
- VitePress executes components in a Node.js SSR environment during `pnpm docs:build`.
- **Never access browser globals** (`window`, `document`, `navigator`, `HTMLElement`, `localStorage`) in top-level `<script setup>` scope.
- Wrap browser-only initialization inside `onMounted()` or use VitePress's `<ClientOnly>` component when necessary.

### 2. GPU Transform Positioning Architecture
When implementing interactive floating menus, dropdowns, or tooltips inside demo components:
- **Use the Two-Element Wrapper Pattern**:
  1. **Outer Positioning Container**: Receives the hardware-accelerated translation (`usePosition` styles: `transform: translate3d(x, y, 0)`) and sub-frame visibility control (`visibility: isPositioned ? 'visible' : 'hidden'`).
  2. **Inner Animated Element**: Encapsulated in `<Transition>` to handle localized scale and opacity enter/leave animations.
- This prevents CSS transition scale/translate transforms from overriding inline GPU translations and eliminates top-left origin jump glitches.

```html
<Teleport to="body">
  <div
    v-if="isOpen"
    ref="floatingEl"
    class="floating-wrapper"
    :style="[
      position.styles.value,
      { visibility: position.isPositioned.value ? 'visible' : 'hidden' }
    ]"
  >
    <Transition name="pop-scale" appear>
      <div class="menu-content" role="listbox">
        <!-- Menu content -->
      </div>
    </Transition>
  </div>
</Teleport>
```

### 3. UI Design Standards
- Keep demo interfaces minimal, quiet, focused, and non-flashy.
- Avoid bulky control decks, heavy overlays, or unnecessary toggle knobs when subtle, context-aware controls suffice.
- Ensure all interactive elements have visible focus-visible rings and proper ARIA semantics (`aria-expanded`, `aria-haspopup`, `role="listbox"` / `role="menu"`).

---

## Content & Navigation Guidelines

### 1. Source of Truth
- Always check the latest implementation in `src/composables/` and `src/types/` before updating API pages or code examples.
- Do not assume Floating UI API parity; VFloat has distinct APIs and abstractions (e.g., `useFloatingNode`, `usePosition`, `middlewares`).

### 2. Navigation & Sidebar Integrity
- When adding, moving, or renaming markdown files, update:
  1. `docs/.vitepress/config.mts` (sidebar and nav routes).
  2. Relevant section index files (`docs/api/index.md` or `docs/guide/index.md`).

### 3. Code Example Standards
- Use `<script setup lang="ts">` for all Vue examples.
- Import library exports from `v-float` (not relative source paths).
- Destructure `styles` directly from `usePosition(node, ...)`:
  ```vue
  <script setup lang="ts">
  import { ref } from 'vue'
  import { useFloatingNode, usePosition } from 'v-float'

  const anchorEl = ref<HTMLElement | null>(null)
  const floatingEl = ref<HTMLElement | null>(null)
  const node = useFloatingNode({ anchorEl, floatingEl })
  const { styles } = usePosition(node)
  </script>
  ```
- Keep examples concise, complete, and runnable.

### 4. Prose & Structure Standards
- Follow the Diátaxis structure referenced in `.agents/skills/documentation-writer/SKILL.md` (Reference for `docs/api/`, Tutorials/How-tos/Explanations for `docs/guide/`).
- Open guides with the reader's concrete friction before introducing abstractions.
