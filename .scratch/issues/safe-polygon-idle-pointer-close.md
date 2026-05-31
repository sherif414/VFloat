# safePolygon: idle pointer inside safe area does not close the floating element

Status: `needs-triage`
Type: `enhancement`

## Problem

When the user stops moving the pointer while inside the safe polygon boundaries (the corridor between anchor and floating element), the floating element stays open indefinitely.

The current slow-cursor detection in `bridge.ts` (lines 168–190) only fires on `pointermove` events. If the pointer enters the safe polygon area, moves slowly enough to trigger the 40ms timeout, but then **stops entirely**, no further `pointermove` events fire — so the handler never re-evaluates and the timeout set at line 186 only covers the last detected slow movement, not full pointer idleness.

### Scenario

1. User hovers the anchor → floating element opens.
2. User moves pointer toward the floating element (within the safe polygon).
3. User **stops moving** mid-corridor.
4. **Expected**: floating element closes after a brief idle period.
5. **Actual**: floating element stays open indefinitely until the user moves again (either into the floating element, out of the polygon, or out of the viewport).

## Current behavior

The `onMouseMove` handler in `bridge.ts` checks `getCursorSpeed()` and schedules a 40ms close timeout when `speed < 0.1`. But this only helps when the pointer is _still moving slowly_ — if the pointer fully stops, no new `pointermove` events arrive to trigger the close.

Relevant code: [`bridge.ts:168–190`](file:///c:/projects/VFloat/src/composables/hover/polygon/bridge.ts#L168-L190)

## Design question

Should the floating element close when the pointer goes idle inside the safe polygon? Two behaviors to consider:

1. **Close after idle timeout** — if no `pointermove` fires for N ms while the pointer is inside the safe polygon (but not inside the floating element), close automatically. This matches the intuition that the user "gave up" moving toward the floating element.

2. **Keep open** (current) — the safe polygon only rejects exit; if you're in it, you're "safe" regardless of motion. The user must explicitly leave the polygon area or move into the floating element.

Floating UI's `safePolygon` (the inspiration) also does not close on idle — so this would be a VFloat-specific enhancement.

## Possible approach

Add a secondary idle timer that starts or resets on each `pointermove` inside the safe polygon. If the timer expires without a new `pointermove`, call `close()`. The timer duration could be configurable via a new `idleMs` option on `SafePolygonOptions`, defaulting to something like `300–500ms` or `0` (disabled) to preserve backward compatibility.
