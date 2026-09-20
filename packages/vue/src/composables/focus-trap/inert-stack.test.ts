import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearTrackedElements, trackElement } from "@/test-utils";
import { isolateOutsideElements } from "./inert-stack";

describe("isolateOutsideElements", () => {
  let container: HTMLDivElement;
  let outsideEl: HTMLDivElement;
  let modalEl: HTMLDivElement;

  beforeEach(() => {
    container = trackElement(document.createElement("div"));
    outsideEl = trackElement(document.createElement("div"));
    outsideEl.id = "outside";

    modalEl = trackElement(document.createElement("div"));
    modalEl.id = "modal";

    document.body.append(container, outsideEl, modalEl);
  });

  afterEach(() => {
    clearTrackedElements();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it("isolates elements outside the allowed roots and restores on cleanup", () => {
    const handle = isolateOutsideElements([modalEl]);

    expect(outsideEl.hasAttribute("inert")).toBe(true);
    expect(container.hasAttribute("inert")).toBe(true);
    expect(modalEl.hasAttribute("inert")).toBe(false);

    handle.restore();

    expect(outsideEl.hasAttribute("inert")).toBe(false);
    expect(container.hasAttribute("inert")).toBe(false);
    expect(modalEl.hasAttribute("inert")).toBe(false);
  });

  it("traverses ancestors of allowed roots and isolates only outside branches", () => {
    const nestedParent = trackElement(document.createElement("div"));
    const nestedModal = trackElement(document.createElement("div"));
    const nestedSibling = trackElement(document.createElement("div"));

    nestedParent.append(nestedModal, nestedSibling);
    document.body.appendChild(nestedParent);

    const handle = isolateOutsideElements([nestedModal]);

    expect(nestedParent.hasAttribute("inert")).toBe(false);
    expect(nestedModal.hasAttribute("inert")).toBe(false);
    expect(nestedSibling.hasAttribute("inert")).toBe(true);
    expect(outsideEl.hasAttribute("inert")).toBe(true);

    handle.restore();

    expect(nestedSibling.hasAttribute("inert")).toBe(false);
    expect(outsideEl.hasAttribute("inert")).toBe(false);
  });

  it("uses aria-hidden fallback when preferInert is false", () => {
    const handle = isolateOutsideElements([modalEl], false);

    expect(outsideEl.getAttribute("aria-hidden")).toBe("true");
    expect(modalEl.hasAttribute("aria-hidden")).toBe(false);

    handle.restore();

    expect(outsideEl.hasAttribute("aria-hidden")).toBe(false);
  });

  it("handles empty allowed elements gracefully", () => {
    const handle = isolateOutsideElements([]);
    expect(outsideEl.hasAttribute("inert")).toBe(false);

    handle.restore();
    expect(outsideEl.hasAttribute("inert")).toBe(false);
  });

  it("reference-counts overlapping isolations so an early restore keeps the other trap inert", () => {
    const first = isolateOutsideElements([modalEl]);
    const second = isolateOutsideElements([modalEl]);

    expect(outsideEl.hasAttribute("inert")).toBe(true);

    first.restore();
    // Second trap is still open; the shared background node must stay inert.
    expect(outsideEl.hasAttribute("inert")).toBe(true);

    second.restore();
    expect(outsideEl.hasAttribute("inert")).toBe(false);
  });

  it("restores a pre-existing inert attribute and property instead of stripping them", () => {
    outsideEl.setAttribute("inert", "");
    (outsideEl as HTMLElement & { inert: boolean }).inert = true;

    const handle = isolateOutsideElements([modalEl]);
    handle.restore();

    expect(outsideEl.hasAttribute("inert")).toBe(true);
    expect((outsideEl as HTMLElement & { inert: boolean }).inert).toBe(true);
  });
});
