# Documentation & Theme Guidelines (`docs/`)

This guide applies to all documentation pages, Docus/Nuxt configuration, and theme components within `docs/`.

---

## Toolchain & Verification

- **Dev Server**: `pnpm docs:dev`
- **Build & Static Generation**: `pnpm docs:build` (authoritative verification for all `docs/` changes)
- **Preview**: `pnpm docs:preview`
- **Deploy**: `pnpm run docs:deploy`
- **Lint**: `pnpm docs:lint`
- **Fix Lint & Format**: `pnpm docs:lint:fix`
- **Format**: `pnpm docs:format`

> [!NOTE]
> `pnpm test` (Vitest) and `pnpm lint` (oxlint) target library source files (`src/`). For documentation files (`docs/`), use `pnpm docs:lint` and `pnpm docs:format`. Always run `pnpm docs:build` to ensure zero compilation or SSR hydration errors.

---

## Theme & Showcase Component Architecture

### 1. SSR Compatibility

- Docus/Nuxt executes components in a Node.js SSR environment during `pnpm docs:build`.
- **Never access browser globals** (`window`, `document`, `navigator`, `HTMLElement`, `localStorage`) in top-level `<script setup>` scope.
- Wrap browser-only initialization inside `onMounted()` or use Nuxt's `<ClientOnly>` component when necessary.

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

- Docus uses directory-based routing and auto-generated navigation from `docs/content/`.
- Top-level folders:
  - `docs/content/1.guide/` (`.navigation.yml`: `title: Guide`, `icon: i-lucide-book-open`)
  - `docs/content/2.api/` (`.navigation.yml`: `title: API Reference`, `icon: i-lucide-code-xml`)
- Subcategories use numbered directories (e.g., `1.getting-started/`, `2.core-concepts/`, `1.overview/`, `2.core/`) with `.navigation.yml` to define titles and order.
- When adding or moving markdown files:
  1. Place them in the appropriate category subfolder in `docs/content/`.
  2. If preserving a legacy flat route, add the corresponding redirect to `routeRules` in `docs/nuxt.config.ts`.
  3. Update section index pages (`docs/content/1.guide/1.getting-started/1.index.md` or `docs/content/2.api/1.overview/1.index.md`) if relevant.

### 3. Code Example & Component Standards

- Use `<script setup lang="ts">` for all Vue examples.
- Import library exports from `v-float` (not relative source paths).
- Standard usage relies on automatic style application (`applyStyles: true` by default for `usePosition` and `useArrow`):
  ```vue
  <script setup lang="ts">
  import { ref } from "vue";
  import { useFloatingNode, usePosition } from "v-float";

  const anchorEl = ref<HTMLElement | null>(null);
  const floatingEl = ref<HTMLElement | null>(null);
  const node = useFloatingNode({ anchorEl, floatingEl });
  usePosition(node);
  </script>
  ```
- Keep examples concise, complete, and runnable.
- Interactive demo components reside in `docs/components/content/` and can be invoked directly in markdown using MDC syntax.

### 4. Prose & Structure Standards

- Follow the Diátaxis structure referenced in `.agents/skills/documentation-writer/SKILL.md` (Reference for `docs/content/2.api/`, Tutorials/How-tos/Explanations for `docs/content/1.guide/`).
- Open guides with the reader's concrete friction before introducing abstractions.
- Use Docus callout syntax (`::note`, `::tip`, `::warning`, `::caution`) instead of unsupported custom container tags.
