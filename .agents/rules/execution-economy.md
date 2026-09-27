---
trigger: always_on
description: Enforce deliberation-first reasoning, upfront context planning, and tool call economy
---

# Rules for Agent Deliberation & Execution Economy

Every tool call executed by an agent appends to the conversation history and re-uploads the entire accumulated transcript to the cloud on every subsequent turn. Tool calls scale context and network upload quadratically ($O(N^2)$).

To maintain high reasoning accuracy, eliminate redundant latency, and avoid excessive data consumption, all agents **MUST** follow these execution economy principles.

---

## 1. Deliberation-First (Think Before Tooling)

1. **Hypothesis Before Action**:
   - Before invoking tools to fix a failure or implement a feature, agents **MUST** analyze the stack trace or requirement mentally in reasoning.
   - Agents **MUST NOT** use terminal commands or speculative code edits as an external scratchpad to "see what happens."

2. **Mental Simulation Over Trial-and-Error**:
   - Mentally trace code execution and test paths before executing edits.
   - Confirm logic, variable bindings, and edge cases in thought before triggering a test run.

3. **Tool Necessity Check**:
   - Before dispatching any tool call, agents **MUST** ask: *"Can this be deduced from context already present in the conversation?"* If yes, avoid the tool call.

---

## 2. Upfront Context Gathering (Batch Over Micro-Fetch)

1. **Broad, Single-Pass Reading**:
   - When inspecting code or tests, agents **MUST** read files in full or in large contiguous chunks (up to the 800-line tool limit).
   - Agents **MUST NOT** micro-slice files into small 30–70 line fragments across repeated, serialized tool calls.

2. **Plan File Context Upfront**:
   - Identify the necessary test file, implementation composable, and shared fixtures upfront and read them in the first turn.

3. **Avoid Speculative Shotgun Grepping**:
   - Agents **MUST NOT** run broad recursive searches across `node_modules` or entire repositories when local type definitions and live source in `packages/vue/src/` are readily accessible.
   - Prefer inspecting module index files, exported types, and living source over shell-based grep hunting.

---

## 3. Batched Edits & Milestone-Based Verification

1. **Consolidated Edits**:
   - Group related modifications into cohesive, logical replacements.
   - Avoid making single-line micro-edits followed immediately by test runs.

2. **Milestone Verification (No Ping-Pong Testing)**:
   - Run verification commands (Vitest, lint, typecheck) **only at milestone boundaries** (e.g. after completing an entire test scenario or feature refactor).
   - Agents **MUST NOT** execute `pnpm test:run` or `pnpm lint` after every individual edit.

3. **Targeted Command Execution**:
   - Always run the most targeted test command possible (`pnpm test:run <fileName>`) to avoid flooding context with massive test suite outputs.
   - Run `pnpm lint` and multi-suite checks as a single final verification step before completing the task.
