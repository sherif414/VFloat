---
status: accepted
date: 2026-10-04
---

# Hull cone geometry and per-move target progress for hover corridors

## Context

Supersedes aspects of ADR-interactions-0004 regarding velocity-based intent and hardcoded vertex formulas.

Hover corridor traversal (`safePolygon`) in dropdowns and nested flyouts previously exhibited two major issues:
1. **Flaky and abrupt dismissals**: Intent detection evaluated pointer velocity against a 0.1 px/ms threshold on each move event. Because users naturally decelerate when approaching a target, and mouse dispatch rates vary across devices, a single slow frame prematurely dismissed the panel. Furthermore, a pending watchdog timer was not cancelled on cleanup, causing rapid re-entries across the anchor boundary to close unexpectedly.
2. **Excessively forgiving detection surface**: The corridor was constructed using hardcoded per-side vertex formulas (over 170 lines of branch logic) that generated a static trapezoid/triangle. Once inside this shape, the cursor could move in any direction (sideways, backwards, or in circles) without triggering dismissal, causing floating surfaces to remain open when users moved toward unrelated elements. Additionally, parking in the gap or immediately after leaving the anchor could keep the corridor open indefinitely.

## Decision

1. **Exact Convex Hull Travel Cone**:
   - Construct the safe corridor as the 2D convex hull of the leave point (padded by `buffer`) and the bounding box of the floating element (`buildCorridor`).
   - Replaces manual per-side coordinate offset branches with a unified geometric formula that is exact for every placement, alignment, and dimension without inflating beyond the floating element.
2. **Per-Move Target Progress & Directional Enforcement**:
   - Every pointer movement must stay within the travel cone AND decrease Euclidean distance to the floating panel (`distanceToRect`).
   - Moving sideways or retreating toward the anchor dismisses the corridor immediately, preventing sticky surfaces when moving in incorrect directions.
   - Filter micro-jitter (< 4px) to accommodate natural hand tremor without counting as target progress or triggering false closures.
3. **Progress-Based Watchdog Timer**:
   - Increase default `intentTimeout` to 100ms.
   - Arm the watchdog timer immediately upon entering the corridor, ensuring cursors that stop moving right after leaving the anchor are dismissed cleanly.
   - Rearm the watchdog only when real progress (>= 4px closer) is observed.
   - Cancel pending timers immediately on cleanup or state transitions to prevent stale dismissals across boundary crossings.
4. **Direct Gap Exemption**:
   - Exempt the direct shared rectangular span between anchor and floating element (`isInsideGap`) from directional progress checks. This allows minor lateral adjustments while crossing the gap without dismissing the panel.

## Alternatives considered

- **Per-frame velocity threshold (0.1 px/ms)**: rejected because pointer dispatch intervals are inconsistent across hardware and users naturally decelerate before reaching their target, causing frequent false dismissals.
- **Fixed angle / cone sector math**: rejected because computing trigonometric angles across asymmetrical rectangular bounding boxes is computationally heavier and less precise than 2D convex hull ray-casting.
- **Pure time-based grace period without directional checks**: rejected because it keeps surfaces open even when the user deliberately moves toward a different UI control.
