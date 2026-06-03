# Triage Labels And Workflow Statuses

The skills use two related vocabularies:

- **Triage roles** decide whether an issue is clear, blocked on information, or
  suitable for AFK work.
- **Operational statuses** describe where an issue is inside the AFK loop.

## Category Roles

| Role          | Meaning                     |
| ------------- | --------------------------- |
| `bug`         | Something is broken.        |
| `enhancement` | New feature or improvement. |

## Triage State Roles

| Role              | Meaning                                                  |
| ----------------- | -------------------------------------------------------- |
| `needs-triage`    | Maintainer or triage agent needs to evaluate this issue. |
| `needs-info`      | Waiting on human input or reproduction details.          |
| `ready-for-agent` | Fully specified and ready for `issue-worker`.            |
| `ready-for-human` | Requires human judgment, credentials, or implementation. |
| `wontfix`         | Will not be actioned.                                    |

## Operational Workflow Statuses

| Status             | Owner                 | Meaning                                                     |
| ------------------ | --------------------- | ----------------------------------------------------------- |
| `in-progress`      | coordinator/worker    | A worker has claimed the issue.                             |
| `ready-for-review` | worker                | Implementation and validation are ready for review.         |
| `review-blocked`   | reviewer              | Follow-up issues must complete before this issue completes. |
| `completed`        | reviewer              | Implementation, validation, and review are complete.        |
| `ready-to-commit`  | coordinator/committer | A completed feature is ready for commit proposal prep.      |

Use the status strings exactly as written in markdown metadata.
