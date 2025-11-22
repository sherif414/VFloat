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
- The type `feat` **MUST** be used when a commit adds a new feature.
- The type `fix` **MUST** be used when a commit represents a bug fix.
- Other types **MAY** be used. **RECOMMENDED** types include:
  - `build`: Changes that affect the build system or external dependencies.
  - `chore`: Other changes that don't modify source or test files.
  - `ci`: Changes to CI configuration files and scripts.
  - `docs`: Documentation only changes.
  - `perf`: A code change that improves performance.
  - `refactor`: A code change that neither fixes a bug nor adds a feature.
  - `revert`: Indicates that a previous commit has been reverted (see Section 8.1).
  - `style`: Changes that do not affect the meaning of the code (white-space, formatting, etc).
  - `test`: Adding missing tests or correcting existing tests.

### 4.2. Scope

- A `scope` **MAY** be provided after a type.
- If provided, the scope **MUST** consist of a noun describing a section of the codebase, surrounded by parentheses.
- **Example:** `feat(api):` or `fix(parser):`

### 4.3. Description

- A `description` **MUST** immediately follow the colon and space after the `type`/`scope`.
- It **MUST** be a short, imperative-mood summary of the code changes.
- It **SHOULD NOT** be capitalized or end with a period.
- **Example:** `fix: correct array parsing issue for multi-space strings`

### 4.4. Breaking Change Indicator: `!`

- A breaking change **MAY** be indicated in the header by appending a `!` immediately before the required `:`.
- See Section 6 for full details on handling breaking changes.
- **Example:** `refactor(auth)!: drop support for JWT tokens`

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

Refs: 676104e, a215868
```

---

## 9. Semantic Versioning (SemVer) Implications

The commit type directly influences automated versioning. The agent **MUST** select the type with the following SemVer impact in mind:

- **`fix`**: A commit of type `fix` **SHOULD** be translated to a **PATCH** release (e.g., 1.0.0 -> 1.0.1).
- **`feat`**: A commit of type `feat` **SHOULD** be translated to a **MINOR** release (e.g., 1.0.0 -> 1.1.0).
- **`BREAKING CHANGE`**: A commit with a `!` in the header or a `BREAKING CHANGE:` footer, regardless of type, **MUST** be translated to a **MAJOR** release (e.g., 1.0.0 -> 2.0.0).

## 10. Error Handling

If a commit is generated that does not meet this specification (e.g., using a typo like `feet` instead of `feat`), it will be missed by tools that rely on the spec. Correctness is paramount.

---

## 11. Full Examples

### Example 1: Simple Fix

```
fix: prevent racing condition when updating user cache
```

### Example 2: Feature with Scope and Body

```
feat(images): add support for WebP image format

This introduces a new image processing library to handle WebP conversion.
The default output quality is set to 80%, but this can be configured via the new `IMAGE_QUALITY` environment variable.
```

### Example 3: Breaking Change using `!`

```
refactor(config)!: migrate configuration from XML to YAML

The application no longer supports `config.xml`. All configuration must now be placed in `config.yaml`. The schema for the new configuration is detailed in the updated documentation.
```

### Example 4: Commit with Body and Footers (including Breaking Change)

```
chore: update build process to new linter

The previous linter (OldLinter) has been deprecated and is replaced by NewLinter for better performance and more comprehensive rules.

This also involved updating the CI pipeline configuration.

Reviewed-by: Jane Doe <jane.doe@example.com>
Fixes: #432
BREAKING CHANGE: The `.oldlinterrc` configuration file is no longer supported. All custom rules must be migrated to the `.newlinter.json` format.
```
