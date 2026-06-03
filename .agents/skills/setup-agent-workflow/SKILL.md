---
name: setup-agent-workflow
description: Set up or refresh VFloat's markdown AFK issue workflow, including AGENTS.md guidance, .agents issue tracker docs, workflow docs, and skill integration. Use when installing, repairing, or migrating the agent workflow.
disable-model-invocation: true
---

# Setup Agent Workflow

Use this skill to set up or refresh the repo-level AFK issue workflow.

## Process

1. Inspect current files:
   - `AGENTS.md`
   - `.agents/issue-tracker.md`
   - `.agents/triage-labels.md`
   - `.agents/workflows/afk-issue-loop.md`
   - `.agents/skills/*/SKILL.md`
   - `.scratch/`
2. Preserve existing issue files. Do not bulk-migrate `.scratch` unless the
   user explicitly asks.
3. Ensure `AGENTS.md` points agents to the workflow docs before creating,
   triaging, implementing, reviewing, or committing issue work.
4. Ensure `.agents/issue-tracker.md` documents the local markdown issue
   contract.
5. Ensure `.agents/triage-labels.md` separates triage roles from operational
   workflow statuses.
6. Ensure the role skills exist:
   - `agent-workflow`
   - `issue-worker`
   - `issue-reviewer`
   - `issue-committer`
7. Keep compatibility shims for older skill names when they are already in use.

## Done Criteria

- New issues can be created from the documented template.
- A markdown-capable non-Codex agent can implement one issue from the issue
  file plus `AGENTS.md`.
- Reviewer findings become durable issue files.
- Commit preparation stops for human approval before staging or committing.
