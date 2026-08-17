//=======================================================================================
// 📌 Main
//=======================================================================================

export interface FocusGuardHandles {
  startGuard: HTMLElement;
  endGuard: HTMLElement;
  remove: () => void;
}

export type FocusGuardType = "start" | "end";

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
  const startGuard = createGuardElement("start", (e) => onFocus("start", e));
  const endGuard = createGuardElement("end", (e) => onFocus("end", e));

  const parent = floatingEl.parentNode;
  if (parent) {
    parent.insertBefore(startGuard, floatingEl);
    if (floatingEl.nextSibling) {
      parent.insertBefore(endGuard, floatingEl.nextSibling);
    } else {
      parent.appendChild(endGuard);
    }
  }

  const remove = () => {
    startGuard.remove();
    endGuard.remove();
  };

  return {
    startGuard,
    endGuard,
    remove,
  };
}

//=======================================================================================
// 📌 Helpers
//=======================================================================================

function createGuardElement(
  type: FocusGuardType,
  onFocus: (e: FocusEvent) => void,
): HTMLSpanElement {
  const guard = document.createElement("span");
  guard.setAttribute("tabindex", "0");
  guard.setAttribute("aria-hidden", "true");
  guard.setAttribute("data-vfloat-focus-guard", type);

  // Style off-screen, invisible, but technically focusable by the browser
  guard.style.position = "fixed";
  guard.style.opacity = "0";
  guard.style.pointerEvents = "none";
  guard.style.outline = "none";
  guard.style.top = "0";
  guard.style.left = "0";
  guard.style.width = "1px";
  guard.style.height = "1px";
  guard.style.padding = "0";
  guard.style.margin = "-1px";
  guard.style.overflow = "hidden";
  guard.style.clip = "rect(0, 0, 0, 0)";
  guard.style.whiteSpace = "nowrap";
  guard.style.border = "0";

  guard.addEventListener("focus", onFocus);

  return guard;
}
