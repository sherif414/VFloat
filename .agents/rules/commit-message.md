---
trigger: model_decision
description: when generating commit messages
---

# Rules for AI Git Commit Message Generation

This document outlines the rules an AI agent MUST follow when generating Git commit messages. The rules are based on the Conventional Commits specification and are designed to ensure clarity, consistency, and compatibility with automated tooling.

## 1. RFC 2119 Compliance

The key words “MUST”, “MUST NOT”, “REQUIRED”, “SHALL”, “SHALL NOT”, “SHOULD”, “SHOULD NOT”, “RECOMMENDED”, “MAY”, and “OPTIONAL” in this document are to be interpreted as described in RFC 2119.

## 2. Core Principles

- **Commit as if Releasing:** All commits, even during initial development, **MUST** adhere to this specification. Your audience (including fellow developers) relies on this history to understand changes, fixes, and breaking changes.
- **One Logical Change Per Commit:** A commit **MUST** represent a single, atomic logical change. If a set of changes conforms to more than one commit type (e.g., a new feature and a bug fix), you **MUST** split them into multiple, separate commits. This encourages organized history and simplifies review.
- **Enable Organized Speed:** This specification does not discourage rapid development; it discourages disorganized development. Following these rules enables long-term velocity across projects and teams.

## 3. Commit Message Structure

Every commit message **MUST** adhere to the following structure:

```
<type>[optional scope][!]: <description>

[optional body]

[optional footer(s)]
```

---

## 4. The Header: `<type>[scope][!]: <description>`

The header is the first line of the commit message and is **REQUIRED**. It **MUST** follow a strict format.

### 4.1. Type

- Commits **MUST** be prefixed with a `type`.
- The `type` **SHOULD** be lowercase for consistency, though any casing is technically permissible.
- The type `feat` **MUST ONLY** be used when a commit adds a new **library feature** consumable by end-users (e.g. `src/` runtime exports, composables, options, public APIs).
- The type `fix` **MUST ONLY** be used when a commit represents a bug fix in the **library runtime or public types** that affects consumers.
- Other types **MAY** be used. **RECOMMENDED** types include:
  - `build`: Changes that affect the build system, package bundling, or external dependencies (e.g., `package.json`, `vite.config.ts`).
  - `chore`: Other changes that don't modify public library source code or tests (e.g., maintenance scripts, internal workflows, AI agent skills/rules).
  - `ci`: Changes to CI configuration files and automation pipelines (e.g., `.github/workflows/`).
  - `docs`: Documentation only changes (e.g., `docs/`, `README.md`).
  - `perf`: A code change that improves performance in the library runtime (`src/`).
  - `refactor`: An internal code change in the library runtime (`src/`) that neither fixes a bug nor adds a feature, preserving external behavior. Because internal refactors are excluded from the public changelog (`refactor: false`), `refactor` **MUST NOT** be used for breaking public API changes.
  - `revert`: Indicates that a previous commit has been reverted (see Section 8.1).
  - `style`: Changes that do not affect the meaning of the code (white-space, formatting, etc).
  - `test`: Adding missing tests or correcting existing tests (`*.test.ts`, Vitest configs).

### 4.1.1. Library Features vs. Maintainer / AI Tooling

Automated changelog generators and release tools (such as `changelogen` or `semantic-release`) parse `feat` and `fix` commits to generate public release notes and determine Semantic Version bumps.

- **Library Features (`feat`)**: Changes that add new capabilities to the published npm package consumed by end-users (e.g., `feat(<module>): add rest timeout option`).
- **Breaking API Changes & Removals (`feat!:` / `fix!:`)**: Any change to the public API surface—including redesigning composable signatures, simplifying parameters, or removing options—**MUST** use `feat!:` (or `fix!:` if correcting an erroneous API design). Because release tooling (`changelogen`) only includes user-facing types and excludes `refactor`, breaking changes tagged as `refactor!:` will be omitted from the changelog. `refactor` **MUST ONLY** be used for internal implementation changes that are 100% backwards compatible.
- **AI Agent Tooling / Skills / Rules (`chore`)**: Changes to `.agents/`, `.gemini/`, skills, agent prompts, rules, or subagents are internal maintainer tooling and **MUST NEVER** use `feat` or `fix`. Always use `chore(skills)`, `chore(agents)`, or `chore(rules)` (e.g., `chore(skills): add diagnose skill`, `chore(agents): update issue workflow`).
- **Maintainer Scripts & Release Tooling (`chore` / `ci` / `build`)**: Scripts in `scripts/`, release tools, docs deployment helpers, etc. **MUST NOT** use `feat` (e.g., use `chore(release): automate gh release step`).

### 4.2. Scope

- A `scope` **MAY** be provided after a type.
- If provided, the scope **MUST** be lowercase kebab-case and **MUST be derived from the artifact the commit actually touches** — never recalled from a hardcoded list, because such a list silently rots the moment a module is added, renamed, or deleted.
- **Derive the scope from the path:**

| Changed path                                            | Scope                                                                       |
| ------------------------------------------------------- | --------------------------------------------------------------------------- |
| `packages/vue/src/composables/<module>/**`              | `<module>` — the directory name as it exists on disk                        |
| `packages/vue/src/shared/**`                            | `shared`                                                                    |
| `packages/vue/src/types.ts`                             | `types`                                                                     |
| `packages/vue/src/index.ts` and public entrypoint exports | the module scope the export belongs to                                    |
| `packages/vue/src/**` spanning several modules          | `vue`                                                                       |
| Test files across the package                           | `test`                                                                      |
| `playground/**`                                         | `playground`                                                                |
| `docs/**`                                               | `docs`; the API reference specifically → `api`                              |
| `RFC/**`, `ADR/**`, `plan/**`                            | `rfc`, `adr`, `plan`                                                        |
| `.agents/skills/**`                                     | `skills`                                                                    |
| `.agents/rules/**`                                      | `rules`                                                                     |
| Other `.agents/**` (prompts, subagents, workflows)      | `agents`                                                                    |
| `scripts/**`                                            | `release`, or the area the script serves                                    |
| `package.json`, `vite.config.ts`, `tsconfig*.json`, lockfile | `deps` for dependency updates, `build` for build configuration         |
| `.github/**`                                            | `ci`                                                                        |
| Repo root, repo-wide tooling, workspace layout          | `repo`                                                                      |

- **Verify the name instead of remembering it:** `git ls-tree --name-only HEAD:packages/vue/src/composables` prints the current module scopes. Use the same shape for any other directory (`git ls-tree --name-only HEAD:<dir>`).
- The table lists **areas, not an allowlist**: a directory that appears today is a valid scope today, even if it did not exist when this rule was written.
- Tooling, skill, and rule changes are maintainer changes and **MUST** use `chore` regardless of scope (§4.1.1).
- **Take names from the repository, not from this page:** `git log --oneline -20` for real message shapes, `git ls-tree --name-only HEAD:<dir>` for real scope names. Any name, path, or SHA printed in this document illustrates **shape** only and is never a claim about what currently exists.

### 4.3. Description

- A `description` **MUST** immediately follow the colon and space after the `type`/`scope`.
- It **MUST** be a short, imperative-mood summary of the code changes.
- It **MUST** start with a lowercase letter (e.g. `add`, `fix`, `prevent`, `simplify`).
- It **MUST NOT** end with a period (`.`).
- **Use imperative present tense verbs**: `add`, `fix`, `support`, `prevent`, `update`, `remove`, `simplify`, `refactor`.
- **DO NOT use past tense or third person**: Never use `added`, `adds`, `fixed`, `fixes`, `updated`, `updates`.
- **Example:** `fix(client-point): clear anchor ref when disabled and closed`

### 4.4. Breaking Change Indicator: `!`

- A breaking change **MAY** be indicated in the header by appending a `!` immediately before the required `:`.
- See Section 6 for full details on handling breaking changes.
- **Example:** `feat(arrow)!: simplify useArrow to only require context`

---

## 5. The Body

- A longer commit `body` **MAY** be provided after the short description.
- If included, the body **MUST** begin one blank line after the description line.
- The body is free-form and **MAY** consist of any number of newline-separated paragraphs. It is used to provide additional context, explain the "why" behind a change, and detail its effects.

---

## 6. Footers

- One or more `footers` **MAY** be provided after the body.
- If included, they **MUST** begin one blank line after the body (or one blank line after the description, if no body is present).
- Each footer **MUST** consist of a `token`, a `separator`, and a `string value`.
  - **Token**: The token **MUST** use a hyphen (`-`) in place of whitespace (e.g., `Reviewed-by`). An exception is `BREAKING CHANGE`.
  - **Separator**: The separator **MUST** be either `: ` (a colon followed by a space) or ` #` (a space followed by a hash).
  - **Value**: The value is a string that follows the separator. It **MAY** contain spaces and newlines.
- **Example:**
  ```
  Reviewed-by: Z. E. D.
  Refs #123
  ```

---

## 7. Rule: Handling Breaking Changes

Breaking changes **MUST** be indicated in one of two ways. These are critical for versioning.

### Method 1: In the Header (`!`)

- A `!` **MAY** be appended to the `type`/`scope` prefix.
- If this method is used, the commit `description` **SHALL** be used to describe the breaking change.
- **Example:**

  ```
  feat(auth)!: switch to OAuth2 for authentication

  The previous API key authentication is now removed. All clients must be updated to use the new OAuth2 flow.
  ```

### Method 2: In the Footer

- A `BREAKING CHANGE` entry **MAY** be included in the footer.
- This footer entry **MUST** consist of the uppercase text `BREAKING CHANGE`, followed by a colon, a space, and a description.
- The token `BREAKING-CHANGE` **MUST** be treated as a synonym for `BREAKING CHANGE`.
- **Example:**

  ```
  perf: improve database query performance

  Indexes were added to user and product tables.

  BREAKING CHANGE: The 'user_email' column has been renamed to 'email_address'.
  ```

---

## 8. Special Scenarios

### 8.1. Reverting Commits

Handling revert commits requires a specific convention.

- The type **MUST** be `revert`.
- The body **SHOULD** explain why the code is being reverted.
- The footer **MUST** reference the SHA(s) of the commit(s) being reverted.

**Example:**

```
revert: let us never again speak of the noodle incident

This reverts the feature that caused a data corruption bug in production environments. We will re-evaluate the approach in a future sprint.

Refs: <sha-of-reverted-commit>
```

---

## 9. Semantic Versioning (SemVer) Implications

The commit type directly influences automated versioning. The agent **MUST** select the type with the following SemVer impact in mind:

- **`fix`**: A commit of type `fix` **SHOULD** be translated to a **PATCH** release (e.g., 1.0.0 -> 1.0.1 or 0.13.0 -> 0.13.1).
- **`feat`**: A commit of type `feat` **SHOULD** be translated to a **MINOR** release (e.g., 1.0.0 -> 1.1.0 or 0.13.0 -> 0.14.0).
- **`BREAKING CHANGE`**: A commit with a `!` in the header or a `BREAKING CHANGE:` footer, regardless of type, translates to a **MAJOR** release in stable versions (e.g., 1.0.0 -> 2.0.0). Note that during the pre-1.0 (`0.x`) phase, the project follows the "infinite minor" pattern where breaking changes increment minor versions until the `1.0.0` milestone.

## 10. Error Handling

If a commit is generated that does not meet this specification (e.g., using a typo like `feet` instead of `feat`), it will be missed by tools that rely on the spec. Correctness is paramount.

---

## 11. Full Examples

Scopes, module names, and SHAs below illustrate message **shape** only — they are not a claim about the current codebase. Resolve real scopes per §4.2 (`git ls-tree`, `git log`) and real SHAs with `git log` / `git rev-parse`.

### Example 1: Simple Library Fix

```
fix(client-point): clear anchor ref when disabled and not open
```

### Example 2: Library Feature with Scope and Body

```
feat(hover): add safe polygon side inference

Infers the safe polygon exit side directly from bounding geometry when explicit
side is omitted, preventing unexpected dismissals during diagonal pointer tracking.
```

### Example 3: Breaking Change using `!`

```
feat(arrow)!: simplify useArrow to only require context

Removes the standalone element option in favor of extracting arrowEl directly from
floating context refs.
```

### Example 4: Commit with Body and Footers (including Breaking Change)

```
feat(<module>)!: centralize <capability> handling behind one composable

BREAKING CHANGE: Standalone <capability> options have been replaced by the unified composable API.
```

### Example 5: Maintainer / AI Agent Skill or Workflow (Never use `feat`)

```
chore(skills): add diagnose skill for bug reproduction workflows

Adds the diagnose skill instructions and harness guidance under .agents/skills/diagnose.
```
