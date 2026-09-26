# ADR review checklist

Use this checklist to review an Architecture Decision Record before committing it.

## Step 1: Does this need an ADR?

- [ ] Does this choice set rules that future pull requests must follow?
- [ ] Is the decision settled and tested in code? (If you are still testing ideas, write a proposal in [`RFC/`](file:///c:/projects/VFloat/RFC) instead.)
- [ ] Is this bigger than a simple bug fix, small refactor, or dependency bump?
- [ ] Did you pick an existing group from [technical-areas.md](technical-areas.md)?

## Step 2: File format and generator checks

- [ ] Created using `pnpm adr:new` (not copied manually).
- [ ] The filename uses a 4-digit number like `0003-my-decision.md`.
- [ ] Frontmatter contains valid `status: accepted` (or `superseded`) and `date: YYYY-MM-DD`.
- [ ] Uses only the three standard headings: `## Context`, `## Decision`, and optionally `## Alternatives considered`.

## Step 3: Clear and simple writing

### Context
- [ ] Uses simple, direct sentences.
- [ ] Names the concrete problem, browser limitation, or Vue reactivity constraint.
- [ ] Mentions real VFloat modules when relevant (such as `useFloatingNode`, `usePosition`, `useDismiss`).
- [ ] If this replaces an older decision, links it clearly (for example: "Supersedes ADR-interactions-0001 because...").
- [ ] Explains the problem rather than describing developer diary steps.

### Decision
- [ ] Clearly states what we are choosing.
- [ ] Uses active, direct instructions ("Always resolve document through `ownerDocument`").
- [ ] Uses numbered lists for multi-step rules.
- [ ] Explains what rules future developers must follow.

### Alternatives considered
- [ ] Lists real alternatives that were tested or considered.
- [ ] Gives clear technical reasons for rejecting each option (for example: memory leaks in iframes, race conditions, bundle size).
- [ ] Omitted if there were no realistic alternatives.

## Step 4: Index and repository checks

- [ ] Ran `pnpm adr:index` to update [`ADR/README.md`](file:///c:/projects/VFloat/ADR/README.md).
- [ ] Ran `git status` to verify only the new ADR file and [`ADR/README.md`](file:///c:/projects/VFloat/ADR/README.md) were changed.
- [ ] Older ADR files were left untouched (except for an optional `status: superseded` change in frontmatter).

## Common traps to avoid

- **The status trap**: Trying to edit old ADR files whenever code changes. ADRs are immutable historical records. Always write a new record and forward-link.
- **The developer diary**: Writing a story about how you fixed a bug instead of stating lasting architectural rules.
- **The premature ADR**: Writing an ADR before the code is actually written and verified.
- **Fake alternatives**: Writing silly options (like "do nothing") just to fill out the section.
