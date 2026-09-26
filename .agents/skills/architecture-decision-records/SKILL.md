---
name: architecture-decision-records
description: Create, update, supersede, and review VFloat Architecture Decision Records (ADRs) using grouped directories, standard templates, and the repository ADR generator. Use when documenting durable architectural constraints, settled technical decisions, public API contracts, or evaluating cross-cutting tradeoffs in ADR/.
---

# VFloat architecture decision records

Architecture Decision Records (ADRs) capture important technical choices in VFloat. They explain why we picked a specific solution, what rules future code must follow, and what alternatives we rejected.

ADRs prevent teams from re-arguing settled decisions. In VFloat, examples include how we handle same-origin iframes, how we coordinate hover corridor dismissal across nested menus, and why interaction composables mutate reactive state directly.

ADRs are historical records. They capture what we knew at the moment we made the choice. The living code in `packages/vue/src/` and the documentation in `docs/` show how VFloat works today.

For the background of this practice, see [Michael Nygard's Documenting Architecture Decisions](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions) and [Thoughtworks on Lightweight Architecture Decision Records](https://www.thoughtworks.com/radar/techniques/lightweight-architecture-decision-records).

---

## Where technical rationale belongs

Use this simple guide to pick the right place for your notes:

Format | Location | When to use | Lifecycle
:--- | :--- | :--- | :---
**ADR** | `ADR/<group>/<number>-<slug>.md` | Settled technical choices that limit how future code is written | Append-only, never rewritten
**RFC** | `RFC/<number>-<slug>.md` | Open proposals, exploratory designs, and early architecture audits | Edited while exploring, archived when settled
**Code comment** | Next to the code | Local notes on non-obvious code, edge cases, and workarounds | Changes whenever the code changes
**Documentation** | `docs/` | Complete, friendly guides and API references for users | Living documentation kept constantly up to date

Do not create an ADR for everyday bug fixes, small refactors, dependency updates, or internal helper details.

---

## Repository layout and key files

All ADR files live in the [`ADR/`](file:///c:/projects/VFloat/ADR) directory and use tooling in [`scripts/adr.ts`](file:///c:/projects/VFloat/scripts/adr.ts):

- [`ADR/README.md`](file:///c:/projects/VFloat/ADR/README.md): The generated table of contents, grouped by technical area.
- [`ADR/_template.md`](file:///c:/projects/VFloat/ADR/_template.md): The template used to generate new records.
- `ADR/<group>/<number>-<slug>.md`: The records themselves, organized into folders by technical area.
- [`scripts/adr.ts`](file:///c:/projects/VFloat/scripts/adr.ts): The script that runs `pnpm adr:new` and `pnpm adr:index`.

VFloat groups decisions into clear technical areas such as `architecture`, `positioning`, `interactions`, and `runtime`. Read [references/technical-areas.md](references/technical-areas.md) to pick the right folder or see when a new group is allowed.

---

## Operational workflows

### Workflow 1: Create a new ADR

Always generate records using the repository CLI. Never copy `_template.md` by hand.

1. **Check the output path first (optional)**:
   Use the `--dry-run` flag to see the folder and number without creating files:
   ```bash
   pnpm adr:new -- --group <group> --title "<short descriptive title>" --dry-run
   ```

2. **Generate the file**:
   ```bash
   pnpm adr:new -- --group <group> --title "<short descriptive title>"
   ```
   This script creates the file, picks the next number in that folder, fills in today's date, and updates [`ADR/README.md`](file:///c:/projects/VFloat/ADR/README.md).

3. **Fill in the sections**:
   Open the new file and complete the three standard sections:
   ```markdown
   ---
   status: accepted
   date: YYYY-MM-DD
   ---

   # Title

   ## Context

   What problem or limitation led to this decision?

   ## Decision

   What solution did we choose, and what rules must future code follow?

   ## Alternatives considered

   - Option name: specific technical reason we rejected it.
   ```

4. **Review your draft**:
   Check your text against [references/review-checklist.md](references/review-checklist.md) to make sure your points are clear, active, and specific.

5. **Ensure the index is up to date**:
   ```bash
   pnpm adr:index
   ```

---

### Workflow 2: Supersede an older decision

When requirements change and a previous architecture must be replaced, follow the forward-linking rule. Do not rewrite history.

1. **Generate the new ADR**:
   Run `pnpm adr:new` with the new choice.

2. **Link the old record in Context**:
   In the `## Context` of your new ADR, explain which decision is being replaced and what changed:
   ```markdown
   ## Context

   Supersedes ADR-interactions-0001. While per-instance event listeners handled simple outside clicks, they created race conditions when multiple floating menus were open at the same time.
   ```

3. **Optionally mark the old record**:
   You may open the old ADR and change `status: accepted` to `status: superseded` in its frontmatter. Do not edit or delete the body text of the old file.

4. **Update the index**:
   ```bash
   pnpm adr:index
   ```

---

### Workflow 3: Update the index

Whenever you add an ADR, rename a file, or change frontmatter status, refresh the index table:

```bash
pnpm adr:index
```

The script updates the table in [`ADR/README.md`](file:///c:/projects/VFloat/ADR/README.md) between the marker comments. Never edit that table by hand.

---

## How to write each section

Keep ADRs short, direct, and concrete. Use simple sentences.

### 1. Title
Use clear, active language that names the choice.
- Good: `Per-instance listeners for outside-click dismissal`
- Avoid: `Notes on click handling`

### 2. Context
Explain the concrete problem that forced a choice. Name the real components, browser limitations, or reactivity rules involved.

- Good example from [`ADR-architecture-0001`](file:///c:/projects/VFloat/ADR/architecture/0001-cross-realm-dom-and-iframe-environment-resolution.md):
  > VFloat composables interact with DOM nodes that may reside inside same-origin iframes, portals, or detached windows. Initially, VFloat explored a multi-tenant `createStackManager` using `WeakMap<Document, Manager>`. However, iframes execute within their own JavaScript realms with isolated module instances, giving us natural runtime isolation.

### 3. Decision
State the chosen solution clearly. Use numbered lists for multi-step rules. Future maintainers read this to know what they must not break.

- Good example from [`ADR-interactions-0004`](file:///c:/projects/VFloat/ADR/interactions/0004-scoped-pointer-events-shielding-and-watchdog-intent-model-for-hover-corridors.md):
  > 1. Restrict pointer shielding to the safe polygon corridor rather than covering the whole viewport.
  > 2. Track pointer speed using a 100ms watchdog timer so rapid mouse exits dismiss immediately.

### 4. Alternatives considered
List the real options you investigated and explain why each was rejected. If there were no realistic alternatives, delete this heading.

- Good: `Global window listeners: rejected because clicks inside same-origin iframes do not bubble to the parent window.`
- Avoid: `Do nothing: rejected because it does not work.`

---

## Avoiding the status trap

ADRs are snapshots in time. They are not living state machines.

- **Do not audit old files**: You do not need to hunt down and re-edit every old ADR when the project changes direction.
- **Forward-link instead**: Document the shift in the new ADR.
- **Never delete records**: Even when an approach is replaced, the old ADR remains valuable because it shows why the team made that choice at that time.

---

## Final verification

Before submitting your ADR:

1. File is in `ADR/<group>/` with a 4-digit number (for example `0002-name.md`).
2. Only standard sections are used (`Context`, `Decision`, `Alternatives considered`).
3. Sentences are short and simple.
4. Technical keywords reflect real VFloat modules (`useFloatingNode`, `usePosition`, `useDismiss`).
5. `pnpm adr:index` runs cleanly and updates [`ADR/README.md`](file:///c:/projects/VFloat/ADR/README.md).
