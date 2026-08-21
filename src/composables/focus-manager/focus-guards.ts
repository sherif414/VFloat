import { isServer } from "@/shared/env";

//=======================================================================================
// 📌 Constants
//=======================================================================================

const FOCUS_GUARD_STYLES =
  "position:fixed;opacity:0;pointer-events:none;outline:none;top:0;left:0;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;";

//=======================================================================================
// 📌 Main
//=======================================================================================

/**
 * Injects invisible, offscreen focus sentinel elements before and after the floating element
 * to intercept Tab and Shift+Tab at the boundaries of portaled containers.
 *
 * @param floatingEl - The floating DOM element to enclose with focus guards.
 * @param onFocus - Callback invoked when a guard receives focus.
 * @returns Guard elements and a cleanup removal function.
 */
export function createFocusGuards(
  floatingEl: HTMLElement,
  onFocus: (type: FocusGuardType, event: FocusEvent) => void,
): FocusGuardHandles {
  if (isServer || !floatingEl) {
    return {
      startGuard: null,
      endGuard: null,
      remove: () => {},
    };
  }

  const doc = floatingEl.ownerDocument ?? (typeof document !== "undefined" ? document : null);
  if (!doc) {
    return {
      startGuard: null,
      endGuard: null,
      remove: () => {},
    };
  }

  const start = createGuardElement(doc, "start", (e) => onFocus("start", e));
  const end = createGuardElement(doc, "end", (e) => onFocus("end", e));

  floatingEl.before(start.el);
  floatingEl.after(end.el);

  const remove = () => {
    start.cleanup();
    end.cleanup();
  };

  return {
    startGuard: start.el,
    endGuard: end.el,
    remove,
  };
}

//=======================================================================================
// 📌 Helpers
//=======================================================================================

interface GuardElementHandle {
  el: HTMLSpanElement;
  cleanup: () => void;
}

function createGuardElement(
  doc: Document,
  type: FocusGuardType,
  onFocus: (e: FocusEvent) => void,
): GuardElementHandle {
  const guard = doc.createElement("span");
  guard.setAttribute("tabindex", "0");
  guard.setAttribute("aria-hidden", "true");
  guard.setAttribute("data-vfloat-focus-guard", type);
  guard.style.cssText = FOCUS_GUARD_STYLES;

  guard.addEventListener("focus", onFocus);

  const cleanup = () => {
    guard.removeEventListener("focus", onFocus);
    guard.remove();
  };

  return {
    el: guard,
    cleanup,
  };
}

//=======================================================================================
// 📌 Types
//=======================================================================================

export interface FocusGuardHandles {
  startGuard: HTMLElement | null;
  endGuard: HTMLElement | null;
  remove: () => void;
}

export type FocusGuardType = "start" | "end";
