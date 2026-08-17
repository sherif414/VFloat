import { afterEach, describe, expect, it } from "vitest";
import {
  getFirstTabbableElement,
  getFocusableElements,
  getLastTabbableElement,
  getTabbableElements,
  isElementFocusable,
  isElementTabbable,
} from "./tabbable";

const trackedElements: HTMLElement[] = [];

function trackElement<T extends HTMLElement>(el: T): T {
  trackedElements.push(el);
  return el;
}

function createContainer(): HTMLDivElement {
  const container = trackElement(document.createElement("div"));
  document.body.appendChild(container);
  return container;
}

describe("tabbable utilities (native implementation)", () => {
  afterEach(() => {
    for (const el of [...trackedElements].reverse()) {
      if (el.isConnected) {
        el.remove();
      }
    }
    trackedElements.length = 0;
  });

  describe("getTabbableElements", () => {
    it("finds standard interactive elements in DOM order", () => {
      const container = createContainer();
      container.innerHTML = `
        <button id="btn1">Button 1</button>
        <a id="link1" href="https://example.com">Link 1</a>
        <input id="input1" type="text" />
        <select id="select1"><option>1</option></select>
        <textarea id="textarea1"></textarea>
      `;

      const tabbables = getTabbableElements(container);
      expect(tabbables.map((el) => el.id)).toEqual([
        "btn1",
        "link1",
        "input1",
        "select1",
        "textarea1",
      ]);
    });

    it("filters out disabled elements and elements inside disabled fieldsets", () => {
      const container = createContainer();
      container.innerHTML = `
        <button id="btn1">Active</button>
        <button id="btn2" disabled>Disabled</button>
        <fieldset disabled>
          <button id="btn3">Inside Disabled Fieldset</button>
        </fieldset>
      `;

      const tabbables = getTabbableElements(container);
      expect(tabbables.map((el) => el.id)).toEqual(["btn1"]);
    });

    it("filters out elements with display:none, visibility:hidden, or hidden attribute", () => {
      const container = createContainer();
      container.innerHTML = `
        <button id="btn1">Visible</button>
        <button id="btn2" style="display: none;">Hidden Display</button>
        <button id="btn3" style="visibility: hidden;">Hidden Visibility</button>
        <button id="btn4" hidden>Hidden Attr</button>
      `;

      const tabbables = getTabbableElements(container);
      expect(tabbables.map((el) => el.id)).toEqual(["btn1"]);
    });

    it("excludes elements with tabindex='-1' from tabbable, but includes them in focusable", () => {
      const container = createContainer();
      container.innerHTML = `
        <button id="btn1">Tabbable</button>
        <button id="btn2" tabindex="-1">Focusable Only</button>
      `;

      const tabbables = getTabbableElements(container);
      const focusables = getFocusableElements(container);

      expect(tabbables.map((el) => el.id)).toEqual(["btn1"]);
      expect(focusables.map((el) => el.id)).toEqual(["btn1", "btn2"]);
    });

    it("sorts positive tabindex elements before tabindex 0 in ascending numerical order", () => {
      const container = createContainer();
      container.innerHTML = `
        <button id="btn-zero-1">Zero 1</button>
        <button id="btn-two" tabindex="2">Two</button>
        <button id="btn-one" tabindex="1">One</button>
        <button id="btn-zero-2">Zero 2</button>
      `;

      const tabbables = getTabbableElements(container);
      expect(tabbables.map((el) => el.id)).toEqual([
        "btn-one",
        "btn-two",
        "btn-zero-1",
        "btn-zero-2",
      ]);
    });

    it("correctly applies radio group rules (only checked radio is tabbable)", () => {
      const container = createContainer();
      container.innerHTML = `
        <form>
          <input id="radio1" type="radio" name="plan" value="free" />
          <input id="radio2" type="radio" name="plan" value="pro" checked />
          <input id="radio3" type="radio" name="plan" value="enterprise" />
        </form>
      `;

      const tabbables = getTabbableElements(container);
      expect(tabbables.map((el) => el.id)).toEqual(["radio2"]);
    });

    it("selects first radio in group when none are checked", () => {
      const container = createContainer();
      container.innerHTML = `
        <form>
          <input id="radio1" type="radio" name="plan" value="free" />
          <input id="radio2" type="radio" name="plan" value="pro" />
          <input id="radio3" type="radio" name="plan" value="enterprise" />
        </form>
      `;

      const tabbables = getTabbableElements(container);
      expect(tabbables.map((el) => el.id)).toEqual(["radio1"]);
    });

    it("excludes elements inside inert subtrees", () => {
      const container = createContainer();
      container.innerHTML = `
        <button id="btn1">Active</button>
        <div inert>
          <button id="btn2">Inert Button</button>
        </div>
      `;

      const tabbables = getTabbableElements(container);
      expect(tabbables.map((el) => el.id)).toEqual(["btn1"]);
    });
  });

  describe("getFirstTabbableElement and getLastTabbableElement", () => {
    it("returns the first and last tabbable elements", () => {
      const container = createContainer();
      container.innerHTML = `
        <button id="first">First</button>
        <button id="middle">Middle</button>
        <button id="last">Last</button>
      `;

      expect(getFirstTabbableElement(container)?.id).toBe("first");
      expect(getLastTabbableElement(container)?.id).toBe("last");
    });

    it("returns null when no tabbable elements exist", () => {
      const container = createContainer();
      container.innerHTML = `<div>Plain text with no tabbables</div>`;

      expect(getFirstTabbableElement(container)).toBeNull();
      expect(getLastTabbableElement(container)).toBeNull();
    });
  });

  describe("isElementTabbable and isElementFocusable", () => {
    it("correctly identifies focusable vs tabbable states", () => {
      const container = createContainer();
      container.innerHTML = `
        <button id="btn-normal">Normal</button>
        <button id="btn-neg" tabindex="-1">Neg Tabindex</button>
        <button id="btn-disabled" disabled>Disabled</button>
      `;

      const normal = container.querySelector("#btn-normal") as HTMLElement;
      const neg = container.querySelector("#btn-neg") as HTMLElement;
      const disabled = container.querySelector("#btn-disabled") as HTMLElement;

      expect(isElementFocusable(normal)).toBe(true);
      expect(isElementTabbable(normal)).toBe(true);

      expect(isElementFocusable(neg)).toBe(true);
      expect(isElementTabbable(neg)).toBe(false);

      expect(isElementFocusable(disabled)).toBe(false);
      expect(isElementTabbable(disabled)).toBe(false);
    });
  });
});
