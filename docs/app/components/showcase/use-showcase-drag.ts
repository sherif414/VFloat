import { nextTick, onBeforeUnmount, type Ref, ref } from "vue";

export interface ShowcaseDragReturn {
  anchorOffset: Ref<{ x: number; y: number }>;
  isDragging: Ref<boolean>;
  onAnchorPointerDown: (
    e: PointerEvent,
    sandboxEl: HTMLElement | null,
    onUpdate?: () => void,
  ) => void;
  resetAnchorPosition: (onUpdate?: () => void) => void;
}

export function useShowcaseDrag(): ShowcaseDragReturn {
  const anchorOffset = ref({ x: 0, y: 0 });
  const isDragging = ref(false);
  let dragStartPointer = { x: 0, y: 0 };
  let dragStartOffset = { x: 0, y: 0 };
  let currentSandboxEl: HTMLElement | null = null;
  let updateCallback: (() => void) | undefined;
  let activePointerId: number | null = null;
  let capturedTarget: HTMLElement | null = null;
  let hasMoved = false;

  function onPointerMove(e: PointerEvent) {
    if (!isDragging.value || !currentSandboxEl) return;
    if (activePointerId !== null && e.pointerId !== activePointerId) return;

    const dx = e.clientX - dragStartPointer.x;
    const dy = e.clientY - dragStartPointer.y;

    if (!hasMoved && Math.hypot(dx, dy) > 4) {
      hasMoved = true;
    }

    const sandboxRect = currentSandboxEl.getBoundingClientRect();
    const maxExtentX = Math.max(0, sandboxRect.width / 2 - 30);
    const maxExtentY = Math.max(0, sandboxRect.height / 2 - 25);

    const rawX = dragStartOffset.x + dx;
    const rawY = dragStartOffset.y + dy;

    anchorOffset.value = {
      x: Math.max(-maxExtentX, Math.min(maxExtentX, rawX)),
      y: Math.max(-maxExtentY, Math.min(maxExtentY, rawY)),
    };

    updateCallback?.();
  }

  function cleanupListeners() {
    if (typeof window !== "undefined") {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    }
    if (capturedTarget && activePointerId !== null) {
      try {
        if (capturedTarget.hasPointerCapture(activePointerId)) {
          capturedTarget.releasePointerCapture(activePointerId);
        }
      } catch {
        // Ignore failure if already released
      }
      capturedTarget = null;
    }
    activePointerId = null;
  }

  function onPointerUp() {
    isDragging.value = false;
    cleanupListeners();

    if (hasMoved && typeof window !== "undefined") {
      // Suppress trailing click event after dragging so popovers/menus do not toggle unintentionally
      const preventClick = (clickEvent: MouseEvent) => {
        clickEvent.preventDefault();
        clickEvent.stopPropagation();
        clickEvent.stopImmediatePropagation();
      };
      window.addEventListener("click", preventClick, { capture: true, once: true });
      window.setTimeout(() => {
        window.removeEventListener("click", preventClick, { capture: true });
      }, 120);
    }
  }

  function onAnchorPointerDown(
    e: PointerEvent,
    sandboxEl: HTMLElement | null,
    onUpdate?: () => void,
  ) {
    if (e.button !== 0 || !e.isPrimary) return;
    isDragging.value = true;
    hasMoved = false;
    currentSandboxEl = sandboxEl;
    updateCallback = onUpdate;
    activePointerId = e.pointerId;
    dragStartPointer = { x: e.clientX, y: e.clientY };
    dragStartOffset = { ...anchorOffset.value };

    const target = e.currentTarget as HTMLElement | null;
    if (target?.setPointerCapture) {
      try {
        target.setPointerCapture(e.pointerId);
        capturedTarget = target;
      } catch {
        capturedTarget = null;
      }
    }

    if (typeof window !== "undefined") {
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
      window.addEventListener("pointercancel", onPointerUp);
    }
  }

  function resetAnchorPosition(onUpdate?: () => void) {
    anchorOffset.value = { x: 0, y: 0 };
    void nextTick(() => {
      onUpdate?.();
    });
  }

  onBeforeUnmount(() => {
    cleanupListeners();
  });

  return {
    anchorOffset,
    isDragging,
    onAnchorPointerDown,
    resetAnchorPosition,
  };
}
