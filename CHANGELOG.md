# Changelog

All notable changes to this project will be documented in this file. See [conventional commits](https://www.conventionalcommits.org/) for commit guidelines.

## v0.12.0

[compare changes](https://github.com/sherif414/VFloat/compare/v0.10.0...v0.12.0)

### 🚀 Enhancements

- **docs:** Install vue vitepress theme ([0c88c31](https://github.com/sherif414/VFloat/commit/0c88c31))
- **skills:** Improve documentation-writer skill ([e06af09](https://github.com/sherif414/VFloat/commit/e06af09))
- **composables:** ⚠️ Adopt grouped floating root ([d5364be](https://github.com/sherif414/VFloat/commit/d5364be))
- ⚠️ Remove legacy floating context api ([3d1c761](https://github.com/sherif414/VFloat/commit/3d1c761))
- **skills:** Add impeccable skill set ([d4f586c](https://github.com/sherif414/VFloat/commit/d4f586c))
- **docs:** Redesign homepage landing page ([f6a9e6f](https://github.com/sherif414/VFloat/commit/f6a9e6f))
- **docs:** Inline home logo svg ([aded56c](https://github.com/sherif414/VFloat/commit/aded56c))
- **interactions:** Add tree-aware floating coordination ([26da7fd](https://github.com/sherif414/VFloat/commit/26da7fd))
- **docs:** Adopt vue theme package ([468722a](https://github.com/sherif414/VFloat/commit/468722a))
- Add comprehensive agent skill definitions and workflows to the project configuration. ([74d2d0c](https://github.com/sherif414/VFloat/commit/74d2d0c))
- **role:** Add useRole composable for interaction roles ([e61e31b](https://github.com/sherif414/VFloat/commit/e61e31b))
- **tree:** Overhaul tree coordination and list navigation architecture ([7c90e09](https://github.com/sherif414/VFloat/commit/7c90e09))
- Implement tree-coordination logic and standard file structure for list-navigation composables ([18dfa39](https://github.com/sherif414/VFloat/commit/18dfa39))
- Add vfloat-file-structure agent skill to enforce standardized composable layout ([40b4f2e](https://github.com/sherif414/VFloat/commit/40b4f2e))
- Implement useFloating, useArrow, and useFocusTrap composables with comprehensive unit testing and API documentation. ([5954b40](https://github.com/sherif414/VFloat/commit/5954b40))
- Implement tree-aware collection and list navigation with comprehensive documentation ([a2c9108](https://github.com/sherif414/VFloat/commit/a2c9108))
- Implement list navigation composable with keyboard intent resolution ([1a2de99](https://github.com/sherif414/VFloat/commit/1a2de99))
- Implement useListNavigation composable with comprehensive unit tests and remove context documentation ([9d1e244](https://github.com/sherif414/VFloat/commit/9d1e244))
- Add useCollection composable for managing reactive 1D and tree-based list state ([b137297](https://github.com/sherif414/VFloat/commit/b137297))
- **playground:** Add tree navigation dx demo ([a950e4a](https://github.com/sherif414/VFloat/commit/a950e4a))
- **position:** Add semantic middleware options ([6c339f6](https://github.com/sherif414/VFloat/commit/6c339f6))
- **arrow:** Support arrow padding ([d352eec](https://github.com/sherif414/VFloat/commit/d352eec))
- **floating-context:** ⚠️ Group context refs and state ([b2998e2](https://github.com/sherif414/VFloat/commit/b2998e2))
- **context:** Add parent-linked floating contexts ([c637bce](https://github.com/sherif414/VFloat/commit/c637bce))
- **click:** Allow custom predicate for closeOnOutsideClick option ([cab8c3c](https://github.com/sherif414/VFloat/commit/cab8c3c))
- **outside-click:** ⚠️ Extract outside click composable ([4036784](https://github.com/sherif414/VFloat/commit/4036784))
- **client-point:** ⚠️ Rename tracking target option ([ce31489](https://github.com/sherif414/VFloat/commit/ce31489))

### 🩹 Fixes

- **a11y:** Require stable ids for active descendant ([858a5c4](https://github.com/sherif414/VFloat/commit/858a5c4))
- **interactions:** Remove redundant window prefix from setTimeout usage ([b1c4570](https://github.com/sherif414/VFloat/commit/b1c4570))
- **test:** Simplify playwright browser config in vitest setup ([9d33108](https://github.com/sherif414/VFloat/commit/9d33108))
- **interactions:** Share escape composition state ([18d39b2](https://github.com/sherif414/VFloat/commit/18d39b2))
- **interactions:** Respect prevented escape events ([90d10bd](https://github.com/sherif414/VFloat/commit/90d10bd))
- **focus-trap:** Delegate subtree isolation to focus-trap ([d4fb420](https://github.com/sherif414/VFloat/commit/d4fb420))
- Release command ([9292b72](https://github.com/sherif414/VFloat/commit/9292b72))
- **release:** Align workflow with vite-plus ([102d889](https://github.com/sherif414/VFloat/commit/102d889))
- **docs:** Replace navbar icon with github svg ([e2777e1](https://github.com/sherif414/VFloat/commit/e2777e1))
- **lint:** Resolve lint violations ([e6fddcd](https://github.com/sherif414/VFloat/commit/e6fddcd))
- **docs:** Restore docs build ([91a13ff](https://github.com/sherif414/VFloat/commit/91a13ff))
- **use-focus-trap:** Harden trap lifecycle and tests ([fe0ec12](https://github.com/sherif414/VFloat/commit/fe0ec12))
- **use-list-navigation:** Harden navigation behavior ([2da00ab](https://github.com/sherif414/VFloat/commit/2da00ab))
- **use-focus:** Harden focus lifecycle ([9bcd439](https://github.com/sherif414/VFloat/commit/9bcd439))
- **positioning:** Harden use-client-point tracking ([bcff713](https://github.com/sherif414/VFloat/commit/bcff713))
- **list-navigation:** Evaluate allowEscape bounds without relying on loop flag ([6d9cfaf](https://github.com/sherif414/VFloat/commit/6d9cfaf))
- **collection:** Clear stale active value ([5863e3a](https://github.com/sherif414/VFloat/commit/5863e3a))
- **docs:** Align code theme with vue theme ([21d8084](https://github.com/sherif414/VFloat/commit/21d8084))
- **tree:** Scope branch active values and stale lookups ([b6c4a37](https://github.com/sherif414/VFloat/commit/b6c4a37))
- **use-click:** Make closeOnOutsideClick option non-reactive and simplify logic ([87bb9ba](https://github.com/sherif414/VFloat/commit/87bb9ba))
- **docs:** Use import for theme env declarations ([60f86a1](https://github.com/sherif414/VFloat/commit/60f86a1))
- **release:** Generate versioned changelog entries ([4a2c0a4](https://github.com/sherif414/VFloat/commit/4a2c0a4))

### 💅 Refactors

- **use-click:** ⚠️ Decouple from full FloatingContext ([0124cf0](https://github.com/sherif414/VFloat/commit/0124cf0))
- **utils:** Make tree node utilities generic ([b9397b0](https://github.com/sherif414/VFloat/commit/b9397b0))
- **interactions:** Use dedicated context type for escape key composable ([56a1cdb](https://github.com/sherif414/VFloat/commit/56a1cdb))
- **interactions:** Use dedicated context type for focus trap ([1b6cc5f](https://github.com/sherif414/VFloat/commit/1b6cc5f))
- **interactions:** Simplify tree context resolution in useFocus ([3b7c6c1](https://github.com/sherif414/VFloat/commit/3b7c6c1))
- **tree:** Rename treeContext property to node ([cadd7b5](https://github.com/sherif414/VFloat/commit/cadd7b5))
- **utils:** Improve type safety in utility functions ([3781b58](https://github.com/sherif414/VFloat/commit/3781b58))
- **interactions:** Use queueMicrotask for interaction reset ([039f3de](https://github.com/sherif414/VFloat/commit/039f3de))
- **utils:** Migrate containment checks to use event path ([f9d9ffd](https://github.com/sherif414/VFloat/commit/f9d9ffd))
- **interactions:** Clarify interaction state reset timing protection ([ed4229a](https://github.com/sherif414/VFloat/commit/ed4229a))
- **utils:** Use native self-managing listeners for input tracking ([a741679](https://github.com/sherif414/VFloat/commit/a741679))
- **list-navigation:** Manually sync virtual item ref ([8ea6b96](https://github.com/sherif414/VFloat/commit/8ea6b96))
- **list-navigation:** Structure and extract helpers ([2cd912a](https://github.com/sherif414/VFloat/commit/2cd912a))
- Removed code related to tree managment ([4bb59d6](https://github.com/sherif414/VFloat/commit/4bb59d6))
- **interactions:** Extract polygon geometry logic to separate utility ([667c96c](https://github.com/sherif414/VFloat/commit/667c96c))
- **interactions:** Remove unused blockPointerEvents and add types ([7dac41b](https://github.com/sherif414/VFloat/commit/7dac41b))
- **use-floating:** Remove unused id property from FloatingContext ([48f6152](https://github.com/sherif414/VFloat/commit/48f6152))
- **positioning:** Remove unused floating tree composable ([97dbdc9](https://github.com/sherif414/VFloat/commit/97dbdc9))
- Remove tree-aware behavior and related utilities ([c494da1](https://github.com/sherif414/VFloat/commit/c494da1))
- **docs:** Remove deprecated floating tree API and related examples ([25dae50](https://github.com/sherif414/VFloat/commit/25dae50))
- **use-click:** Streamline interaction state management ([c5c73fc](https://github.com/sherif414/VFloat/commit/c5c73fc))
- **docs:** Remove Popover demo and related imports from Home.vue ([88de5f1](https://github.com/sherif414/VFloat/commit/88de5f1))
- **use-click:** Rename outsideClick option to closeOnOutsideClick ([767f723](https://github.com/sherif414/VFloat/commit/767f723))
- **use-click:** Rename outside click api ([6b567bc](https://github.com/sherif414/VFloat/commit/6b567bc))
- **types:** Remove unused tree-ancestor-close reason ([04d4900](https://github.com/sherif414/VFloat/commit/04d4900))
- **playground:** Remove floating tree demos ([63f58e9](https://github.com/sherif414/VFloat/commit/63f58e9))
- **tests:** Remove stale tree hover test ([d371788](https://github.com/sherif414/VFloat/commit/d371788))
- **docs:** Restructure vitepress theme for customization ([a94bab4](https://github.com/sherif414/VFloat/commit/a94bab4))
- **docs:** Rename docs chrome to frame ([9344ec8](https://github.com/sherif414/VFloat/commit/9344ec8))
- **architecture:** Simplify floating context ([a5624e1](https://github.com/sherif414/VFloat/commit/a5624e1))
- **docs:** Consolidate vitepress config ([ccda71b](https://github.com/sherif414/VFloat/commit/ccda71b))
- **docs:** Inline vitepress config objects ([f2aee00](https://github.com/sherif414/VFloat/commit/f2aee00))
- **docs:** Emphasize vitepress config sections ([1f051a3](https://github.com/sherif414/VFloat/commit/1f051a3))
- **docs:** Flatten theme shell and styles ([8c23a04](https://github.com/sherif414/VFloat/commit/8c23a04))
- **docs:** Remove dormant docs shell components ([4d32781](https://github.com/sherif414/VFloat/commit/4d32781))
- **docs:** Trim dead docs css ([799b9e2](https://github.com/sherif414/VFloat/commit/799b9e2))
- **src:** Unify file structure and remove empty sections ([2155530](https://github.com/sherif414/VFloat/commit/2155530))
- **interactions:** ⚠️ Replace monolithic tree architecture with unified collection ([5d8cbce](https://github.com/sherif414/VFloat/commit/5d8cbce))
- **composables:** ⚠️ Reorganize into a flat feature-based structure ([831a6a9](https://github.com/sherif414/VFloat/commit/831a6a9))
- **tree:** ⚠️ Separate pure data layer and align options parameters ([dcd68a9](https://github.com/sherif414/VFloat/commit/dcd68a9))
- **tree:** Stabilize child branches and return explicit cleanup handle ([5165c1e](https://github.com/sherif414/VFloat/commit/5165c1e))
- **tree:** Remove returned cleanup function and update docs and tests ([2732152](https://github.com/sherif414/VFloat/commit/2732152))
- **composables:** ⚠️ Split floating context and position folders ([ee10a6b](https://github.com/sherif414/VFloat/commit/ee10a6b))
- **client-point:** Align hook and helpers with vfloat standards ([0397237](https://github.com/sherif414/VFloat/commit/0397237))
- **client-point:** Remove redundant factory contract ([017a691](https://github.com/sherif414/VFloat/commit/017a691))

### 📖 Documentation

- **api:** Update `useClick` docs for API changes and examples ([a3a3555](https://github.com/sherif414/VFloat/commit/a3a3555))
- Expand api sidebar sections ([dc5372b](https://github.com/sherif414/VFloat/commit/dc5372b))
- **use-click:** Rename outside event option ([65663f4](https://github.com/sherif414/VFloat/commit/65663f4))
- **agents:** Add codex-visible commit message guidance ([fa6eb57](https://github.com/sherif414/VFloat/commit/fa6eb57))
- **skill:** Refine vfloat doc writer rules ([6f6ced4](https://github.com/sherif414/VFloat/commit/6f6ced4))
- **api:** Rewrite useClick doc and localize shiki styles ([a7b8f8d](https://github.com/sherif414/VFloat/commit/a7b8f8d))
- **useClick:** Update documentation for useClick composable ([f2b9b48](https://github.com/sherif414/VFloat/commit/f2b9b48))
- **doc-writer:** Update VFloat documentation guidelines and style rules ([28c162e](https://github.com/sherif414/VFloat/commit/28c162e))
- **api:** Rewrite api docs to match useClick style ([450b59f](https://github.com/sherif414/VFloat/commit/450b59f))
- Rewrite documentation for clarity and conciseness ([09613e2](https://github.com/sherif414/VFloat/commit/09613e2))
- **vfloat-doc-writer:** Update docs and skill guidance ([701adbc](https://github.com/sherif414/VFloat/commit/701adbc))
- **vfloat-doc-writer:** Refine tone guidelines for more natural writing ([28dc75f](https://github.com/sherif414/VFloat/commit/28dc75f))
- **guide:** Reorganize onboarding and recipes ([deadc91](https://github.com/sherif414/VFloat/commit/deadc91))
- **skill:** Refine vfloat doc writer guidance ([756ff00](https://github.com/sherif414/VFloat/commit/756ff00))
- **agents:** Document naming conventions ([68cdd31](https://github.com/sherif414/VFloat/commit/68cdd31))
- **home:** Improve docs home copy ([44f85a1](https://github.com/sherif414/VFloat/commit/44f85a1))
- **vitepress:** Align guide and api layout with stitch designs ([ac9c48c](https://github.com/sherif414/VFloat/commit/ac9c48c))
- **src:** Add inline source documentation ([47f7111](https://github.com/sherif414/VFloat/commit/47f7111))
- **docs:** Fact-check documentation against source ([f91d182](https://github.com/sherif414/VFloat/commit/f91d182))
- **interactions:** Add tree code comments ([3ff1fcc](https://github.com/sherif414/VFloat/commit/3ff1fcc))
- **agents:** Add coding style guidance ([0806700](https://github.com/sherif414/VFloat/commit/0806700))
- **style:** Document public barrels and helpers ([11953eb](https://github.com/sherif414/VFloat/commit/11953eb))
- **interactions:** Add api doc guidance ([6b082cd](https://github.com/sherif414/VFloat/commit/6b082cd))
- **style:** Refine jsdoc comments ([76f2fc7](https://github.com/sherif414/VFloat/commit/76f2fc7))
- **guide:** Rewrite guide learning experience ([ef2fbdb](https://github.com/sherif414/VFloat/commit/ef2fbdb))
- Refactor docs structure ([93cecd4](https://github.com/sherif414/VFloat/commit/93cecd4))
- Removed tests ([6d89392](https://github.com/sherif414/VFloat/commit/6d89392))
- **home:** Refresh docs landing page ([a0d31ac](https://github.com/sherif414/VFloat/commit/a0d31ac))
- **guide:** Refine guide prose and add demo container ([7d4253a](https://github.com/sherif414/VFloat/commit/7d4253a))
- Add agent configuration and guidelines for issue tracking, triage, and domain documentation ([9d809ca](https://github.com/sherif414/VFloat/commit/9d809ca))
- Refresh documentation landing and update guide for tree mechanics ([665bbe3](https://github.com/sherif414/VFloat/commit/665bbe3))
- **spec:** Remove all standalone spec files ([11a2ffd](https://github.com/sherif414/VFloat/commit/11a2ffd))
- **guide:** Introduce guide entry point ([08b47e7](https://github.com/sherif414/VFloat/commit/08b47e7))
- **guide:** Simplify usePosition examples ([2d87798](https://github.com/sherif414/VFloat/commit/2d87798))
- **guide:** Clarify guide mental model ([ba38e31](https://github.com/sherif414/VFloat/commit/ba38e31))
- **docs:** Fact-check docs-wide references ([770722f](https://github.com/sherif414/VFloat/commit/770722f))
- Align AGENTS.md naming and type conventions with codebase ([a6eeef3](https://github.com/sherif414/VFloat/commit/a6eeef3))
- Add issue for safePolygon idle pointer behavior ([8343241](https://github.com/sherif414/VFloat/commit/8343241))
- **use-click:** Update outside-click dismissal default behavior ([5e0068b](https://github.com/sherif414/VFloat/commit/5e0068b))
- **api:** Sync api reference with codebase ([9c21d4f](https://github.com/sherif414/VFloat/commit/9c21d4f))
- **client-point:** Rewrite JSDoc for VirtualElementFactory ([73f6ebd](https://github.com/sherif414/VFloat/commit/73f6ebd))

### 📦 Build

- **vite-plus:** Migrate tooling to vite-plus ([15d4049](https://github.com/sherif414/VFloat/commit/15d4049))
- **repo:** Migrate tooling and redesign docs site ([9dda967](https://github.com/sherif414/VFloat/commit/9dda967))

### 🏡 Chore

- Configure vitest playwright provider via function ([673b8f6](https://github.com/sherif414/VFloat/commit/673b8f6))
- **playground:** Configure focus trap demos to close on outside click ([3151715](https://github.com/sherif414/VFloat/commit/3151715))
- **positioning:** Fix JSDoc indentation in useFloating options ([1f4bbbc](https://github.com/sherif414/VFloat/commit/1f4bbbc))
- Lint ([8099195](https://github.com/sherif414/VFloat/commit/8099195))
- **vscode:** Add biome extension recommendation ([9b726ff](https://github.com/sherif414/VFloat/commit/9b726ff))
- Lint ([0397b4d](https://github.com/sherif414/VFloat/commit/0397b4d))
- Refactor tests ([342b695](https://github.com/sherif414/VFloat/commit/342b695))
- Remove redundant comment in useHover ([4b48211](https://github.com/sherif414/VFloat/commit/4b48211))
- Removed run param from default test command ([50cf892](https://github.com/sherif414/VFloat/commit/50cf892))
- Up-dep ([7a529ec](https://github.com/sherif414/VFloat/commit/7a529ec))
- **gitignore:** Ignore repowiki and playground scratch files ([dabce77](https://github.com/sherif414/VFloat/commit/dabce77))
- **docs:** Remove vue theme integration ([84e73f4](https://github.com/sherif414/VFloat/commit/84e73f4))
- Merged doc-writer skill with vfloat-doc-writer ([7cb6d83](https://github.com/sherif414/VFloat/commit/7cb6d83))
- Add frontend-design skill files ([3a0bdc2](https://github.com/sherif414/VFloat/commit/3a0bdc2))
- Pumb minor ([74bad8e](https://github.com/sherif414/VFloat/commit/74bad8e))
- Removed legacy biome files ([c4f9cb7](https://github.com/sherif414/VFloat/commit/c4f9cb7))
- **vscode:** Update recommended extensions ([4749065](https://github.com/sherif414/VFloat/commit/4749065))
- Removed old frontend design skill ([438875a](https://github.com/sherif414/VFloat/commit/438875a))
- Format code ([8141f18](https://github.com/sherif414/VFloat/commit/8141f18))
- **docs:** Remove unused demo files ([b99f216](https://github.com/sherif414/VFloat/commit/b99f216))
- **vite:** Add formatter config ([a71d8db](https://github.com/sherif414/VFloat/commit/a71d8db))
- Update agent context, rfcs and scratchpad ([6260d30](https://github.com/sherif414/VFloat/commit/6260d30))
- **docs:** Add local Cloudflare deploy script ([48d31dc](https://github.com/sherif414/VFloat/commit/48d31dc))

### ✅ Tests

- **safe-polygon:** Remove internal options check from tests ([e5ca562](https://github.com/sherif414/VFloat/commit/e5ca562))
- **safe-polygon:** Rewrite and expand unit tests for polygon interaction ([8791d6a](https://github.com/sherif414/VFloat/commit/8791d6a))
- **safe-polygon:** Automate test cleanup and improve test stability ([2014f6f](https://github.com/sherif414/VFloat/commit/2014f6f))
- **tests:** Improve cleanup and stability across multiple composables ([294fa59](https://github.com/sherif414/VFloat/commit/294fa59))
- **useClick:** Add element cleanup helper in tests ([956a662](https://github.com/sherif414/VFloat/commit/956a662))
- **useClick:** Add tests for toggle false behavior ([834bf46](https://github.com/sherif414/VFloat/commit/834bf46))
- **use-click:** Refactor tests to reuse outside element creation ([d7f3786](https://github.com/sherif414/VFloat/commit/d7f3786))
- **use-click:** Rename referenceEl to anchorEl for clarity ([efd14ec](https://github.com/sherif414/VFloat/commit/efd14ec))
- **utils:** Cover use event listener ([71f1f8c](https://github.com/sherif414/VFloat/commit/71f1f8c))
- **composables:** Expand tree-aware list navigation coverage ([8e3c888](https://github.com/sherif414/VFloat/commit/8e3c888))
- **list-navigation:** Strengthen coverage for configuration flags ([c15ea5b](https://github.com/sherif414/VFloat/commit/c15ea5b))
- Add unit tests for useListNavigation and configure recommended VS Code extensions ([943dc95](https://github.com/sherif414/VFloat/commit/943dc95))

### 🤖 CI

- **release:** Make publishing local-first ([7797714](https://github.com/sherif414/VFloat/commit/7797714))

#### ⚠️ Breaking Changes

- **composables:** ⚠️ Adopt grouped floating root ([d5364be](https://github.com/sherif414/VFloat/commit/d5364be))
- ⚠️ Remove legacy floating context api ([3d1c761](https://github.com/sherif414/VFloat/commit/3d1c761))
- **floating-context:** ⚠️ Group context refs and state ([b2998e2](https://github.com/sherif414/VFloat/commit/b2998e2))
- **outside-click:** ⚠️ Extract outside click composable ([4036784](https://github.com/sherif414/VFloat/commit/4036784))
- **client-point:** ⚠️ Rename tracking target option ([ce31489](https://github.com/sherif414/VFloat/commit/ce31489))
- **use-click:** ⚠️ Decouple from full FloatingContext ([0124cf0](https://github.com/sherif414/VFloat/commit/0124cf0))
- **interactions:** ⚠️ Replace monolithic tree architecture with unified collection ([5d8cbce](https://github.com/sherif414/VFloat/commit/5d8cbce))
- **composables:** ⚠️ Reorganize into a flat feature-based structure ([831a6a9](https://github.com/sherif414/VFloat/commit/831a6a9))
- **tree:** ⚠️ Separate pure data layer and align options parameters ([dcd68a9](https://github.com/sherif414/VFloat/commit/dcd68a9))
- **composables:** ⚠️ Split floating context and position folders ([ee10a6b](https://github.com/sherif414/VFloat/commit/ee10a6b))

### ❤️ Contributors

- Shareef
- Sherif414

## [0.7.2](https://github.com/sherif414/VFloat/compare/v0.7.1...v0.7.2) (2025-09-29)

### Features

- **middlewares:** export types from floating-ui/dom ([abbc267](https://github.com/sherif414/VFloat/commit/abbc26715cb1e41dde3742c9b75d237b651e76f5))

## [0.7.1](https://github.com/sherif414/VFloat/compare/v0.7.0...v0.7.1) (2025-09-29)

# [0.7.0](https://github.com/sherif414/VFloat/compare/v0.6.1...v0.7.0) (2025-09-27)

### Features

- **middlewares:** added new middlewares ([0f08641](https://github.com/sherif414/VFloat/commit/0f08641c05d4bba47f431f43a4178549d8a94687))

## [0.6.1](https://github.com/sherif414/VFloat/compare/v0.6.0...v0.6.1) (2025-09-27)

# [0.6.0](https://github.com/sherif414/VFloat/compare/v0.5.0...v0.6.0) (2025-09-27)

### Bug Fixes

- **demos:** refine context menu and cursor follow behavior ([2ecd624](https://github.com/sherif414/VFloat/commit/2ecd624d07bee6fe44a53541ba7e16ef14c90f69))
- **docs:** add click handlers to menu items to close popover on selection ([8d006a3](https://github.com/sherif414/VFloat/commit/8d006a304098dfebb2c22a7e423cf5a6d901750b))
- **docs:** close dropdown on item click and Esc key press ([a2f0d2e](https://github.com/sherif414/VFloat/commit/a2f0d2e18669576b00f798c6cbf54a0ec7e9dbc9))
- **interactions:** initialize anchorEl with virtual element on pointer target ([11a542d](https://github.com/sherif414/VFloat/commit/11a542df9fb14d70aff8f014f1a632d7166ea42e))
- **popover:** reduce hover delay time from 200ms to 50ms ([c746604](https://github.com/sherif414/VFloat/commit/c74660471707c27142fa38e4a69c4d4b1ea916ff))
- **useClientPoint:** made both x and y required for externally controlled coords ([e72eff2](https://github.com/sherif414/VFloat/commit/e72eff22a79e579becf45f321dcff31d243f3140))

### Features

- **docs:** add new demos and enhance useClientPoint API docs ([1a799c0](https://github.com/sherif414/VFloat/commit/1a799c0520027b1d5750f7a779b1c905e2a4808a))
- **use-escape-key:** add tree-aware escape key handling and update API ([e66cdef](https://github.com/sherif414/VFloat/commit/e66cdefb5d27eb0ff85cfa354c81678cee374d16))

# [0.5.0](https://github.com/sherif414/VFloat/compare/v0.4.0...v0.5.0) (2025-08-29)

# 0.1.0 (2025-08-29)

### Bug Fixes

- **biome:** update ignore patterns for docs and coverage directories ([3e5e2ea](https://github.com/sherif414/VFloat/commit/3e5e2ea66b29c7c8d6071fb86be769aff5752d5f))
- **composables:** make root node mutable in use-floating-tree ([145cfe6](https://github.com/sherif414/VFloat/commit/145cfe6ae08692d29853a1351ca66926cbb62472))
- **demos:** add type annotations and improve formatting in InteractiveTooltip and ClientPointDemo ([7fd4f5c](https://github.com/sherif414/VFloat/commit/7fd4f5c3b48adcc9575a1bf946d520277f11051f))
- fixed tests ([0600e3f](https://github.com/sherif414/VFloat/commit/0600e3f97a93afa8a3763207f56f9a4b1121e9c7))
- **interactions:** remove unnecessary focus prevention on click ([59e8d0e](https://github.com/sherif414/VFloat/commit/59e8d0ea580866f836d8b9b5fbd671a2cf6d6a67))
- **reactivity:** remove unnecessary newline in isWatchable function ([0aaf8b9](https://github.com/sherif414/VFloat/commit/0aaf8b9f13bcf227350aa6dea8919ce512ca28aa))
- **use-arrow:** Correct arrow positioning logic and offset ([bf1401c](https://github.com/sherif414/VFloat/commit/bf1401cbaa077fafdd32840d684021dd0907a85c))
- **use-click:** improve event target checks and reset state on watch ([d037d88](https://github.com/sherif414/VFloat/commit/d037d887d3dda5f48ec4c9dc6529cd7d9af229c5))
- **use-dismiss:** correct reference to floating element in onClickOutside handler ([8998d16](https://github.com/sherif414/VFloat/commit/8998d16f997f530845b11147e9c18b70478c2a15))

### Features

- add Storybook setup and components for UI development ([ed62f2d](https://github.com/sherif414/VFloat/commit/ed62f2d544b41273cf2634f7c49c4884dedb55ff))
- **api:** add useEscapeKey composable for handling Escape key events ([64d383f](https://github.com/sherif414/VFloat/commit/64d383f4c0c3ab0a8c7c3e76dd2458e0f3f96465))
- **arrow:** auto-register arrow middleware in useArrow composable ([3acc2e8](https://github.com/sherif414/VFloat/commit/3acc2e858019c23968cb7244c30b641d90fe6d3b))
- **composables:** add use-tree composable for reactive tree structure management ([d8fa855](https://github.com/sherif414/VFloat/commit/d8fa85565d63bb86bd1c0f3fe01ff0147f87d63a))
- **config:** add Tailwind CSS and UnoCSS support in Vite configuration ([24a9a6a](https://github.com/sherif414/VFloat/commit/24a9a6a5dd4417870ee92d9988182406e7d38e50))
- **conventions:** add comprehensive project file structure and coding conventions ([d01e6fe](https://github.com/sherif414/VFloat/commit/d01e6fed5988cf9e197e3cb2dc6a85500c54b631))
- **conventions:** add guidelines for reactive state management in Vue ([7c38186](https://github.com/sherif414/VFloat/commit/7c38186680f0d73d5cfa2c1ab4f552d7b6da6b7e))
- **cursorignore:** add .cursorignore file to exclude unnecessary files from version control ([5a36b13](https://github.com/sherif414/VFloat/commit/5a36b13b43d31b158ed7f70787f293a3d980c631))
- **docs:** add custom styles for header anchor visibility ([2dbf5b9](https://github.com/sherif414/VFloat/commit/2dbf5b916600e68f1811574c9cd8c3ff79c9c692))
- **docs:** Integrate UnoCSS and add edit link ([b035e18](https://github.com/sherif414/VFloat/commit/b035e18f945428963e7cff5456f594333b478983))
- Extract `useOutsideClick` ([7930c28](https://github.com/sherif414/VFloat/commit/7930c2861928c4089da6b4e0b9ae743e1199738b))
- **floating:** auto-register arrow middleware in useFloating composable ([510afe1](https://github.com/sherif414/VFloat/commit/510afe18b081083b89fa9c68c285f775e3f0d5c2))
- **hover:** add tree-aware nested floating UI support ([8a94681](https://github.com/sherif414/VFloat/commit/8a946810165e9872a61145bdb1bff03f5421104f))
- **interactions:** add configurable outside click handling for floating elements ([7729273](https://github.com/sherif414/VFloat/commit/7729273083553161307344b575ab4e5268bec671))
- **interactions:** add custom handler for outside click in useOutsideClick ([4c69170](https://github.com/sherif414/VFloat/commit/4c6917064f527ad831cefd3b90c87f291cf90c7a))
- **interactions:** add tree-aware click handling for nested floating elements ([0ee26b0](https://github.com/sherif414/VFloat/commit/0ee26b0addaebdc047b1aa96503517c8ed436420))
- **interactions:** add tree-aware focus handling to useFocus composable ([a5100d1](https://github.com/sherif414/VFloat/commit/a5100d1c2c38cf54c9f728857363b37765a5edcc))
- **memory-bank:** initialize memory bank files for project context tracking ([db996c3](https://github.com/sherif414/VFloat/commit/db996c3356a2c08bfea746b77942421867925662))
- **middlewares:** export additional functions from @floating-ui/dom ([3fb45f2](https://github.com/sherif414/VFloat/commit/3fb45f28c88871b8d4469bf894f94c9a93b88938))
- **reactivity:** add utility function to check if source is watchable ([85ce1d8](https://github.com/sherif414/VFloat/commit/85ce1d890060bb415f3c1262bafdde16bf4008c2))
- **rules:** introduce project rules for file structure and coding conventions ([18e3797](https://github.com/sherif414/VFloat/commit/18e3797178449f78e1a97fe03bf8bfe6030ae779))
- **safePolygon:** add safePolygon feature and documentation ([4518d79](https://github.com/sherif414/VFloat/commit/4518d793b541f60ed74a5f33d044bcb63ef016bc))
- Standardize useClick options ([55bceee](https://github.com/sherif414/VFloat/commit/55bceeeae210f4a9c8a7e1c87dee1634595a933d))
- **tree:** add reactive tree structure composable with node management ([805d6b4](https://github.com/sherif414/VFloat/commit/805d6b469e965401f9d363acb8db29470bc81dd4))
- **tree:** enhance removeNode method to support delete strategies ([b58d666](https://github.com/sherif414/VFloat/commit/b58d6668ac1f99443e19095e9ee9919cdce666c3))
- **tree:** enhance useTree with generic options and add useFloatingNode composable ([165a296](https://github.com/sherif414/VFloat/commit/165a296fc18b2f17db8abd55e911df004db535d0))
- **types:** add Fn type for a no-argument function ([284f4e5](https://github.com/sherif414/VFloat/commit/284f4e572eefcb1418e868c8dbb316a3d6c61c88))
- **use-floating-tree:** add methods to manage tree node visibility ([d12da75](https://github.com/sherif414/VFloat/commit/d12da756ef328c00bfd291150332325e6ebc3059))
- **use-floating:** expand type definitions and enhance documentation ([d4b0979](https://github.com/sherif414/VFloat/commit/d4b0979d2c6c1365b2a01691c29bdb64ef9d777b))
- **use-floating:** support VirtualElement in reference type ([cdc3aa1](https://github.com/sherif414/VFloat/commit/cdc3aa1af288f76bbf4aa8eeb27211e4ec9f67eb))
- **use-hover:** enhance hover functionality with advanced options and improved type definitions ([e589b44](https://github.com/sherif414/VFloat/commit/e589b449b58f9205c327c4259810f0124f1623bb))
- **useClick:** add tree-aware nested menu support and outside click handling ([42bbaf4](https://github.com/sherif414/VFloat/commit/42bbaf42d6a935592b823898bfb439cfdafff5cb))
- **utils:** add new utility isFunction ([c901da3](https://github.com/sherif414/VFloat/commit/c901da3e43ea2d7b1393d2b965751ae329d34180))
- **utils:** add useId function for generating unique IDs ([63864d4](https://github.com/sherif414/VFloat/commit/63864d48d42e17fba37a5b18821819d6dfedd855))

# 0.1.0 (2025-08-29)

### Bug Fixes

- **composables:** make root node mutable in use-floating-tree ([145cfe6](https://github.com/sherif414/VFloat/commit/145cfe6ae08692d29853a1351ca66926cbb62472))
- **demos:** add type annotations and improve formatting in InteractiveTooltip and ClientPointDemo ([7fd4f5c](https://github.com/sherif414/VFloat/commit/7fd4f5c3b48adcc9575a1bf946d520277f11051f))
- fixed tests ([0600e3f](https://github.com/sherif414/VFloat/commit/0600e3f97a93afa8a3763207f56f9a4b1121e9c7))
- **interactions:** remove unnecessary focus prevention on click ([59e8d0e](https://github.com/sherif414/VFloat/commit/59e8d0ea580866f836d8b9b5fbd671a2cf6d6a67))
- **reactivity:** remove unnecessary newline in isWatchable function ([0aaf8b9](https://github.com/sherif414/VFloat/commit/0aaf8b9f13bcf227350aa6dea8919ce512ca28aa))
- **use-arrow:** Correct arrow positioning logic and offset ([bf1401c](https://github.com/sherif414/VFloat/commit/bf1401cbaa077fafdd32840d684021dd0907a85c))
- **use-click:** improve event target checks and reset state on watch ([d037d88](https://github.com/sherif414/VFloat/commit/d037d887d3dda5f48ec4c9dc6529cd7d9af229c5))
- **use-dismiss:** correct reference to floating element in onClickOutside handler ([8998d16](https://github.com/sherif414/VFloat/commit/8998d16f997f530845b11147e9c18b70478c2a15))

### Features

- add Storybook setup and components for UI development ([ed62f2d](https://github.com/sherif414/VFloat/commit/ed62f2d544b41273cf2634f7c49c4884dedb55ff))
- **api:** add useEscapeKey composable for handling Escape key events ([64d383f](https://github.com/sherif414/VFloat/commit/64d383f4c0c3ab0a8c7c3e76dd2458e0f3f96465))
- **arrow:** auto-register arrow middleware in useArrow composable ([3acc2e8](https://github.com/sherif414/VFloat/commit/3acc2e858019c23968cb7244c30b641d90fe6d3b))
- **composables:** add use-tree composable for reactive tree structure management ([d8fa855](https://github.com/sherif414/VFloat/commit/d8fa85565d63bb86bd1c0f3fe01ff0147f87d63a))
- **config:** add Tailwind CSS and UnoCSS support in Vite configuration ([24a9a6a](https://github.com/sherif414/VFloat/commit/24a9a6a5dd4417870ee92d9988182406e7d38e50))
- **conventions:** add comprehensive project file structure and coding conventions ([d01e6fe](https://github.com/sherif414/VFloat/commit/d01e6fed5988cf9e197e3cb2dc6a85500c54b631))
- **conventions:** add guidelines for reactive state management in Vue ([7c38186](https://github.com/sherif414/VFloat/commit/7c38186680f0d73d5cfa2c1ab4f552d7b6da6b7e))
- **cursorignore:** add .cursorignore file to exclude unnecessary files from version control ([5a36b13](https://github.com/sherif414/VFloat/commit/5a36b13b43d31b158ed7f70787f293a3d980c631))
- **docs:** add custom styles for header anchor visibility ([2dbf5b9](https://github.com/sherif414/VFloat/commit/2dbf5b916600e68f1811574c9cd8c3ff79c9c692))
- **docs:** Integrate UnoCSS and add edit link ([b035e18](https://github.com/sherif414/VFloat/commit/b035e18f945428963e7cff5456f594333b478983))
- Extract `useOutsideClick` ([7930c28](https://github.com/sherif414/VFloat/commit/7930c2861928c4089da6b4e0b9ae743e1199738b))
- **floating:** auto-register arrow middleware in useFloating composable ([510afe1](https://github.com/sherif414/VFloat/commit/510afe18b081083b89fa9c68c285f775e3f0d5c2))
- **hover:** add tree-aware nested floating UI support ([8a94681](https://github.com/sherif414/VFloat/commit/8a946810165e9872a61145bdb1bff03f5421104f))
- **interactions:** add configurable outside click handling for floating elements ([7729273](https://github.com/sherif414/VFloat/commit/7729273083553161307344b575ab4e5268bec671))
- **interactions:** add custom handler for outside click in useOutsideClick ([4c69170](https://github.com/sherif414/VFloat/commit/4c6917064f527ad831cefd3b90c87f291cf90c7a))
- **interactions:** add tree-aware click handling for nested floating elements ([0ee26b0](https://github.com/sherif414/VFloat/commit/0ee26b0addaebdc047b1aa96503517c8ed436420))
- **interactions:** add tree-aware focus handling to useFocus composable ([a5100d1](https://github.com/sherif414/VFloat/commit/a5100d1c2c38cf54c9f728857363b37765a5edcc))
- **memory-bank:** initialize memory bank files for project context tracking ([db996c3](https://github.com/sherif414/VFloat/commit/db996c3356a2c08bfea746b77942421867925662))
- **middlewares:** export additional functions from @floating-ui/dom ([3fb45f2](https://github.com/sherif414/VFloat/commit/3fb45f28c88871b8d4469bf894f94c9a93b88938))
- **reactivity:** add utility function to check if source is watchable ([85ce1d8](https://github.com/sherif414/VFloat/commit/85ce1d890060bb415f3c1262bafdde16bf4008c2))
- **rules:** introduce project rules for file structure and coding conventions ([18e3797](https://github.com/sherif414/VFloat/commit/18e3797178449f78e1a97fe03bf8bfe6030ae779))
- **safePolygon:** add safePolygon feature and documentation ([4518d79](https://github.com/sherif414/VFloat/commit/4518d793b541f60ed74a5f33d044bcb63ef016bc))
- Standardize useClick options ([55bceee](https://github.com/sherif414/VFloat/commit/55bceeeae210f4a9c8a7e1c87dee1634595a933d))
- **tree:** add reactive tree structure composable with node management ([805d6b4](https://github.com/sherif414/VFloat/commit/805d6b469e965401f9d363acb8db29470bc81dd4))
- **tree:** enhance removeNode method to support delete strategies ([b58d666](https://github.com/sherif414/VFloat/commit/b58d6668ac1f99443e19095e9ee9919cdce666c3))
- **tree:** enhance useTree with generic options and add useFloatingNode composable ([165a296](https://github.com/sherif414/VFloat/commit/165a296fc18b2f17db8abd55e911df004db535d0))
- **types:** add Fn type for a no-argument function ([284f4e5](https://github.com/sherif414/VFloat/commit/284f4e572eefcb1418e868c8dbb316a3d6c61c88))
- **use-floating-tree:** add methods to manage tree node visibility ([d12da75](https://github.com/sherif414/VFloat/commit/d12da756ef328c00bfd291150332325e6ebc3059))
- **use-floating:** expand type definitions and enhance documentation ([d4b0979](https://github.com/sherif414/VFloat/commit/d4b0979d2c6c1365b2a01691c29bdb64ef9d777b))
- **use-floating:** support VirtualElement in reference type ([cdc3aa1](https://github.com/sherif414/VFloat/commit/cdc3aa1af288f76bbf4aa8eeb27211e4ec9f67eb))
- **use-hover:** enhance hover functionality with advanced options and improved type definitions ([e589b44](https://github.com/sherif414/VFloat/commit/e589b449b58f9205c327c4259810f0124f1623bb))
- **useClick:** add tree-aware nested menu support and outside click handling ([42bbaf4](https://github.com/sherif414/VFloat/commit/42bbaf42d6a935592b823898bfb439cfdafff5cb))
- **utils:** add new utility isFunction ([c901da3](https://github.com/sherif414/VFloat/commit/c901da3e43ea2d7b1393d2b965751ae329d34180))
- **utils:** add useId function for generating unique IDs ([63864d4](https://github.com/sherif414/VFloat/commit/63864d48d42e17fba37a5b18821819d6dfedd855))

# 0.1.0 (2025-08-29)

### Bug Fixes

- **composables:** make root node mutable in use-floating-tree ([145cfe6](https://github.com/sherif414/VFloat/commit/145cfe6ae08692d29853a1351ca66926cbb62472))
- **demos:** add type annotations and improve formatting in InteractiveTooltip and ClientPointDemo ([7fd4f5c](https://github.com/sherif414/VFloat/commit/7fd4f5c3b48adcc9575a1bf946d520277f11051f))
- fixed tests ([0600e3f](https://github.com/sherif414/VFloat/commit/0600e3f97a93afa8a3763207f56f9a4b1121e9c7))
- **interactions:** remove unnecessary focus prevention on click ([59e8d0e](https://github.com/sherif414/VFloat/commit/59e8d0ea580866f836d8b9b5fbd671a2cf6d6a67))
- **reactivity:** remove unnecessary newline in isWatchable function ([0aaf8b9](https://github.com/sherif414/VFloat/commit/0aaf8b9f13bcf227350aa6dea8919ce512ca28aa))
- **use-arrow:** Correct arrow positioning logic and offset ([bf1401c](https://github.com/sherif414/VFloat/commit/bf1401cbaa077fafdd32840d684021dd0907a85c))
- **use-click:** improve event target checks and reset state on watch ([d037d88](https://github.com/sherif414/VFloat/commit/d037d887d3dda5f48ec4c9dc6529cd7d9af229c5))
- **use-dismiss:** correct reference to floating element in onClickOutside handler ([8998d16](https://github.com/sherif414/VFloat/commit/8998d16f997f530845b11147e9c18b70478c2a15))

### Features

- add Storybook setup and components for UI development ([ed62f2d](https://github.com/sherif414/VFloat/commit/ed62f2d544b41273cf2634f7c49c4884dedb55ff))
- **api:** add useEscapeKey composable for handling Escape key events ([64d383f](https://github.com/sherif414/VFloat/commit/64d383f4c0c3ab0a8c7c3e76dd2458e0f3f96465))
- **arrow:** auto-register arrow middleware in useArrow composable ([3acc2e8](https://github.com/sherif414/VFloat/commit/3acc2e858019c23968cb7244c30b641d90fe6d3b))
- **composables:** add use-tree composable for reactive tree structure management ([d8fa855](https://github.com/sherif414/VFloat/commit/d8fa85565d63bb86bd1c0f3fe01ff0147f87d63a))
- **config:** add Tailwind CSS and UnoCSS support in Vite configuration ([24a9a6a](https://github.com/sherif414/VFloat/commit/24a9a6a5dd4417870ee92d9988182406e7d38e50))
- **conventions:** add comprehensive project file structure and coding conventions ([d01e6fe](https://github.com/sherif414/VFloat/commit/d01e6fed5988cf9e197e3cb2dc6a85500c54b631))
- **conventions:** add guidelines for reactive state management in Vue ([7c38186](https://github.com/sherif414/VFloat/commit/7c38186680f0d73d5cfa2c1ab4f552d7b6da6b7e))
- **cursorignore:** add .cursorignore file to exclude unnecessary files from version control ([5a36b13](https://github.com/sherif414/VFloat/commit/5a36b13b43d31b158ed7f70787f293a3d980c631))
- **docs:** add custom styles for header anchor visibility ([2dbf5b9](https://github.com/sherif414/VFloat/commit/2dbf5b916600e68f1811574c9cd8c3ff79c9c692))
- **docs:** Integrate UnoCSS and add edit link ([b035e18](https://github.com/sherif414/VFloat/commit/b035e18f945428963e7cff5456f594333b478983))
- Extract `useOutsideClick` ([7930c28](https://github.com/sherif414/VFloat/commit/7930c2861928c4089da6b4e0b9ae743e1199738b))
- **floating:** auto-register arrow middleware in useFloating composable ([510afe1](https://github.com/sherif414/VFloat/commit/510afe18b081083b89fa9c68c285f775e3f0d5c2))
- **hover:** add tree-aware nested floating UI support ([8a94681](https://github.com/sherif414/VFloat/commit/8a946810165e9872a61145bdb1bff03f5421104f))
- **interactions:** add configurable outside click handling for floating elements ([7729273](https://github.com/sherif414/VFloat/commit/7729273083553161307344b575ab4e5268bec671))
- **interactions:** add custom handler for outside click in useOutsideClick ([4c69170](https://github.com/sherif414/VFloat/commit/4c6917064f527ad831cefd3b90c87f291cf90c7a))
- **interactions:** add tree-aware click handling for nested floating elements ([0ee26b0](https://github.com/sherif414/VFloat/commit/0ee26b0addaebdc047b1aa96503517c8ed436420))
- **interactions:** add tree-aware focus handling to useFocus composable ([a5100d1](https://github.com/sherif414/VFloat/commit/a5100d1c2c38cf54c9f728857363b37765a5edcc))
- **memory-bank:** initialize memory bank files for project context tracking ([db996c3](https://github.com/sherif414/VFloat/commit/db996c3356a2c08bfea746b77942421867925662))
- **middlewares:** export additional functions from @floating-ui/dom ([3fb45f2](https://github.com/sherif414/VFloat/commit/3fb45f28c88871b8d4469bf894f94c9a93b88938))
- **reactivity:** add utility function to check if source is watchable ([85ce1d8](https://github.com/sherif414/VFloat/commit/85ce1d890060bb415f3c1262bafdde16bf4008c2))
- **rules:** introduce project rules for file structure and coding conventions ([18e3797](https://github.com/sherif414/VFloat/commit/18e3797178449f78e1a97fe03bf8bfe6030ae779))
- **safePolygon:** add safePolygon feature and documentation ([4518d79](https://github.com/sherif414/VFloat/commit/4518d793b541f60ed74a5f33d044bcb63ef016bc))
- Standardize useClick options ([55bceee](https://github.com/sherif414/VFloat/commit/55bceeeae210f4a9c8a7e1c87dee1634595a933d))
- **tree:** add reactive tree structure composable with node management ([805d6b4](https://github.com/sherif414/VFloat/commit/805d6b469e965401f9d363acb8db29470bc81dd4))
- **tree:** enhance removeNode method to support delete strategies ([b58d666](https://github.com/sherif414/VFloat/commit/b58d6668ac1f99443e19095e9ee9919cdce666c3))
- **tree:** enhance useTree with generic options and add useFloatingNode composable ([165a296](https://github.com/sherif414/VFloat/commit/165a296fc18b2f17db8abd55e911df004db535d0))
- **types:** add Fn type for a no-argument function ([284f4e5](https://github.com/sherif414/VFloat/commit/284f4e572eefcb1418e868c8dbb316a3d6c61c88))
- **use-floating-tree:** add methods to manage tree node visibility ([d12da75](https://github.com/sherif414/VFloat/commit/d12da756ef328c00bfd291150332325e6ebc3059))
- **use-floating:** expand type definitions and enhance documentation ([d4b0979](https://github.com/sherif414/VFloat/commit/d4b0979d2c6c1365b2a01691c29bdb64ef9d777b))
- **use-floating:** support VirtualElement in reference type ([cdc3aa1](https://github.com/sherif414/VFloat/commit/cdc3aa1af288f76bbf4aa8eeb27211e4ec9f67eb))
- **use-hover:** enhance hover functionality with advanced options and improved type definitions ([e589b44](https://github.com/sherif414/VFloat/commit/e589b449b58f9205c327c4259810f0124f1623bb))
- **useClick:** add tree-aware nested menu support and outside click handling ([42bbaf4](https://github.com/sherif414/VFloat/commit/42bbaf42d6a935592b823898bfb439cfdafff5cb))
- **utils:** add new utility isFunction ([c901da3](https://github.com/sherif414/VFloat/commit/c901da3e43ea2d7b1393d2b965751ae329d34180))
- **utils:** add useId function for generating unique IDs ([63864d4](https://github.com/sherif414/VFloat/commit/63864d48d42e17fba37a5b18821819d6dfedd855))

# 0.3.0 (2025-08-29)

### Bug Fixes

- **composables:** make root node mutable in use-floating-tree ([145cfe6](https://github.com/sherif414/VFloat/commit/145cfe6ae08692d29853a1351ca66926cbb62472))
- **demos:** add type annotations and improve formatting in InteractiveTooltip and ClientPointDemo ([7fd4f5c](https://github.com/sherif414/VFloat/commit/7fd4f5c3b48adcc9575a1bf946d520277f11051f))
- fixed tests ([0600e3f](https://github.com/sherif414/VFloat/commit/0600e3f97a93afa8a3763207f56f9a4b1121e9c7))
- **interactions:** remove unnecessary focus prevention on click ([59e8d0e](https://github.com/sherif414/VFloat/commit/59e8d0ea580866f836d8b9b5fbd671a2cf6d6a67))
- **reactivity:** remove unnecessary newline in isWatchable function ([0aaf8b9](https://github.com/sherif414/VFloat/commit/0aaf8b9f13bcf227350aa6dea8919ce512ca28aa))
- **use-arrow:** Correct arrow positioning logic and offset ([bf1401c](https://github.com/sherif414/VFloat/commit/bf1401cbaa077fafdd32840d684021dd0907a85c))
- **use-click:** improve event target checks and reset state on watch ([d037d88](https://github.com/sherif414/VFloat/commit/d037d887d3dda5f48ec4c9dc6529cd7d9af229c5))
- **use-dismiss:** correct reference to floating element in onClickOutside handler ([8998d16](https://github.com/sherif414/VFloat/commit/8998d16f997f530845b11147e9c18b70478c2a15))

### Features

- add Storybook setup and components for UI development ([ed62f2d](https://github.com/sherif414/VFloat/commit/ed62f2d544b41273cf2634f7c49c4884dedb55ff))
- **api:** add useEscapeKey composable for handling Escape key events ([64d383f](https://github.com/sherif414/VFloat/commit/64d383f4c0c3ab0a8c7c3e76dd2458e0f3f96465))
- **arrow:** auto-register arrow middleware in useArrow composable ([3acc2e8](https://github.com/sherif414/VFloat/commit/3acc2e858019c23968cb7244c30b641d90fe6d3b))
- **composables:** add use-tree composable for reactive tree structure management ([d8fa855](https://github.com/sherif414/VFloat/commit/d8fa85565d63bb86bd1c0f3fe01ff0147f87d63a))
- **config:** add Tailwind CSS and UnoCSS support in Vite configuration ([24a9a6a](https://github.com/sherif414/VFloat/commit/24a9a6a5dd4417870ee92d9988182406e7d38e50))
- **conventions:** add comprehensive project file structure and coding conventions ([d01e6fe](https://github.com/sherif414/VFloat/commit/d01e6fed5988cf9e197e3cb2dc6a85500c54b631))
- **conventions:** add guidelines for reactive state management in Vue ([7c38186](https://github.com/sherif414/VFloat/commit/7c38186680f0d73d5cfa2c1ab4f552d7b6da6b7e))
- **cursorignore:** add .cursorignore file to exclude unnecessary files from version control ([5a36b13](https://github.com/sherif414/VFloat/commit/5a36b13b43d31b158ed7f70787f293a3d980c631))
- **docs:** add custom styles for header anchor visibility ([2dbf5b9](https://github.com/sherif414/VFloat/commit/2dbf5b916600e68f1811574c9cd8c3ff79c9c692))
- **docs:** Integrate UnoCSS and add edit link ([b035e18](https://github.com/sherif414/VFloat/commit/b035e18f945428963e7cff5456f594333b478983))
- Extract `useOutsideClick` ([7930c28](https://github.com/sherif414/VFloat/commit/7930c2861928c4089da6b4e0b9ae743e1199738b))
- **floating:** auto-register arrow middleware in useFloating composable ([510afe1](https://github.com/sherif414/VFloat/commit/510afe18b081083b89fa9c68c285f775e3f0d5c2))
- **hover:** add tree-aware nested floating UI support ([8a94681](https://github.com/sherif414/VFloat/commit/8a946810165e9872a61145bdb1bff03f5421104f))
- **interactions:** add configurable outside click handling for floating elements ([7729273](https://github.com/sherif414/VFloat/commit/7729273083553161307344b575ab4e5268bec671))
- **interactions:** add custom handler for outside click in useOutsideClick ([4c69170](https://github.com/sherif414/VFloat/commit/4c6917064f527ad831cefd3b90c87f291cf90c7a))
- **interactions:** add tree-aware click handling for nested floating elements ([0ee26b0](https://github.com/sherif414/VFloat/commit/0ee26b0addaebdc047b1aa96503517c8ed436420))
- **interactions:** add tree-aware focus handling to useFocus composable ([a5100d1](https://github.com/sherif414/VFloat/commit/a5100d1c2c38cf54c9f728857363b37765a5edcc))
- **memory-bank:** initialize memory bank files for project context tracking ([db996c3](https://github.com/sherif414/VFloat/commit/db996c3356a2c08bfea746b77942421867925662))
- **middlewares:** export additional functions from @floating-ui/dom ([3fb45f2](https://github.com/sherif414/VFloat/commit/3fb45f28c88871b8d4469bf894f94c9a93b88938))
- **reactivity:** add utility function to check if source is watchable ([85ce1d8](https://github.com/sherif414/VFloat/commit/85ce1d890060bb415f3c1262bafdde16bf4008c2))
- **rules:** introduce project rules for file structure and coding conventions ([18e3797](https://github.com/sherif414/VFloat/commit/18e3797178449f78e1a97fe03bf8bfe6030ae779))
- **safePolygon:** add safePolygon feature and documentation ([4518d79](https://github.com/sherif414/VFloat/commit/4518d793b541f60ed74a5f33d044bcb63ef016bc))
- Standardize useClick options ([55bceee](https://github.com/sherif414/VFloat/commit/55bceeeae210f4a9c8a7e1c87dee1634595a933d))
- **tree:** add reactive tree structure composable with node management ([805d6b4](https://github.com/sherif414/VFloat/commit/805d6b469e965401f9d363acb8db29470bc81dd4))
- **tree:** enhance removeNode method to support delete strategies ([b58d666](https://github.com/sherif414/VFloat/commit/b58d6668ac1f99443e19095e9ee9919cdce666c3))
- **tree:** enhance useTree with generic options and add useFloatingNode composable ([165a296](https://github.com/sherif414/VFloat/commit/165a296fc18b2f17db8abd55e911df004db535d0))
- **types:** add Fn type for a no-argument function ([284f4e5](https://github.com/sherif414/VFloat/commit/284f4e572eefcb1418e868c8dbb316a3d6c61c88))
- **use-floating-tree:** add methods to manage tree node visibility ([d12da75](https://github.com/sherif414/VFloat/commit/d12da756ef328c00bfd291150332325e6ebc3059))
- **use-floating:** expand type definitions and enhance documentation ([d4b0979](https://github.com/sherif414/VFloat/commit/d4b0979d2c6c1365b2a01691c29bdb64ef9d777b))
- **use-floating:** support VirtualElement in reference type ([cdc3aa1](https://github.com/sherif414/VFloat/commit/cdc3aa1af288f76bbf4aa8eeb27211e4ec9f67eb))
- **use-hover:** enhance hover functionality with advanced options and improved type definitions ([e589b44](https://github.com/sherif414/VFloat/commit/e589b449b58f9205c327c4259810f0124f1623bb))
- **useClick:** add tree-aware nested menu support and outside click handling ([42bbaf4](https://github.com/sherif414/VFloat/commit/42bbaf42d6a935592b823898bfb439cfdafff5cb))
- **utils:** add new utility isFunction ([c901da3](https://github.com/sherif414/VFloat/commit/c901da3e43ea2d7b1393d2b965751ae329d34180))
- **utils:** add useId function for generating unique IDs ([63864d4](https://github.com/sherif414/VFloat/commit/63864d48d42e17fba37a5b18821819d6dfedd855))

## [0.2.1] - Current

### Features

- Vue 3 port of Floating UI
- Core positioning functionality with useFloating composable
- Interaction composables (useHover, useClick, useFocus, useClientPoint)
- Middleware support for arrow positioning
- Floating tree management for nested elements
- TypeScript support
