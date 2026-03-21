# Commit Message Rules

When generating Git commit messages for this repository, follow Conventional Commits.

## Header

- Use the format: `type(scope)!: description`
- `type` is required and should be lowercase.
- Use `feat` for new features.
- Use `fix` for bug fixes.
- Common additional types include `build`, `chore`, `ci`, `docs`, `perf`, `refactor`, `revert`, `style`, and `test`.
- `scope` is optional and, if used, should be a noun in parentheses.
- `description` must be short, imperative, and should not end with a period.

## Body

- Add a body when extra context is useful.
- Start the body after one blank line.
- Use it to explain the why, impact, or implementation details.

## Footers

- Add footers after one blank line from the body, or after the header if there is no body.
- Use `Token: value` or `Token #value` format.
- Use `BREAKING CHANGE: ...` for breaking changes when needed.

## Breaking Changes

- Mark breaking changes either with `!` in the header or with a `BREAKING CHANGE:` footer.
- If the header uses `!`, the description should clearly describe the breaking change.

## Reverts

- Use `revert` as the type for revert commits.
- Explain the reason in the body when useful.
- Reference the reverted commit SHA(s) in the footer.

## SemVer Guidance

- While the library is still in 0.x, treat the version line as unstable and expect breaking changes to happen frequently.
- In that pre-1.0 phase, prefer the "infinite minor" pattern: keep releasing within 0.x and use minor bumps to signal ongoing API evolution instead of reserving every breaking change for a major version.
- `fix` should still map to a patch release.
- `feat` should still map to a minor release.
- Once the project declares stability with 1.0.0, any breaking change should map to a major release.
