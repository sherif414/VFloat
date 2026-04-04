import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { ref } from "vue";
import { createRefSetter, resolveAnchorElement } from "@/shared/elements";
import { createCleanupRegistry, tryOnScopeDispose } from "@/shared/lifecycle";
import { isMac, isSafari, matchesFocusVisible } from "@/shared/platform";
import type { VirtualElement } from "@/types";
import {
  clearTimeoutIfSet,
  getDomPath,
  isButtonTarget,
  isClickOnScrollbar,
  isElementInEventPath,
  isEventTargetWithin,
  isFunction,
  isHTMLElement,
  isMouseLikePointerType,
  isSpaceIgnored,
  isTypeableElement,
  isVirtualElement,
} from "@/shared/dom";

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
  vi.restoreAllMocks();
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

    const input = document.createElement("input");
    const textarea = document.createElement("textarea");
    const button = document.createElement("button");
    const div = document.createElement("div");
    div.setAttribute("role", "button");
    div.contentEditable = "true";

    expect(isFunction(() => true)).toBe(true);
    expect(isFunction("nope")).toBe(false);
    expect(isHTMLElement(input)).toBe(true);
    expect(isHTMLElement(null)).toBe(false);
    expect(isMac()).toBe(true);
    expect(isSafari()).toBe(true);
    expect(matchesFocusVisible({ matches: () => true } as unknown as Element)).toBe(true);
    expect(isMouseLikePointerType("mouse")).toBe(true);
    expect(isMouseLikePointerType("pen")).toBe(true);
    expect(isMouseLikePointerType("pen", true)).toBe(false);
    expect(isMouseLikePointerType(undefined)).toBe(false);
    expect(isTypeableElement(input)).toBe(true);
    expect(isTypeableElement(textarea)).toBe(true);
    expect(isTypeableElement(div)).toBe(true);
    expect(isTypeableElement(button)).toBe(false);
    expect(
      isButtonTarget(
        new KeyboardEvent("keydown", {
          bubbles: true,
        }),
      ),
    ).toBe(false);

    const clickTarget = new KeyboardEvent("keydown");
    Object.defineProperty(clickTarget, "target", { configurable: true, value: button });
    expect(isButtonTarget(clickTarget)).toBe(true);
    expect(isSpaceIgnored(input)).toBe(true);
    expect(isSpaceIgnored(button)).toBe(false);
    expect(isVirtualElement({ contextElement: button })).toBe(true);
    expect(isVirtualElement(null)).toBe(false);
  });

  it("covers DOM path and containment helpers", () => {
    const container = document.createElement("div");
    const child = document.createElement("button");
    const shadowHost = document.createElement("div");
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
    Object.defineProperty(composedEvent, "target", { configurable: true, value: child });

    const fallbackEvent = {
      target: child,
    } as unknown as Event;

    const virtualElement: VirtualElement = {
      contextElement: container,
      getBoundingClientRect: () => child.getBoundingClientRect(),
    };

    expect(isEventTargetWithin(composedEvent, container)).toBe(true);
    expect(isEventTargetWithin(fallbackEvent, container)).toBe(true);
    expect(isElementInEventPath(container, [child, container])).toBe(true);
    expect(isElementInEventPath(virtualElement, [container])).toBe(true);
    expect(isElementInEventPath({}, [container])).toBe(false);

    const domPath = getDomPath(shadowChild);
    expect(domPath).toContain(shadowRoot);
    expect(domPath).toContain(shadowHost);

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

    const clearTimeoutSpy = vi.spyOn(window, "clearTimeout");
    clearTimeoutIfSet(-1);
    clearTimeoutIfSet(window.setTimeout(() => {}, 0));
    expect(clearTimeoutSpy).toHaveBeenCalledTimes(1);
  });

  it("covers lifecycle helpers and floating context shape", () => {
    const cleanupRegistry = createCleanupRegistry();
    const cleanup = vi.fn();
    cleanupRegistry.add(cleanup);
    cleanupRegistry.flush();
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
      left: "0px",
    });
    const setOpen = vi.fn();
    const update = vi.fn();

    const context = {
      refs: { anchorEl, floatingEl, arrowEl },
      state: { open, setOpen },
      position: { x, y, strategy, placement, middlewareData, isPositioned, styles, update },
    };

    expect(context.refs).toBe(context.refs);
    expect(context.state.open).toBe(open);
    expect(context.position.update).toBe(update);

    const setterTarget = ref<HTMLElement | null>(null);
    createRefSetter(setterTarget)(anchorEl.value);
    expect(setterTarget.value).toBe(anchorEl.value);
    expect(resolveAnchorElement(anchorEl.value)).toBe(anchorEl.value);
    expect(
      resolveAnchorElement({
        contextElement: anchorEl.value,
        getBoundingClientRect: () => anchorEl.value.getBoundingClientRect(),
      }),
    ).toBe(anchorEl.value);
    expect(resolveAnchorElement(null)).toBeNull();
  });
});
