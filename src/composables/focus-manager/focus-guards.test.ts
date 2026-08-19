import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFocusGuards } from "./focus-guards";

const trackedElements: HTMLElement[] = [];

function trackElement<T extends HTMLElement>(el: T): T {
  trackedElements.push(el);
  return el;
}

function clearTrackedElements() {
  for (const el of [...trackedElements].reverse()) {
    if (el.isConnected) {
      el.remove();
    }
  }
  trackedElements.length = 0;
}

describe("createFocusGuards", () => {
  let container: HTMLDivElement;
  let floatingEl: HTMLDivElement;

  beforeEach(() => {
    container = trackElement(document.createElement("div"));
    floatingEl = trackElement(document.createElement("div"));
    floatingEl.id = "floating";

    container.appendChild(floatingEl);
    document.body.appendChild(container);
  });

  afterEach(() => {
    clearTrackedElements();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it("inserts start and end focus guards around the floating element", () => {
    const onFocus = vi.fn();
    const { startGuard, endGuard, remove } = createFocusGuards(floatingEl, onFocus);

    expect(floatingEl.previousElementSibling).toBe(startGuard);
    expect(floatingEl.nextElementSibling).toBe(endGuard);
    expect(startGuard.getAttribute("tabindex")).toBe("0");
    expect(startGuard.getAttribute("aria-hidden")).toBe("true");
    expect(startGuard.getAttribute("data-vfloat-focus-guard")).toBe("start");
    expect(endGuard.getAttribute("data-vfloat-focus-guard")).toBe("end");

    remove();
    expect(startGuard.isConnected).toBe(false);
    expect(endGuard.isConnected).toBe(false);
  });

  it("invokes onFocus callback with correct guard type when focused", () => {
    const onFocus = vi.fn();
    const { startGuard, endGuard, remove } = createFocusGuards(floatingEl, onFocus);

    startGuard.dispatchEvent(new FocusEvent("focus"));
    expect(onFocus).toHaveBeenCalledWith("start", expect.any(FocusEvent));

    endGuard.dispatchEvent(new FocusEvent("focus"));
    expect(onFocus).toHaveBeenCalledWith("end", expect.any(FocusEvent));

    remove();
  });
});
