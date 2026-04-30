# META INFORMANTION ABOUT THE PROJECT

- This project is named VFloat
- It's heavily inspired by Floating UI, however it's not a fork of it.
- Some of the api is similar to Floating UI, however it's not a direct copy. many parts of the api are different, so keep that in mind.

## Commit Messages

- Follow Conventional Commits for all Git commit messages.
- Use lowercase commit types such as `feat`, `fix`, `docs`, `refactor`, `chore`, `test`, `ci`, `build`, `perf`, `style`, and `revert`.
- Keep the header in the form `type(scope)!: description`.
- Treat `0.x` as an unstable pre-1.0 line and use the "infinite minor" pattern for ongoing API evolution.
- Use `fix` for patches, `feat` for new features, and `1.0.0` as the point where breaking changes should become major releases.

## Naming Conventions

- Follow existing VFloat naming before borrowing Floating UI terminology. Similarity is fine, but VFloat is not a direct copy.
- Public composables use `useX` export names with kebab-case filenames. Example: `useFloating` lives in `use-floating.ts`.
- Element refs and variables should use explicit `*El` names. Prefer `anchorEl`, `floatingEl`, and `arrowEl` over generic names like `reference` or `element`.
- The stable public entrypoint remains `useFloating(anchorEl, floatingEl, options)`. Preserve that call shape unless a change is explicitly requested.
- Grouped floating return data uses the `refs`, `state`, and `position` vocabulary. New API additions should fit into those groups rather than flattening more fields onto the root.
- Open-change reasons and similar string-literal event names should use kebab-case. Example: `anchor-click`, `outside-pointer`, and `escape-key`.
- Internal implementation files should use descriptive kebab-case nouns with role-oriented suffixes where helpful, such as `*-controller.ts`, `*-registry.ts`, `*-factory.ts`, `*-strategies.ts`, `geometry.ts`, and `bridge.ts`.
- Tests should mirror the source name they cover and use the `.test.ts` suffix.
- Boolean option names should read like flags. Prefer prefixes such as `enabled`, `allow`, `ignore`, `closeOn`, `openOn`, `prevent`, `require`, `return`, and `focus` when they match the behavior.
- When documenting or demoing the floating root, prefer a local variable name like `context` so examples stay consistent with the grouped API shape.

## Type Conventions

- Public composable companion types use `UseXOptions`, `UseXReturn`, and `UseXContext` when those shapes are exposed.
- Shared root and state types use the `Floating*` prefix. Examples: `FloatingRoot`, `FloatingContext`, `FloatingRefs`, `FloatingState`, and `FloatingPosition`.
- Prefer `interface` for object-shaped public contracts and configuration objects. Examples: `UseFloatingOptions`, `UseClickContext`, and `FloatingPosition`.
- Prefer `type` for unions, function signatures, tuples, and simple aliases. Examples: `OpenChangeReason`, `SafePolygonHandler`, `Point`, and `AnchorElement`.
- Domain-specific aliases should keep the domain noun in the type name. Prefer names like `AnchorElement`, `FloatingElement`, `Coordinates`, and `PointerEventData` over generic aliases.
- Internal structural adapter types can use suffixes like `Shape` and `Like` when they describe partial or compatibility contracts rather than primary public types. Examples: `FloatingRefsShape` and `FloatingPositionLike`.
- Internal service and protocol types should use explicit role suffixes when applicable, such as `*Controller`, `*Registry`, `*Strategy`, `*Contract`, and `*Registration`.

## Coding Style

- Add JSDoc-style docstrings to source functions and public exports when they define behavior or API shape.
- Skip docstrings for generated files, trivial accessors, and obvious type-only declarations.
- Add code comments when they explain why something exists, tradeoffs, non-obvious control flow, edge cases, or coordination between moving parts.
- Do not add comments that only restate what the code already says.

<!--VITE PLUS START-->

# Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, but it invokes Vite through `vp dev` and `vp build`.

## Vite+ Workflow

`vp` is a global binary that handles the full development lifecycle. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

### Start

- create - Create a new project from a template
- migrate - Migrate an existing project to Vite+
- config - Configure hooks and agent integration
- staged - Run linters on staged files
- install (`i`) - Install dependencies
- env - Manage Node.js versions

### Develop

- dev - Run the development server
- check - Run format, lint, and TypeScript type checks
- lint - Lint code
- fmt - Format code
- test - Run tests

### Execute

- run - Run monorepo tasks
- exec - Execute a command from local `node_modules/.bin`
- dlx - Execute a package binary without installing it as a dependency
- cache - Manage the task cache

### Build

- build - Build for production
- pack - Build libraries
- preview - Preview production build

### Manage Dependencies

Vite+ automatically detects and wraps the underlying package manager such as pnpm, npm, or Yarn through the `packageManager` field in `package.json` or package manager-specific lockfiles.

- add - Add packages to dependencies
- remove (`rm`, `un`, `uninstall`) - Remove packages from dependencies
- update (`up`) - Update packages to latest versions
- dedupe - Deduplicate dependencies
- outdated - Check for outdated packages
- list (`ls`) - List installed packages
- why (`explain`) - Show why a package is installed
- info (`view`, `show`) - View package information from the registry
- link (`ln`) / unlink - Manage local package links
- pm - Forward a command to the package manager

### Maintain

- upgrade - Update `vp` itself to the latest version

These commands map to their corresponding tools. For example, `vp dev --port 3000` runs Vite's dev server and works the same as Vite. `vp test` runs JavaScript tests through the bundled Vitest. The version of all tools can be checked using `vp --version`. This is useful when researching documentation, features, and bugs.

## Common Pitfalls

- **Using the package manager directly:** Do not use pnpm, npm, or Yarn directly. Vite+ can handle all package manager operations.
- **Always use Vite commands to run tools:** Don't attempt to run `vp vitest` or `vp oxlint`. They do not exist. Use `vp test` and `vp lint` instead.
- **Running scripts:** Vite+ built-in commands (`vp dev`, `vp build`, `vp test`, etc.) always run the Vite+ built-in tool, not any `package.json` script of the same name. To run a custom script that shares a name with a built-in command, use `vp run <script>`. For example, if you have a custom `dev` script that runs multiple services concurrently, run it with `vp run dev`, not `vp dev` (which always starts Vite's dev server).
- **Do not install Vitest, Oxlint, Oxfmt, or tsdown directly:** Vite+ wraps these tools. They must not be installed directly. You cannot upgrade these tools by installing their latest versions. Always use Vite+ commands.
- **Use Vite+ wrappers for one-off binaries:** Use `vp dlx` instead of package-manager-specific `dlx`/`npx` commands.
- **Import JavaScript modules from `vite-plus`:** Instead of importing from `vite` or `vitest`, all modules should be imported from the project's `vite-plus` dependency. For example, `import { defineConfig } from 'vite-plus';` or `import { expect, test, vi } from 'vite-plus/test';`. You must not install `vitest` to import test utilities.
- **Type-Aware Linting:** There is no need to install `oxlint-tsgolint`, `vp lint --type-aware` works out of the box.

## CI Integration

For GitHub Actions, consider using [`voidzero-dev/setup-vp`](https://github.com/voidzero-dev/setup-vp) to replace separate `actions/setup-node`, package-manager setup, cache, and install steps with a single action.

```yaml
- uses: voidzero-dev/setup-vp@v1
  with:
    cache: true
- run: vp check
- run: vp test
```

## Review Checklist for Agents

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to validate changes.
<!--VITE PLUS END-->

## Agent skills

### Issue tracker

Local markdown files under `.scratch/`. See `.agents/issue-tracker.md`.

### Triage labels

Default canonical roles (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `.agents/triage-labels.md`.

### Domain docs

Single-context layout (`CONTEXT.md` at repo root). See `.agents/domain.md`.
