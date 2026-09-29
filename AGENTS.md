# VFloat Agent Guide

## Project Overview

- **Project:** VFloat
- Headless floating UI engine built on Vue 3.5 reactivity. Inspired by Floating UI, but with an independent API, composable architecture, and design model.

## Explicit Communication & User Agency

- **No Silent Changes**: Never make silent, unrequested modifications to files, configurations, or working state (e.g., altering user-authored configs during a commit request, refactoring code outside the prompt scope).
- **Proactive Reporting with User Decision**: When identifying something that appears incorrect, deprecated, suboptimal, or broken:
  1. Clearly raise the observation and context to the user.
  2. Explain why a change might be beneficial (along with any alternatives or tradeoffs).
  3. Leave the final decision to the user before applying any changes.
- **Respect User Intent**: When given a specific task (such as staging/committing a change or running a script), execute the requested action without unilaterally modifying the underlying subject unless explicitly asked.
- **Preserve Pre-existing & External Changes**: Never unilaterally discard, revert, clean (`git checkout`, `git restore`, `git reset`, `git clean`), or overwrite uncommitted changes or working-state edits not introduced by the active agent session (e.g., changes authored by the user or a collaborating agent):
  - **Unrelated files**: Completely ignore them. Never revert, touch, format, clean up, or stage them.
  - **Active/target file**: If pre-existing modifications are present in a file the agent is editing, do not discard or overwrite them. Proactively report the existing diff to the user, explain any conflict or overlap with the current task, and let the user decide how to proceed before applying changes.
- **Strict Staging Isolation**: When asked to commit changes, strictly stage only the specific files modified by the agent as part of the active task (`git add <specific-files>`). Never use blanket commands (`git add .` / `git add -A`) or stage pre-existing unstaged/user-authored changes unless explicitly instructed to commit everything.
- **Rollback Scope Boundary**: When asked to revert, reset, or roll back changes, strictly target only the modifications or commits introduced during the active task. Never reset beyond the task boundary or discard user commits without explicit confirmation.
- **Pragmatic Scope Discipline**: When investigating or hardening architectural concerns (such as cross-realm or SSR safety), focus strictly on realistic library use cases (such as elements inside same-origin iframes, portals, and SVG anchors). Do not over-engineer or divert focus into irrelevant or near-impossible scenarios (such as cross-origin security restrictions, obscure XML parsers, or synthetic mocks) unless explicitly requested.
- **Proactive ADR Suggestions**: When an architectural change, interaction model, cross-realm/SSR strategy, or breaking design shift meets the ADR criteria defined in [`architecture-decision-records`](.agents/skills/architecture-decision-records/SKILL.md), proactively suggest drafting an ADR before finalizing the task. Always state the concrete rationale, recommended group, and proposed title, and await user confirmation.
- **RFC Isolation & Non-Authority**: Files in `RFC/` are historical, write-once proposal drafts and discarded exploratory ideas. They are **never** a source of truth for existing library behavior, APIs, or architecture. Agents **must never** read, search, cite, or consult files in `RFC/` during feature implementation, bug fixes, or refactoring unless the user explicitly instructs to inspect or write an RFC. The authoritative sources of truth are exclusively the living code in `packages/vue/src/`, test suites, documentation in `docs/`, and settled records in `ADR/`.

## Specialized Skills & Rules Index

Consult the authoritative skills and rules for domain-specific tasks rather than relying on inline summaries:

- **Composable Architecture & File Structure**: Follow [`vfloat-file-structure`](.agents/skills/vfloat-file-structure/SKILL.md) for 5-stage module sequencing, section banners, pure helper boundaries, module encapsulation/export discipline, options normalization, reactivity economy, cross-realm (iframe) safety, and SSR environment safety.
- **Testing Standards**: Follow [`vfloat-test-standards`](.agents/skills/vfloat-test-standards/SKILL.md) and [`.agents/rules/testing-standards.md`](.agents/rules/testing-standards.md) for Behavior-Driven Development (BDD) hierarchy (`Feature:` -> `Scenario:` -> `Given/When/Then`), test tier classification (P/S/I), fixture factories, and Vitest Browser Mode validation.
- **Commit Messages**: Follow [`.agents/rules/commit-message.md`](.agents/rules/commit-message.md) for the Conventional Commits specification, scope definitions, and SemVer mappings.
- **Architecture Decision Records**: Follow [`architecture-decision-records`](.agents/skills/architecture-decision-records/SKILL.md) when proposing, documenting, or superseding durable architectural choices in `ADR/`.
- **RFC Proposals**: Follow [`rfc-writer`](.agents/skills/rfc-writer/SKILL.md) only when explicitly instructed to write or review a proposal in `RFC/`.
- **Documentation**: Follow [`documentation-writer`](.agents/skills/documentation-writer/SKILL.md) when creating, updating, or reviewing documentation in `docs/api` or `docs/guide`.
- **Bug Diagnosis**: Follow [`diagnose`](.agents/skills/diagnose/SKILL.md) for disciplined bug reproduction and root-cause analysis loops.
- **Execution Economy & Deliberation**: Follow [`.agents/rules/execution-economy.md`](.agents/rules/execution-economy.md) for deliberation-first reasoning, upfront context planning, single-pass file reading, and tool call minimization.

## Development Toolchain & Workflows

This project uses `pnpm` alongside **OXC** (`oxlint` and `oxfmt`), **Vitest** (Browser Mode via Playwright/Chromium), and **Vite**.

- **Dependencies**: `pnpm install`
- **Development**: `pnpm dev`
- **Build**: `pnpm build`
- **Lint & Format**: `pnpm lint`, `pnpm lint:fix`, `pnpm format`
- **Tests**:
  - Run all tests: `pnpm run test:run`
  - Run targeted test file: `pnpm test:run <fileName>`
  - Run SSR tests: `pnpm run test:ssr`
- **Documentation**: `pnpm docs:build`, `pnpm docs:lint`, `pnpm docs:format`

### Proportional Validation Policy

- **Non-executable edits** (markdown docs, comments, rules, skills, configuration notes): Run no tests.
- **Behavioral changes in `packages/vue/src/`**: Run `pnpm lint` plus the targeted test spec for the touched feature (and `pnpm run test:ssr` if SSR/cross-realm/timer logic changed).
- **Cross-cutting changes** (shared core, build configuration, multi-package refactors): Run the full validation suite (`pnpm lint`, `pnpm run test:ssr`, `pnpm test:run`).
