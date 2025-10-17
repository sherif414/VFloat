# Project Context

## Purpose
V-Float is a Vue 3 library of composables for positioning floating UI elements (tooltips, popovers, dropdowns, menus, modals) with precise, reactive behavior. It ports Floating UI capabilities to idiomatic Vue 3 Composition API, adds interaction hooks (hover, focus, click, escape), and supports hierarchical floating trees for nested menus.

## Tech Stack
- Language: TypeScript (~5.7)
- Framework: Vue 3 (^3.5), Composition API
- Positioning: @floating-ui/dom (^1.7)
- Utilities: @vueuse/core (^13.7)
- Build: Vite (^6) in library mode, Rollup under the hood
- Types: vite-plugin-dts for bundled d.ts, path alias `@/* → src/*`
- Styling/Docs: UnoCSS (66.1.0-beta), VitePress (^1.6) + demo plugin
- Testing: Vitest (^3.2) with browser runner (Playwright ^1.55)
- Lint/Format: Biome (2.2) as primary linter/formatter; Prettier present
- Release/Changelog: release-it, changelogen
- Package manager: npm@10.9.2

## Project Conventions

### Code Style
- Use Biome for linting/formatting (`npm run lint` runs `biome check --write`).
- ESM-only (`"type": "module"`), library outputs ESM + UMD.
- TS compiler: `module: ESNext`, `target: ESNext`, `moduleResolution: Bundler`, `lib: [ESNext, DOM]`.
- Path alias: `@` → `./src` in Vite/Vitest/TS.
- Filenames: kebab-case for files (`use-floating-tree.ts`), barrel `index.ts` per directory.
- Public API re-exported via `src/composables/index.ts` and `src/index.ts`.

### Architecture Patterns
- Core positioning via `useFloating()` and tree management via `useFloatingTree()`.
- Interaction composables under `src/composables/interactions/`: `use-hover`, `use-focus`, `use-click`, `use-escape-key`.
- Middleware helpers under `src/composables/middlewares/` and arrow handling via `use-arrow`.
- Context object (`FloatingContext`) exposes `open`, `setOpen`, and `refs.{anchorEl,floatingEl}`.
- Tree-aware behaviors rely on `Tree`/`TreeNode<FloatingContext>` with parent/child relations.
- VirtualElement support for non-DOM anchors (via `contextElement`).

### Testing Strategy
- Vitest configured with browser runner (Playwright, Chromium headless).
- Tests live near code (e.g., `src/composables/__tests__/`).
- Coverage via `@vitest/coverage-v8` (dependency present).

### Git Workflow
- Conventional Commits recommended; release notes generated via `changelogen`.
- Release process managed by `release-it` (`npm run release[:level]`).
- Suggested flow: small feature branches → PR → semantic commit history → release-it.
- Versioning: SemVer; note project is WIP and can include breaking changes without deprecation.

## Domain Context
- Floating elements require collision-aware positioning (offset, flip, shift, hide middleware).
- Interactions determine open/close state based on user input: hover, focus visibility, clicks, escape key.
- Hierarchical menus use `useFloatingTree()` to coordinate parent/child open states.
- Safari/Mac quirks around `:focus-visible` and modality are handled in `useFocus()`.
- Consumers access reactive `floatingStyles` and may provide VirtualElements for cursor/touch positioning.

## Important Constraints
- Library targets modern browsers (ESNext) and Vue 3; `vue` is marked external in bundling.
- ESM-first; consumers should be able to tree-shake unused composables.
- SSR-compatible in principle, but many composables use `window`/`document`; guard usage to client lifecycle.
- Project status: WIP; APIs may change without deprecation periods (see `README.md`).

## External Dependencies
- `@floating-ui/dom` for core positioning middleware.
- `@vueuse/core` for utilities like `useEventListener`.
- Tooling integrations: Vite, VitePress, UnoCSS, Vitest, Playwright, release-it.

