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

  function onPointerMove(e: PointerEvent) {
    if (!isDragging.value || !currentSandboxEl) return;

    const dx = e.clientX - dragStartPointer.x;
    const dy = e.clientY - dragStartPointer.y;

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

  function onPointerUp() {
    isDragging.value = false;
    if (typeof window !== "undefined") {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    }
  }

  function onAnchorPointerDown(
    e: PointerEvent,
    sandboxEl: HTMLElement | null,
    onUpdate?: () => void,
  ) {
    if (e.button !== 0) return;
    isDragging.value = true;
    currentSandboxEl = sandboxEl;
    updateCallback = onUpdate;
    dragStartPointer = { x: e.clientX, y: e.clientY };
    dragStartOffset = { ...anchorOffset.value };

    if (typeof window !== "undefined") {
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
    }
  }

  function resetAnchorPosition(onUpdate?: () => void) {
    anchorOffset.value = { x: 0, y: 0 };
    void nextTick(() => {
      onUpdate?.();
    });
  }

  onBeforeUnmount(() => {
    if (typeof window !== "undefined") {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    }
  });

  return {
    anchorOffset,
    isDragging,
    onAnchorPointerDown,
    resetAnchorPosition,
  };
}
