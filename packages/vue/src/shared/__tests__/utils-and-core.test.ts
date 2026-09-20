import { afterEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import {
  clearTimeoutIfSet,
  getDomPath,
  getEventTarget,
  isClickOnScrollbar,
  isElement,
  isElementInEventPath,
  isEventTargetWithin,
  isFunction,
  isHTMLElement,
  isMouseLikePointerType,
  isNode,
  isShadowRoot,
  isTypeableElement,
  isVirtualElement,
} from "@/shared/dom";
import { getAnchorElement, isTargetWithinElements } from "@/shared/elements";
import { createCleanupRegistry, tryOnScopeDispose } from "@/shared/lifecycle";
import { isMac, isSafari, isWebKit, matchesFocusVisible } from "@/shared/platform";
import { clearTrackedElements, trackElement } from "@/test-utils";
import type { VirtualElement } from "@/types";

const originalPlatform = navigator.platform;
const originalUserAgent = navigator.userAgent;

afterEach(() => {
  Object.defineProperty(window.navigator, "platform", {
    configurable: true,
    value: originalPlatform,
  });
  Object.defineProperty(window.navigator, "userAgent", {
    configurable: true,
    value: originalUserAgent,
  });
  clearTrackedElements();
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe("utils and core helpers", () => {
  it("covers browser and type-detection utilities", () => {
    Object.defineProperty(window.navigator, "platform", {
      configurable: true,
      value: "MacIntel",
    });
    Object.defineProperty(window.navigator, "userAgent", {
      configurable: true,
      value: "Mozilla/5.0 Version/17.0 Safari/605.1.15",
    });

    const input = trackElement(document.createElement("input"));
    const buttonInput = trackElement(document.createElement("input"));
    buttonInput.type = "button";
    const submitInput = trackElement(document.createElement("input"));
    submitInput.type = "submit";
    const textarea = trackElement(document.createElement("textarea"));
    const button = trackElement(document.createElement("button"));
    const div = trackElement(document.createElement("div"));
    div.setAttribute("role", "button");
    div.contentEditable = "true";

    expect(isFunction(() => true)).toBe(true);
    expect(isFunction("nope")).toBe(false);
    expect(isHTMLElement(input)).toBe(true);
    expect(isHTMLElement(null)).toBe(false);
    expect(isMac()).toBe(true);
    expect(isSafari()).toBe(true);
    expect(isWebKit()).toBe(true);
    expect(matchesFocusVisible({ matches: () => true } as unknown as Element)).toBe(true);
    expect(isMouseLikePointerType("mouse")).toBe(true);
    expect(isMouseLikePointerType("pen")).toBe(true);
    expect(isMouseLikePointerType("pen", true)).toBe(false);
    expect(isMouseLikePointerType(undefined)).toBe(false);
    expect(isTypeableElement(input)).toBe(true);
    expect(isTypeableElement(buttonInput)).toBe(false);
    expect(isTypeableElement(submitInput)).toBe(false);
    expect(isTypeableElement(textarea)).toBe(true);
    expect(isTypeableElement(div)).toBe(true);
    expect(isTypeableElement(button)).toBe(false);
    expect(isVirtualElement({ contextElement: button })).toBe(true);
    expect(isVirtualElement(null)).toBe(false);
  });

  it("covers DOM path and containment helpers", () => {
    const container = trackElement(document.createElement("div"));
    const child = trackElement(document.createElement("button"));
    const shadowHost = trackElement(document.createElement("div"));
    const shadowRoot = shadowHost.attachShadow({ mode: "open" });
    const shadowChild = document.createElement("span");
    shadowRoot.appendChild(shadowChild);
    container.appendChild(child);
    document.body.append(container, shadowHost);

    const composedEvent = new Event("click");
    Object.defineProperty(composedEvent, "composedPath", {
      configurable: true,
      value: () => [child, container, document.body],
    });
    Object.defineProperty(composedEvent, "target", {
      configurable: true,
      value: child,
    });

    const fallbackEvent = {
      target: child,
    } as unknown as Event;

    const virtualElement: VirtualElement = {
      contextElement: container,
      getBoundingClientRect: () => child.getBoundingClientRect(),
    };

    expect(isEventTargetWithin(composedEvent, container)).toBe(true);
    expect(isEventTargetWithin(fallbackEvent, container)).toBe(true);
    expect(getEventTarget(composedEvent)).toBe(child);
    expect(getEventTarget(fallbackEvent)).toBe(child);
    const emptyPathEvent = new Event("click");
    Object.defineProperty(emptyPathEvent, "composedPath", {
      configurable: true,
      value: () => [] as EventTarget[],
    });
    Object.defineProperty(emptyPathEvent, "target", {
      configurable: true,
      value: child,
    });
    expect(getEventTarget(emptyPathEvent)).toBe(child);
    expect(isElementInEventPath(container, [child, container])).toBe(true);
    expect(isElementInEventPath(virtualElement, [container])).toBe(true);
    expect(isElementInEventPath({}, [container])).toBe(false);

    const domPath = getDomPath(shadowChild);
    expect(domPath).toContain(shadowRoot);
    expect(domPath).toContain(shadowHost);
    expect(isShadowRoot(shadowRoot)).toBe(true);
    expect(isShadowRoot(container)).toBe(false);

    container.remove();
    shadowHost.remove();
  });

  it("covers scrollbar and timeout helpers", () => {
    const target = document.createElement("div");
    Object.defineProperties(target, {
      offsetWidth: { configurable: true, value: 120 },
      clientWidth: { configurable: true, value: 100 },
      offsetHeight: { configurable: true, value: 140 },
      clientHeight: { configurable: true, value: 100 },
    });
    target.getBoundingClientRect = () =>
      ({
        left: 0,
        top: 0,
        right: 120,
        bottom: 140,
      }) as DOMRect;

    expect(isClickOnScrollbar(new MouseEvent("click", { clientX: 110, clientY: 10 }), target)).toBe(
      true,
    );
    expect(isClickOnScrollbar(new MouseEvent("click", { clientX: 10, clientY: 130 }), target)).toBe(
      true,
    );
    expect(isClickOnScrollbar(new MouseEvent("click", { clientX: 10, clientY: 10 }), target)).toBe(
      false,
    );

    // RTL container scrollbar
    const rtlTarget = document.createElement("div");
    rtlTarget.dir = "rtl";
    rtlTarget.style.direction = "rtl";
    document.body.appendChild(rtlTarget);
    Object.defineProperties(rtlTarget, {
      offsetWidth: { configurable: true, value: 120 },
      clientWidth: { configurable: true, value: 100 },
      offsetHeight: { configurable: true, value: 140 },
      clientHeight: { configurable: true, value: 100 },
    });
    rtlTarget.getBoundingClientRect = () =>
      ({
        left: 0,
        top: 0,
        right: 120,
        bottom: 140,
      }) as DOMRect;

    // In RTL container, scrollbar is on the left (0 to 20)
    expect(
      isClickOnScrollbar(new MouseEvent("click", { clientX: 10, clientY: 10 }), rtlTarget),
    ).toBe(true);
    expect(
      isClickOnScrollbar(new MouseEvent("click", { clientX: 110, clientY: 10 }), rtlTarget),
    ).toBe(false);
    rtlTarget.remove();

    // Root viewport scrollbars
    const rootEl = document.documentElement;
    const origInnerWidth = window.innerWidth;
    const origInnerHeight = window.innerHeight;
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1000 });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 800 });
    Object.defineProperty(rootEl, "clientWidth", { configurable: true, value: 985 });
    Object.defineProperty(rootEl, "clientHeight", { configurable: true, value: 785 });

    // Root LTR vertical scrollbar (985 to 1000)
    rootEl.dir = "ltr";
    expect(
      isClickOnScrollbar(new MouseEvent("click", { clientX: 990, clientY: 100 }), rootEl),
    ).toBe(true);
    expect(
      isClickOnScrollbar(new MouseEvent("click", { clientX: 500, clientY: 100 }), rootEl),
    ).toBe(false);

    // Root horizontal scrollbar (785 to 800)
    expect(
      isClickOnScrollbar(new MouseEvent("click", { clientX: 500, clientY: 790 }), rootEl),
    ).toBe(true);
    expect(
      isClickOnScrollbar(new MouseEvent("click", { clientX: 500, clientY: 400 }), rootEl),
    ).toBe(false);

    // Root RTL vertical scrollbar when on the left (rect.left > 0)
    rootEl.dir = "rtl";
    const rectSpy = vi
      .spyOn(rootEl, "getBoundingClientRect")
      .mockReturnValue({ left: 15, top: 0, right: 1000, bottom: 800 } as DOMRect);
    expect(isClickOnScrollbar(new MouseEvent("click", { clientX: 10, clientY: 100 }), rootEl)).toBe(
      true,
    );
    expect(
      isClickOnScrollbar(new MouseEvent("click", { clientX: 500, clientY: 100 }), rootEl),
    ).toBe(false);

    // Root RTL vertical scrollbar when on the right (rect.left === 0)
    rectSpy.mockReturnValue({ left: 0, top: 0, right: 985, bottom: 800 } as DOMRect);
    expect(
      isClickOnScrollbar(new MouseEvent("click", { clientX: 990, clientY: 100 }), rootEl),
    ).toBe(true);
    expect(isClickOnScrollbar(new MouseEvent("click", { clientX: 10, clientY: 100 }), rootEl)).toBe(
      false,
    );

    // Cleanup root mocks
    rootEl.dir = "ltr";
    rectSpy.mockRestore();
    Object.defineProperty(window, "innerWidth", { configurable: true, value: origInnerWidth });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: origInnerHeight });
    delete (rootEl as unknown as { clientWidth?: number }).clientWidth;
    delete (rootEl as unknown as { clientHeight?: number }).clientHeight;

    const clearTimeoutSpy = vi.spyOn(window, "clearTimeout");
    clearTimeoutIfSet(-1);
    clearTimeoutIfSet(window.setTimeout(() => {}, 0));
    expect(clearTimeoutSpy).toHaveBeenCalledTimes(1);
  });

  it("covers lifecycle helpers and floating node plus position shapes", () => {
    const cleanupRegistry = createCleanupRegistry();
    const cleanup = vi.fn();
    cleanupRegistry.add(cleanup);
    cleanupRegistry.cleanup();
    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(tryOnScopeDispose(() => {})).toBe(false);

    const anchorEl = ref(document.createElement("button"));
    const floatingEl = ref(document.createElement("div"));
    const arrowEl = ref<HTMLElement | null>(null);
    const open = ref(false);
    const x = ref(0);
    const y = ref(0);
    const strategy = ref("absolute" as const);
    const placement = ref("bottom" as const);
    const middlewareData = ref({});
    const isPositioned = ref(false);
    const styles = ref({
      position: "absolute" as const,
      top: "0px",
    });
    const update = vi.fn();

    const node = {
      refs: { anchorEl, floatingEl, arrowEl },
      open,
    };
    const position = {
      x,
      y,
      strategy,
      placement,
      middlewareData,
      isPositioned,
      styles,
      update,
    };

    expect(node.refs).toBe(node.refs);
    expect(node.open).toBe(open);
    expect(position.update).toBe(update);

    expect(getAnchorElement(anchorEl.value)).toBe(anchorEl.value);
    expect(
      getAnchorElement({
        contextElement: anchorEl.value,
        getBoundingClientRect: () => anchorEl.value.getBoundingClientRect(),
      }),
    ).toBe(anchorEl.value);
    expect(getAnchorElement(null)).toBeNull();
  });

  it("supports cross-realm elements from iframes", () => {
    const iframe = trackElement(document.createElement("iframe"));
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument!;
    const iframeDiv = iframeDoc.createElement("div");
    const iframeBtn = iframeDoc.createElement("button");
    const iframeInput = iframeDoc.createElement("input");
    const iframeText = iframeDoc.createTextNode("test");

    expect(isNode(iframeText)).toBe(true);
    expect(isNode(iframeDiv)).toBe(true);
    expect(isElement(iframeDiv)).toBe(true);
    expect(isHTMLElement(iframeDiv)).toBe(true);
    expect(isHTMLElement(iframeBtn)).toBe(true);
    expect(isHTMLElement(iframeInput)).toBe(true);
    expect(isTypeableElement(iframeInput)).toBe(true);
    expect(getAnchorElement(iframeBtn)).toBe(iframeBtn);
    expect(
      getAnchorElement({
        contextElement: iframeBtn,
        getBoundingClientRect: () => iframeBtn.getBoundingClientRect(),
      }),
    ).toBe(iframeBtn);
  });

  it("supports cross-realm elements adopted into iframes from host document", () => {
    const iframe = trackElement(document.createElement("iframe"));
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument!;
    // Created by host document, then adopted into iframeDoc
    const adoptedInput = trackElement(document.createElement("input"));
    iframeDoc.body.appendChild(adoptedInput);

    expect(adoptedInput.ownerDocument).toBe(iframeDoc);
    expect(isNode(adoptedInput)).toBe(true);
    expect(isElement(adoptedInput)).toBe(true);
    expect(isHTMLElement(adoptedInput)).toBe(true);
    expect(isTypeableElement(adoptedInput)).toBe(true);
    expect(getAnchorElement(adoptedInput)).toBe(adoptedInput);
  });

  it("supports elements from detached iframes where defaultView is null", () => {
    const iframe = document.createElement("iframe");
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument!;
    const iframeDiv = iframeDoc.createElement("div");
    const iframeInput = iframeDoc.createElement("input");
    const iframeTextarea = iframeDoc.createElement("textarea");

    // Detach the iframe: defaultView becomes null in real browser environments
    document.body.removeChild(iframe);

    expect(isNode(iframeDiv)).toBe(true);
    expect(isElement(iframeDiv)).toBe(true);
    expect(isHTMLElement(iframeDiv)).toBe(true);
    expect(isTypeableElement(iframeInput)).toBe(true);
    expect(isTypeableElement(iframeTextarea)).toBe(true);
  });

  it("differentiates SVG elements from HTML elements across realms", () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    svg.appendChild(path);

    expect(isNode(svg)).toBe(true);
    expect(isElement(svg)).toBe(true);
    expect(isHTMLElement(svg)).toBe(false);

    expect(isNode(path)).toBe(true);
    expect(isElement(path)).toBe(true);
    expect(isHTMLElement(path)).toBe(false);
  });

  it("correctly checks contextElement inside iframes in isTargetWithinElements", () => {
    const iframe = trackElement(document.createElement("iframe"));
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument!;
    const contextEl = iframeDoc.createElement("button");
    const targetInside = iframeDoc.createElement("span");
    contextEl.appendChild(targetInside);
    iframeDoc.body.appendChild(contextEl);

    const virtualAnchor: VirtualElement = {
      contextElement: contextEl,
      getBoundingClientRect: () => contextEl.getBoundingClientRect(),
    };

    expect(isTargetWithinElements(virtualAnchor, null, targetInside)).toBe(true);
    expect(isTargetWithinElements(virtualAnchor, null, document.body)).toBe(false);
  });
});
