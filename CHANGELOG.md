# Changelog

All notable changes to this project will be documented in this file. See [conventional commits](https://www.conventionalcommits.org/) for commit guidelines.

## [0.6.1](https://github.com/sherif414/VFloat/compare/v0.6.0...v0.6.1) (2025-09-27)

# [0.6.0](https://github.com/sherif414/VFloat/compare/v0.5.0...v0.6.0) (2025-09-27)


### Bug Fixes

* **demos:** refine context menu and cursor follow behavior ([2ecd624](https://github.com/sherif414/VFloat/commit/2ecd624d07bee6fe44a53541ba7e16ef14c90f69))
* **docs:** add click handlers to menu items to close popover on selection ([8d006a3](https://github.com/sherif414/VFloat/commit/8d006a304098dfebb2c22a7e423cf5a6d901750b))
* **docs:** close dropdown on item click and Esc key press ([a2f0d2e](https://github.com/sherif414/VFloat/commit/a2f0d2e18669576b00f798c6cbf54a0ec7e9dbc9))
* **interactions:** initialize anchorEl with virtual element on pointer target ([11a542d](https://github.com/sherif414/VFloat/commit/11a542df9fb14d70aff8f014f1a632d7166ea42e))
* **popover:** reduce hover delay time from 200ms to 50ms ([c746604](https://github.com/sherif414/VFloat/commit/c74660471707c27142fa38e4a69c4d4b1ea916ff))
* **useClientPoint:** made both x and y required for externally controlled coords ([e72eff2](https://github.com/sherif414/VFloat/commit/e72eff22a79e579becf45f321dcff31d243f3140))


### Features

* **docs:** add new demos and enhance useClientPoint API docs ([1a799c0](https://github.com/sherif414/VFloat/commit/1a799c0520027b1d5750f7a779b1c905e2a4808a))
* **use-escape-key:** add tree-aware escape key handling and update API ([e66cdef](https://github.com/sherif414/VFloat/commit/e66cdefb5d27eb0ff85cfa354c81678cee374d16))

# [0.5.0](https://github.com/sherif414/VFloat/compare/v0.4.0...v0.5.0) (2025-08-29)

# 0.1.0 (2025-08-29)


### Bug Fixes

* **biome:** update ignore patterns for docs and coverage directories ([3e5e2ea](https://github.com/sherif414/VFloat/commit/3e5e2ea66b29c7c8d6071fb86be769aff5752d5f))
* **composables:** make root node mutable in use-floating-tree ([145cfe6](https://github.com/sherif414/VFloat/commit/145cfe6ae08692d29853a1351ca66926cbb62472))
* **demos:** add type annotations and improve formatting in InteractiveTooltip and ClientPointDemo ([7fd4f5c](https://github.com/sherif414/VFloat/commit/7fd4f5c3b48adcc9575a1bf946d520277f11051f))
* fixed tests ([0600e3f](https://github.com/sherif414/VFloat/commit/0600e3f97a93afa8a3763207f56f9a4b1121e9c7))
* **interactions:** remove unnecessary focus prevention on click ([59e8d0e](https://github.com/sherif414/VFloat/commit/59e8d0ea580866f836d8b9b5fbd671a2cf6d6a67))
* **reactivity:** remove unnecessary newline in isWatchable function ([0aaf8b9](https://github.com/sherif414/VFloat/commit/0aaf8b9f13bcf227350aa6dea8919ce512ca28aa))
* **use-arrow:** Correct arrow positioning logic and offset ([bf1401c](https://github.com/sherif414/VFloat/commit/bf1401cbaa077fafdd32840d684021dd0907a85c))
* **use-click:** improve event target checks and reset state on watch ([d037d88](https://github.com/sherif414/VFloat/commit/d037d887d3dda5f48ec4c9dc6529cd7d9af229c5))
* **use-dismiss:** correct reference to floating element in onClickOutside handler ([8998d16](https://github.com/sherif414/VFloat/commit/8998d16f997f530845b11147e9c18b70478c2a15))


### Features

* add Storybook setup and components for UI development ([ed62f2d](https://github.com/sherif414/VFloat/commit/ed62f2d544b41273cf2634f7c49c4884dedb55ff))
* **api:** add useEscapeKey composable for handling Escape key events ([64d383f](https://github.com/sherif414/VFloat/commit/64d383f4c0c3ab0a8c7c3e76dd2458e0f3f96465))
* **arrow:** auto-register arrow middleware in useArrow composable ([3acc2e8](https://github.com/sherif414/VFloat/commit/3acc2e858019c23968cb7244c30b641d90fe6d3b))
* **composables:** add use-tree composable for reactive tree structure management ([d8fa855](https://github.com/sherif414/VFloat/commit/d8fa85565d63bb86bd1c0f3fe01ff0147f87d63a))
* **config:** add Tailwind CSS and UnoCSS support in Vite configuration ([24a9a6a](https://github.com/sherif414/VFloat/commit/24a9a6a5dd4417870ee92d9988182406e7d38e50))
* **conventions:** add comprehensive project file structure and coding conventions ([d01e6fe](https://github.com/sherif414/VFloat/commit/d01e6fed5988cf9e197e3cb2dc6a85500c54b631))
* **conventions:** add guidelines for reactive state management in Vue ([7c38186](https://github.com/sherif414/VFloat/commit/7c38186680f0d73d5cfa2c1ab4f552d7b6da6b7e))
* **cursorignore:** add .cursorignore file to exclude unnecessary files from version control ([5a36b13](https://github.com/sherif414/VFloat/commit/5a36b13b43d31b158ed7f70787f293a3d980c631))
* **docs:** add custom styles for header anchor visibility ([2dbf5b9](https://github.com/sherif414/VFloat/commit/2dbf5b916600e68f1811574c9cd8c3ff79c9c692))
* **docs:** Integrate UnoCSS and add edit link ([b035e18](https://github.com/sherif414/VFloat/commit/b035e18f945428963e7cff5456f594333b478983))
* Extract `useOutsideClick` ([7930c28](https://github.com/sherif414/VFloat/commit/7930c2861928c4089da6b4e0b9ae743e1199738b))
* **floating:** auto-register arrow middleware in useFloating composable ([510afe1](https://github.com/sherif414/VFloat/commit/510afe18b081083b89fa9c68c285f775e3f0d5c2))
* **hover:** add tree-aware nested floating UI support ([8a94681](https://github.com/sherif414/VFloat/commit/8a946810165e9872a61145bdb1bff03f5421104f))
* **interactions:** add configurable outside click handling for floating elements ([7729273](https://github.com/sherif414/VFloat/commit/7729273083553161307344b575ab4e5268bec671))
* **interactions:** add custom handler for outside click in useOutsideClick ([4c69170](https://github.com/sherif414/VFloat/commit/4c6917064f527ad831cefd3b90c87f291cf90c7a))
* **interactions:** add tree-aware click handling for nested floating elements ([0ee26b0](https://github.com/sherif414/VFloat/commit/0ee26b0addaebdc047b1aa96503517c8ed436420))
* **interactions:** add tree-aware focus handling to useFocus composable ([a5100d1](https://github.com/sherif414/VFloat/commit/a5100d1c2c38cf54c9f728857363b37765a5edcc))
* **memory-bank:** initialize memory bank files for project context tracking ([db996c3](https://github.com/sherif414/VFloat/commit/db996c3356a2c08bfea746b77942421867925662))
* **middlewares:** export additional functions from @floating-ui/dom ([3fb45f2](https://github.com/sherif414/VFloat/commit/3fb45f28c88871b8d4469bf894f94c9a93b88938))
* **reactivity:** add utility function to check if source is watchable ([85ce1d8](https://github.com/sherif414/VFloat/commit/85ce1d890060bb415f3c1262bafdde16bf4008c2))
* **rules:** introduce project rules for file structure and coding conventions ([18e3797](https://github.com/sherif414/VFloat/commit/18e3797178449f78e1a97fe03bf8bfe6030ae779))
* **safePolygon:** add safePolygon feature and documentation ([4518d79](https://github.com/sherif414/VFloat/commit/4518d793b541f60ed74a5f33d044bcb63ef016bc))
* Standardize useClick options ([55bceee](https://github.com/sherif414/VFloat/commit/55bceeeae210f4a9c8a7e1c87dee1634595a933d))
* **tree:** add reactive tree structure composable with node management ([805d6b4](https://github.com/sherif414/VFloat/commit/805d6b469e965401f9d363acb8db29470bc81dd4))
* **tree:** enhance removeNode method to support delete strategies ([b58d666](https://github.com/sherif414/VFloat/commit/b58d6668ac1f99443e19095e9ee9919cdce666c3))
* **tree:** enhance useTree with generic options and add useFloatingNode composable ([165a296](https://github.com/sherif414/VFloat/commit/165a296fc18b2f17db8abd55e911df004db535d0))
* **types:** add Fn type for a no-argument function ([284f4e5](https://github.com/sherif414/VFloat/commit/284f4e572eefcb1418e868c8dbb316a3d6c61c88))
* **use-floating-tree:** add methods to manage tree node visibility ([d12da75](https://github.com/sherif414/VFloat/commit/d12da756ef328c00bfd291150332325e6ebc3059))
* **use-floating:** expand type definitions and enhance documentation ([d4b0979](https://github.com/sherif414/VFloat/commit/d4b0979d2c6c1365b2a01691c29bdb64ef9d777b))
* **use-floating:** support VirtualElement in reference type ([cdc3aa1](https://github.com/sherif414/VFloat/commit/cdc3aa1af288f76bbf4aa8eeb27211e4ec9f67eb))
* **use-hover:** enhance hover functionality with advanced options and improved type definitions ([e589b44](https://github.com/sherif414/VFloat/commit/e589b449b58f9205c327c4259810f0124f1623bb))
* **useClick:** add tree-aware nested menu support and outside click handling ([42bbaf4](https://github.com/sherif414/VFloat/commit/42bbaf42d6a935592b823898bfb439cfdafff5cb))
* **utils:** add new utility isFunction ([c901da3](https://github.com/sherif414/VFloat/commit/c901da3e43ea2d7b1393d2b965751ae329d34180))
* **utils:** add useId function for generating unique IDs ([63864d4](https://github.com/sherif414/VFloat/commit/63864d48d42e17fba37a5b18821819d6dfedd855))

# 0.1.0 (2025-08-29)


### Bug Fixes

* **composables:** make root node mutable in use-floating-tree ([145cfe6](https://github.com/sherif414/VFloat/commit/145cfe6ae08692d29853a1351ca66926cbb62472))
* **demos:** add type annotations and improve formatting in InteractiveTooltip and ClientPointDemo ([7fd4f5c](https://github.com/sherif414/VFloat/commit/7fd4f5c3b48adcc9575a1bf946d520277f11051f))
* fixed tests ([0600e3f](https://github.com/sherif414/VFloat/commit/0600e3f97a93afa8a3763207f56f9a4b1121e9c7))
* **interactions:** remove unnecessary focus prevention on click ([59e8d0e](https://github.com/sherif414/VFloat/commit/59e8d0ea580866f836d8b9b5fbd671a2cf6d6a67))
* **reactivity:** remove unnecessary newline in isWatchable function ([0aaf8b9](https://github.com/sherif414/VFloat/commit/0aaf8b9f13bcf227350aa6dea8919ce512ca28aa))
* **use-arrow:** Correct arrow positioning logic and offset ([bf1401c](https://github.com/sherif414/VFloat/commit/bf1401cbaa077fafdd32840d684021dd0907a85c))
* **use-click:** improve event target checks and reset state on watch ([d037d88](https://github.com/sherif414/VFloat/commit/d037d887d3dda5f48ec4c9dc6529cd7d9af229c5))
* **use-dismiss:** correct reference to floating element in onClickOutside handler ([8998d16](https://github.com/sherif414/VFloat/commit/8998d16f997f530845b11147e9c18b70478c2a15))


### Features

* add Storybook setup and components for UI development ([ed62f2d](https://github.com/sherif414/VFloat/commit/ed62f2d544b41273cf2634f7c49c4884dedb55ff))
* **api:** add useEscapeKey composable for handling Escape key events ([64d383f](https://github.com/sherif414/VFloat/commit/64d383f4c0c3ab0a8c7c3e76dd2458e0f3f96465))
* **arrow:** auto-register arrow middleware in useArrow composable ([3acc2e8](https://github.com/sherif414/VFloat/commit/3acc2e858019c23968cb7244c30b641d90fe6d3b))
* **composables:** add use-tree composable for reactive tree structure management ([d8fa855](https://github.com/sherif414/VFloat/commit/d8fa85565d63bb86bd1c0f3fe01ff0147f87d63a))
* **config:** add Tailwind CSS and UnoCSS support in Vite configuration ([24a9a6a](https://github.com/sherif414/VFloat/commit/24a9a6a5dd4417870ee92d9988182406e7d38e50))
* **conventions:** add comprehensive project file structure and coding conventions ([d01e6fe](https://github.com/sherif414/VFloat/commit/d01e6fed5988cf9e197e3cb2dc6a85500c54b631))
* **conventions:** add guidelines for reactive state management in Vue ([7c38186](https://github.com/sherif414/VFloat/commit/7c38186680f0d73d5cfa2c1ab4f552d7b6da6b7e))
* **cursorignore:** add .cursorignore file to exclude unnecessary files from version control ([5a36b13](https://github.com/sherif414/VFloat/commit/5a36b13b43d31b158ed7f70787f293a3d980c631))
* **docs:** add custom styles for header anchor visibility ([2dbf5b9](https://github.com/sherif414/VFloat/commit/2dbf5b916600e68f1811574c9cd8c3ff79c9c692))
* **docs:** Integrate UnoCSS and add edit link ([b035e18](https://github.com/sherif414/VFloat/commit/b035e18f945428963e7cff5456f594333b478983))
* Extract `useOutsideClick` ([7930c28](https://github.com/sherif414/VFloat/commit/7930c2861928c4089da6b4e0b9ae743e1199738b))
* **floating:** auto-register arrow middleware in useFloating composable ([510afe1](https://github.com/sherif414/VFloat/commit/510afe18b081083b89fa9c68c285f775e3f0d5c2))
* **hover:** add tree-aware nested floating UI support ([8a94681](https://github.com/sherif414/VFloat/commit/8a946810165e9872a61145bdb1bff03f5421104f))
* **interactions:** add configurable outside click handling for floating elements ([7729273](https://github.com/sherif414/VFloat/commit/7729273083553161307344b575ab4e5268bec671))
* **interactions:** add custom handler for outside click in useOutsideClick ([4c69170](https://github.com/sherif414/VFloat/commit/4c6917064f527ad831cefd3b90c87f291cf90c7a))
* **interactions:** add tree-aware click handling for nested floating elements ([0ee26b0](https://github.com/sherif414/VFloat/commit/0ee26b0addaebdc047b1aa96503517c8ed436420))
* **interactions:** add tree-aware focus handling to useFocus composable ([a5100d1](https://github.com/sherif414/VFloat/commit/a5100d1c2c38cf54c9f728857363b37765a5edcc))
* **memory-bank:** initialize memory bank files for project context tracking ([db996c3](https://github.com/sherif414/VFloat/commit/db996c3356a2c08bfea746b77942421867925662))
* **middlewares:** export additional functions from @floating-ui/dom ([3fb45f2](https://github.com/sherif414/VFloat/commit/3fb45f28c88871b8d4469bf894f94c9a93b88938))
* **reactivity:** add utility function to check if source is watchable ([85ce1d8](https://github.com/sherif414/VFloat/commit/85ce1d890060bb415f3c1262bafdde16bf4008c2))
* **rules:** introduce project rules for file structure and coding conventions ([18e3797](https://github.com/sherif414/VFloat/commit/18e3797178449f78e1a97fe03bf8bfe6030ae779))
* **safePolygon:** add safePolygon feature and documentation ([4518d79](https://github.com/sherif414/VFloat/commit/4518d793b541f60ed74a5f33d044bcb63ef016bc))
* Standardize useClick options ([55bceee](https://github.com/sherif414/VFloat/commit/55bceeeae210f4a9c8a7e1c87dee1634595a933d))
* **tree:** add reactive tree structure composable with node management ([805d6b4](https://github.com/sherif414/VFloat/commit/805d6b469e965401f9d363acb8db29470bc81dd4))
* **tree:** enhance removeNode method to support delete strategies ([b58d666](https://github.com/sherif414/VFloat/commit/b58d6668ac1f99443e19095e9ee9919cdce666c3))
* **tree:** enhance useTree with generic options and add useFloatingNode composable ([165a296](https://github.com/sherif414/VFloat/commit/165a296fc18b2f17db8abd55e911df004db535d0))
* **types:** add Fn type for a no-argument function ([284f4e5](https://github.com/sherif414/VFloat/commit/284f4e572eefcb1418e868c8dbb316a3d6c61c88))
* **use-floating-tree:** add methods to manage tree node visibility ([d12da75](https://github.com/sherif414/VFloat/commit/d12da756ef328c00bfd291150332325e6ebc3059))
* **use-floating:** expand type definitions and enhance documentation ([d4b0979](https://github.com/sherif414/VFloat/commit/d4b0979d2c6c1365b2a01691c29bdb64ef9d777b))
* **use-floating:** support VirtualElement in reference type ([cdc3aa1](https://github.com/sherif414/VFloat/commit/cdc3aa1af288f76bbf4aa8eeb27211e4ec9f67eb))
* **use-hover:** enhance hover functionality with advanced options and improved type definitions ([e589b44](https://github.com/sherif414/VFloat/commit/e589b449b58f9205c327c4259810f0124f1623bb))
* **useClick:** add tree-aware nested menu support and outside click handling ([42bbaf4](https://github.com/sherif414/VFloat/commit/42bbaf42d6a935592b823898bfb439cfdafff5cb))
* **utils:** add new utility isFunction ([c901da3](https://github.com/sherif414/VFloat/commit/c901da3e43ea2d7b1393d2b965751ae329d34180))
* **utils:** add useId function for generating unique IDs ([63864d4](https://github.com/sherif414/VFloat/commit/63864d48d42e17fba37a5b18821819d6dfedd855))

# 0.1.0 (2025-08-29)


### Bug Fixes

* **composables:** make root node mutable in use-floating-tree ([145cfe6](https://github.com/sherif414/VFloat/commit/145cfe6ae08692d29853a1351ca66926cbb62472))
* **demos:** add type annotations and improve formatting in InteractiveTooltip and ClientPointDemo ([7fd4f5c](https://github.com/sherif414/VFloat/commit/7fd4f5c3b48adcc9575a1bf946d520277f11051f))
* fixed tests ([0600e3f](https://github.com/sherif414/VFloat/commit/0600e3f97a93afa8a3763207f56f9a4b1121e9c7))
* **interactions:** remove unnecessary focus prevention on click ([59e8d0e](https://github.com/sherif414/VFloat/commit/59e8d0ea580866f836d8b9b5fbd671a2cf6d6a67))
* **reactivity:** remove unnecessary newline in isWatchable function ([0aaf8b9](https://github.com/sherif414/VFloat/commit/0aaf8b9f13bcf227350aa6dea8919ce512ca28aa))
* **use-arrow:** Correct arrow positioning logic and offset ([bf1401c](https://github.com/sherif414/VFloat/commit/bf1401cbaa077fafdd32840d684021dd0907a85c))
* **use-click:** improve event target checks and reset state on watch ([d037d88](https://github.com/sherif414/VFloat/commit/d037d887d3dda5f48ec4c9dc6529cd7d9af229c5))
* **use-dismiss:** correct reference to floating element in onClickOutside handler ([8998d16](https://github.com/sherif414/VFloat/commit/8998d16f997f530845b11147e9c18b70478c2a15))


### Features

* add Storybook setup and components for UI development ([ed62f2d](https://github.com/sherif414/VFloat/commit/ed62f2d544b41273cf2634f7c49c4884dedb55ff))
* **api:** add useEscapeKey composable for handling Escape key events ([64d383f](https://github.com/sherif414/VFloat/commit/64d383f4c0c3ab0a8c7c3e76dd2458e0f3f96465))
* **arrow:** auto-register arrow middleware in useArrow composable ([3acc2e8](https://github.com/sherif414/VFloat/commit/3acc2e858019c23968cb7244c30b641d90fe6d3b))
* **composables:** add use-tree composable for reactive tree structure management ([d8fa855](https://github.com/sherif414/VFloat/commit/d8fa85565d63bb86bd1c0f3fe01ff0147f87d63a))
* **config:** add Tailwind CSS and UnoCSS support in Vite configuration ([24a9a6a](https://github.com/sherif414/VFloat/commit/24a9a6a5dd4417870ee92d9988182406e7d38e50))
* **conventions:** add comprehensive project file structure and coding conventions ([d01e6fe](https://github.com/sherif414/VFloat/commit/d01e6fed5988cf9e197e3cb2dc6a85500c54b631))
* **conventions:** add guidelines for reactive state management in Vue ([7c38186](https://github.com/sherif414/VFloat/commit/7c38186680f0d73d5cfa2c1ab4f552d7b6da6b7e))
* **cursorignore:** add .cursorignore file to exclude unnecessary files from version control ([5a36b13](https://github.com/sherif414/VFloat/commit/5a36b13b43d31b158ed7f70787f293a3d980c631))
* **docs:** add custom styles for header anchor visibility ([2dbf5b9](https://github.com/sherif414/VFloat/commit/2dbf5b916600e68f1811574c9cd8c3ff79c9c692))
* **docs:** Integrate UnoCSS and add edit link ([b035e18](https://github.com/sherif414/VFloat/commit/b035e18f945428963e7cff5456f594333b478983))
* Extract `useOutsideClick` ([7930c28](https://github.com/sherif414/VFloat/commit/7930c2861928c4089da6b4e0b9ae743e1199738b))
* **floating:** auto-register arrow middleware in useFloating composable ([510afe1](https://github.com/sherif414/VFloat/commit/510afe18b081083b89fa9c68c285f775e3f0d5c2))
* **hover:** add tree-aware nested floating UI support ([8a94681](https://github.com/sherif414/VFloat/commit/8a946810165e9872a61145bdb1bff03f5421104f))
* **interactions:** add configurable outside click handling for floating elements ([7729273](https://github.com/sherif414/VFloat/commit/7729273083553161307344b575ab4e5268bec671))
* **interactions:** add custom handler for outside click in useOutsideClick ([4c69170](https://github.com/sherif414/VFloat/commit/4c6917064f527ad831cefd3b90c87f291cf90c7a))
* **interactions:** add tree-aware click handling for nested floating elements ([0ee26b0](https://github.com/sherif414/VFloat/commit/0ee26b0addaebdc047b1aa96503517c8ed436420))
* **interactions:** add tree-aware focus handling to useFocus composable ([a5100d1](https://github.com/sherif414/VFloat/commit/a5100d1c2c38cf54c9f728857363b37765a5edcc))
* **memory-bank:** initialize memory bank files for project context tracking ([db996c3](https://github.com/sherif414/VFloat/commit/db996c3356a2c08bfea746b77942421867925662))
* **middlewares:** export additional functions from @floating-ui/dom ([3fb45f2](https://github.com/sherif414/VFloat/commit/3fb45f28c88871b8d4469bf894f94c9a93b88938))
* **reactivity:** add utility function to check if source is watchable ([85ce1d8](https://github.com/sherif414/VFloat/commit/85ce1d890060bb415f3c1262bafdde16bf4008c2))
* **rules:** introduce project rules for file structure and coding conventions ([18e3797](https://github.com/sherif414/VFloat/commit/18e3797178449f78e1a97fe03bf8bfe6030ae779))
* **safePolygon:** add safePolygon feature and documentation ([4518d79](https://github.com/sherif414/VFloat/commit/4518d793b541f60ed74a5f33d044bcb63ef016bc))
* Standardize useClick options ([55bceee](https://github.com/sherif414/VFloat/commit/55bceeeae210f4a9c8a7e1c87dee1634595a933d))
* **tree:** add reactive tree structure composable with node management ([805d6b4](https://github.com/sherif414/VFloat/commit/805d6b469e965401f9d363acb8db29470bc81dd4))
* **tree:** enhance removeNode method to support delete strategies ([b58d666](https://github.com/sherif414/VFloat/commit/b58d6668ac1f99443e19095e9ee9919cdce666c3))
* **tree:** enhance useTree with generic options and add useFloatingNode composable ([165a296](https://github.com/sherif414/VFloat/commit/165a296fc18b2f17db8abd55e911df004db535d0))
* **types:** add Fn type for a no-argument function ([284f4e5](https://github.com/sherif414/VFloat/commit/284f4e572eefcb1418e868c8dbb316a3d6c61c88))
* **use-floating-tree:** add methods to manage tree node visibility ([d12da75](https://github.com/sherif414/VFloat/commit/d12da756ef328c00bfd291150332325e6ebc3059))
* **use-floating:** expand type definitions and enhance documentation ([d4b0979](https://github.com/sherif414/VFloat/commit/d4b0979d2c6c1365b2a01691c29bdb64ef9d777b))
* **use-floating:** support VirtualElement in reference type ([cdc3aa1](https://github.com/sherif414/VFloat/commit/cdc3aa1af288f76bbf4aa8eeb27211e4ec9f67eb))
* **use-hover:** enhance hover functionality with advanced options and improved type definitions ([e589b44](https://github.com/sherif414/VFloat/commit/e589b449b58f9205c327c4259810f0124f1623bb))
* **useClick:** add tree-aware nested menu support and outside click handling ([42bbaf4](https://github.com/sherif414/VFloat/commit/42bbaf42d6a935592b823898bfb439cfdafff5cb))
* **utils:** add new utility isFunction ([c901da3](https://github.com/sherif414/VFloat/commit/c901da3e43ea2d7b1393d2b965751ae329d34180))
* **utils:** add useId function for generating unique IDs ([63864d4](https://github.com/sherif414/VFloat/commit/63864d48d42e17fba37a5b18821819d6dfedd855))

# 0.3.0 (2025-08-29)


### Bug Fixes

* **composables:** make root node mutable in use-floating-tree ([145cfe6](https://github.com/sherif414/VFloat/commit/145cfe6ae08692d29853a1351ca66926cbb62472))
* **demos:** add type annotations and improve formatting in InteractiveTooltip and ClientPointDemo ([7fd4f5c](https://github.com/sherif414/VFloat/commit/7fd4f5c3b48adcc9575a1bf946d520277f11051f))
* fixed tests ([0600e3f](https://github.com/sherif414/VFloat/commit/0600e3f97a93afa8a3763207f56f9a4b1121e9c7))
* **interactions:** remove unnecessary focus prevention on click ([59e8d0e](https://github.com/sherif414/VFloat/commit/59e8d0ea580866f836d8b9b5fbd671a2cf6d6a67))
* **reactivity:** remove unnecessary newline in isWatchable function ([0aaf8b9](https://github.com/sherif414/VFloat/commit/0aaf8b9f13bcf227350aa6dea8919ce512ca28aa))
* **use-arrow:** Correct arrow positioning logic and offset ([bf1401c](https://github.com/sherif414/VFloat/commit/bf1401cbaa077fafdd32840d684021dd0907a85c))
* **use-click:** improve event target checks and reset state on watch ([d037d88](https://github.com/sherif414/VFloat/commit/d037d887d3dda5f48ec4c9dc6529cd7d9af229c5))
* **use-dismiss:** correct reference to floating element in onClickOutside handler ([8998d16](https://github.com/sherif414/VFloat/commit/8998d16f997f530845b11147e9c18b70478c2a15))


### Features

* add Storybook setup and components for UI development ([ed62f2d](https://github.com/sherif414/VFloat/commit/ed62f2d544b41273cf2634f7c49c4884dedb55ff))
* **api:** add useEscapeKey composable for handling Escape key events ([64d383f](https://github.com/sherif414/VFloat/commit/64d383f4c0c3ab0a8c7c3e76dd2458e0f3f96465))
* **arrow:** auto-register arrow middleware in useArrow composable ([3acc2e8](https://github.com/sherif414/VFloat/commit/3acc2e858019c23968cb7244c30b641d90fe6d3b))
* **composables:** add use-tree composable for reactive tree structure management ([d8fa855](https://github.com/sherif414/VFloat/commit/d8fa85565d63bb86bd1c0f3fe01ff0147f87d63a))
* **config:** add Tailwind CSS and UnoCSS support in Vite configuration ([24a9a6a](https://github.com/sherif414/VFloat/commit/24a9a6a5dd4417870ee92d9988182406e7d38e50))
* **conventions:** add comprehensive project file structure and coding conventions ([d01e6fe](https://github.com/sherif414/VFloat/commit/d01e6fed5988cf9e197e3cb2dc6a85500c54b631))
* **conventions:** add guidelines for reactive state management in Vue ([7c38186](https://github.com/sherif414/VFloat/commit/7c38186680f0d73d5cfa2c1ab4f552d7b6da6b7e))
* **cursorignore:** add .cursorignore file to exclude unnecessary files from version control ([5a36b13](https://github.com/sherif414/VFloat/commit/5a36b13b43d31b158ed7f70787f293a3d980c631))
* **docs:** add custom styles for header anchor visibility ([2dbf5b9](https://github.com/sherif414/VFloat/commit/2dbf5b916600e68f1811574c9cd8c3ff79c9c692))
* **docs:** Integrate UnoCSS and add edit link ([b035e18](https://github.com/sherif414/VFloat/commit/b035e18f945428963e7cff5456f594333b478983))
* Extract `useOutsideClick` ([7930c28](https://github.com/sherif414/VFloat/commit/7930c2861928c4089da6b4e0b9ae743e1199738b))
* **floating:** auto-register arrow middleware in useFloating composable ([510afe1](https://github.com/sherif414/VFloat/commit/510afe18b081083b89fa9c68c285f775e3f0d5c2))
* **hover:** add tree-aware nested floating UI support ([8a94681](https://github.com/sherif414/VFloat/commit/8a946810165e9872a61145bdb1bff03f5421104f))
* **interactions:** add configurable outside click handling for floating elements ([7729273](https://github.com/sherif414/VFloat/commit/7729273083553161307344b575ab4e5268bec671))
* **interactions:** add custom handler for outside click in useOutsideClick ([4c69170](https://github.com/sherif414/VFloat/commit/4c6917064f527ad831cefd3b90c87f291cf90c7a))
* **interactions:** add tree-aware click handling for nested floating elements ([0ee26b0](https://github.com/sherif414/VFloat/commit/0ee26b0addaebdc047b1aa96503517c8ed436420))
* **interactions:** add tree-aware focus handling to useFocus composable ([a5100d1](https://github.com/sherif414/VFloat/commit/a5100d1c2c38cf54c9f728857363b37765a5edcc))
* **memory-bank:** initialize memory bank files for project context tracking ([db996c3](https://github.com/sherif414/VFloat/commit/db996c3356a2c08bfea746b77942421867925662))
* **middlewares:** export additional functions from @floating-ui/dom ([3fb45f2](https://github.com/sherif414/VFloat/commit/3fb45f28c88871b8d4469bf894f94c9a93b88938))
* **reactivity:** add utility function to check if source is watchable ([85ce1d8](https://github.com/sherif414/VFloat/commit/85ce1d890060bb415f3c1262bafdde16bf4008c2))
* **rules:** introduce project rules for file structure and coding conventions ([18e3797](https://github.com/sherif414/VFloat/commit/18e3797178449f78e1a97fe03bf8bfe6030ae779))
* **safePolygon:** add safePolygon feature and documentation ([4518d79](https://github.com/sherif414/VFloat/commit/4518d793b541f60ed74a5f33d044bcb63ef016bc))
* Standardize useClick options ([55bceee](https://github.com/sherif414/VFloat/commit/55bceeeae210f4a9c8a7e1c87dee1634595a933d))
* **tree:** add reactive tree structure composable with node management ([805d6b4](https://github.com/sherif414/VFloat/commit/805d6b469e965401f9d363acb8db29470bc81dd4))
* **tree:** enhance removeNode method to support delete strategies ([b58d666](https://github.com/sherif414/VFloat/commit/b58d6668ac1f99443e19095e9ee9919cdce666c3))
* **tree:** enhance useTree with generic options and add useFloatingNode composable ([165a296](https://github.com/sherif414/VFloat/commit/165a296fc18b2f17db8abd55e911df004db535d0))
* **types:** add Fn type for a no-argument function ([284f4e5](https://github.com/sherif414/VFloat/commit/284f4e572eefcb1418e868c8dbb316a3d6c61c88))
* **use-floating-tree:** add methods to manage tree node visibility ([d12da75](https://github.com/sherif414/VFloat/commit/d12da756ef328c00bfd291150332325e6ebc3059))
* **use-floating:** expand type definitions and enhance documentation ([d4b0979](https://github.com/sherif414/VFloat/commit/d4b0979d2c6c1365b2a01691c29bdb64ef9d777b))
* **use-floating:** support VirtualElement in reference type ([cdc3aa1](https://github.com/sherif414/VFloat/commit/cdc3aa1af288f76bbf4aa8eeb27211e4ec9f67eb))
* **use-hover:** enhance hover functionality with advanced options and improved type definitions ([e589b44](https://github.com/sherif414/VFloat/commit/e589b449b58f9205c327c4259810f0124f1623bb))
* **useClick:** add tree-aware nested menu support and outside click handling ([42bbaf4](https://github.com/sherif414/VFloat/commit/42bbaf42d6a935592b823898bfb439cfdafff5cb))
* **utils:** add new utility isFunction ([c901da3](https://github.com/sherif414/VFloat/commit/c901da3e43ea2d7b1393d2b965751ae329d34180))
* **utils:** add useId function for generating unique IDs ([63864d4](https://github.com/sherif414/VFloat/commit/63864d48d42e17fba37a5b18821819d6dfedd855))

## [0.2.1] - Current

### Features

- Vue 3 port of Floating UI
- Core positioning functionality with useFloating composable
- Interaction composables (useHover, useClick, useFocus, useClientPoint)
- Middleware support for arrow positioning
- Floating tree management for nested elements
- TypeScript support
