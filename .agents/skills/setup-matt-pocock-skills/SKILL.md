---
name: setup-matt-pocock-skills
description: Compatibility shim for older prompts that mention setup-matt-pocock-skills. Use setup-agent-workflow instead to configure VFloat's markdown AFK issue workflow, .agents docs, and AGENTS.md integration.
disable-model-invocation: true
---

# Compatibility Shim

This repo now uses the VFloat AFK issue workflow as the canonical agent setup.

When a user invokes or references `setup-matt-pocock-skills`, do not recreate
the older setup flow. Use `.agents/skills/setup-agent-workflow/SKILL.md`
instead.

## Handoff

1. Read `.agents/skills/setup-agent-workflow/SKILL.md`.
2. Preserve existing `.scratch` issues.
3. Ensure `AGENTS.md`, `.agents/issue-tracker.md`,
   `.agents/triage-labels.md`, and `.agents/workflows/afk-issue-loop.md`
   describe the current workflow.

The old skill name remains only so existing prompts and references do not break.
