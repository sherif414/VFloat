import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-vue";
import { defineComponent, h, nextTick } from "vue";
import {
  getFirstTabbableElement,
  getFocusableElements,
  getLastTabbableElement,
  getTabbableElements,
  isElementFocusable,
  isElementTabbable,
} from "./tabbable";

async function renderContainer(html = ""): Promise<HTMLDivElement> {
  const Component = defineComponent(() => {
    return () => h("div", { class: "test-container", innerHTML: html });
  });
  const screen = await render(Component);
  await nextTick();
  return screen.container.firstElementChild as HTMLDivElement;
}

describe("Feature: Tabbable and Focusable Candidate Discovery", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe("Scenario: Discovery and ordering in getTabbableElements", () => {
    it("Given standard interactive HTML elements, When discovered, Then returns them in sequential DOM tree order", async () => {
      // Given
      const containerEl = await renderContainer(`
        <button id="btn1">Button 1</button>
        <a id="link1" href="https://example.com">Link 1</a>
        <input id="input1" type="text" />
        <select id="select1"><option>1</option></select>
        <textarea id="textarea1"></textarea>
      `);

      // When
      const tabbables = getTabbableElements(containerEl);

      // Then
      expect(tabbables.map((el) => el.id)).toEqual([
        "btn1",
        "link1",
        "input1",
        "select1",
        "textarea1",
      ]);
    });

    it("Given disabled buttons and disabled fieldsets, When evaluated, Then filters out disabled candidates", async () => {
      // Given
      const containerEl = await renderContainer(`
        <button id="btn1">Active</button>
        <button id="btn2" disabled>Disabled</button>
        <fieldset disabled>
          <button id="btn3">Inside Disabled Fieldset</button>
        </fieldset>
      `);

      // When
      const tabbables = getTabbableElements(containerEl);

      // Then
      expect(tabbables.map((el) => el.id)).toEqual(["btn1"]);
    });

    it("Given elements with display:none, visibility:hidden, or hidden attribute, When evaluated, Then excludes invisible elements", async () => {
      // Given
      const containerEl = await renderContainer(`
        <button id="btn1">Visible</button>
        <button id="btn2" style="display: none;">Hidden Display</button>
        <button id="btn3" style="visibility: hidden;">Hidden Visibility</button>
        <button id="btn4" hidden>Hidden Attr</button>
      `);

      // When
      const tabbables = getTabbableElements(containerEl);

      // Then
      expect(tabbables.map((el) => el.id)).toEqual(["btn1"]);
    });

    it("Given elements with tabindex='-1', When evaluated, Then excludes them from tabbables but includes them in focusables", async () => {
      // Given
      const containerEl = await renderContainer(`
        <button id="btn1">Tabbable</button>
        <button id="btn2" tabindex="-1">Focusable Only</button>
      `);

      // When
      const tabbables = getTabbableElements(containerEl);
      const focusables = getFocusableElements(containerEl);

      // Then
      expect(tabbables.map((el) => el.id)).toEqual(["btn1"]);
      expect(focusables.map((el) => el.id)).toEqual(["btn1", "btn2"]);
    });

    it("Given elements with positive tabindex values, When evaluated, Then sorts them ahead of tabindex 0 in ascending order", async () => {
      // Given
      const containerEl = await renderContainer(`
        <button id="btn-zero-1">Zero 1</button>
        <button id="btn-two" tabindex="2">Two</button>
        <button id="btn-one" tabindex="1">One</button>
        <button id="btn-zero-2">Zero 2</button>
      `);

      // When
      const tabbables = getTabbableElements(containerEl);

      // Then
      expect(tabbables.map((el) => el.id)).toEqual([
        "btn-one",
        "btn-two",
        "btn-zero-1",
        "btn-zero-2",
      ]);
    });

    it("Given a radio group with a checked option, When evaluated, Then designates only the checked radio as tabbable", async () => {
      // Given
      const containerEl = await renderContainer(`
        <form>
          <input id="radio1" type="radio" name="plan" value="free" />
          <input id="radio2" type="radio" name="plan" value="pro" checked />
          <input id="radio3" type="radio" name="plan" value="enterprise" />
        </form>
      `);

      // When
      const tabbables = getTabbableElements(containerEl);

      // Then
      expect(tabbables.map((el) => el.id)).toEqual(["radio2"]);
    });

    it("Given a radio group with no checked option, When evaluated, Then designates the first radio in the group as tabbable", async () => {
      // Given
      const containerEl = await renderContainer(`
        <form>
          <input id="radio1" type="radio" name="plan" value="free" />
          <input id="radio2" type="radio" name="plan" value="pro" />
          <input id="radio3" type="radio" name="plan" value="enterprise" />
        </form>
      `);

      // When
      const tabbables = getTabbableElements(containerEl);

      // Then
      expect(tabbables.map((el) => el.id)).toEqual(["radio1"]);
    });

    it("Given elements inside an inert subtree, When evaluated, Then excludes inert descendants", async () => {
      // Given
      const containerEl = await renderContainer(`
        <button id="btn1">Active</button>
        <div inert>
          <button id="btn2">Inert Button</button>
        </div>
      `);

      // When
      const tabbables = getTabbableElements(containerEl);

      // Then
      expect(tabbables.map((el) => el.id)).toEqual(["btn1"]);
    });

    it("Given details disclosure elements, When evaluated, Then includes summary and open content while excluding closed content", async () => {
      // Given
      const containerEl = await renderContainer(`
        <details>
          <summary id="summary">Toggle</summary>
          <button id="hidden-btn">Hidden while closed</button>
        </details>
        <details open>
          <summary id="open-summary">Open toggle</summary>
          <button id="open-btn">Visible</button>
        </details>
      `);

      // When
      const tabbables = getTabbableElements(containerEl);

      // Then
      expect(tabbables.map((el) => el.id)).toEqual(["summary", "open-summary", "open-btn"]);
    });

    it("Given a disabled fieldset with a legend, When evaluated, Then preserves controls inside the first legend element", async () => {
      // Given
      const containerEl = await renderContainer(`
        <fieldset disabled>
          <legend><button id="legend-btn">Legend control</button></legend>
          <button id="fieldset-btn">Disabled descendant</button>
        </fieldset>
      `);

      // When
      const tabbables = getTabbableElements(containerEl);

      // Then
      expect(tabbables.map((el) => el.id)).toEqual(["legend-btn"]);
    });

    it("Given elements inside an ancestor with visibility:hidden, When evaluated, Then excludes hidden descendants", async () => {
      // Given
      const containerEl = await renderContainer(`
        <div style="visibility: hidden;">
          <button id="btn-hidden">Hidden via ancestor</button>
        </div>
        <button id="btn-visible">Visible</button>
      `);

      // When
      const tabbables = getTabbableElements(containerEl);

      // Then
      expect(tabbables.map((el) => el.id)).toEqual(["btn-visible"]);
    });

    it("Given checkVisibility is unavailable, When evaluated, Then walks ancestor hierarchy in fallback visibility path", async () => {
      // Given
      const containerEl = await renderContainer(`
        <div style="visibility: hidden;">
          <button id="btn-hidden">Hidden via ancestor</button>
        </div>
        <button id="btn-visible">Visible</button>
      `);

      const candidateEls = Array.from(containerEl.querySelectorAll("button"));
      const prototype = Object.getPrototypeOf(candidateEls[0]);
      const descriptor = Object.getOwnPropertyDescriptor(prototype, "checkVisibility");

      // Stub checkVisibility off each candidate so fallback path runs
      for (const el of candidateEls) {
        Object.defineProperty(el, "checkVisibility", { value: undefined, configurable: true });
      }

      try {
        // When
        const tabbables = getTabbableElements(containerEl);

        // Then
        expect(tabbables.map((el) => el.id)).toEqual(["btn-visible"]);
      } finally {
        if (descriptor) {
          Object.defineProperty(prototype, "checkVisibility", descriptor);
        }
        for (const el of candidateEls) {
          delete (el as { checkVisibility?: unknown }).checkVisibility;
        }
      }
    });

    it("Given iframes and property-set tabindex elements, When evaluated, Then identifies them as focusable", async () => {
      // Given
      const containerEl = await renderContainer(`
        <iframe id="frame"></iframe>
        <div id="custom" tabindex="0"></div>
      `);
      const iframeEl = containerEl.querySelector("#frame") as HTMLElement;
      const customEl = containerEl.querySelector("#custom") as HTMLElement;

      // Then
      expect(isElementFocusable(iframeEl)).toBe(true);
      expect(isElementTabbable(customEl)).toBe(true);

      const focusables = getFocusableElements(containerEl);
      expect(focusables.map((el) => el.id)).toContain("frame");
    });

    it("Given container-scoped radio groups, When external radio is checked, Then preserves internal radio tab stop", async () => {
      // Given: External checked radio and container with radios sharing the same name
      const wrapperEl = await renderContainer(`
        <input id="outside-radio" type="radio" name="plan" checked />
        <div id="scoped-container">
          <input id="in1" type="radio" name="plan" />
          <input id="in2" type="radio" name="plan" />
        </div>
      `);
      const containerEl = wrapperEl.querySelector("#scoped-container") as HTMLElement;

      // When
      const tabbables = getTabbableElements(containerEl);

      // Then: Container-scoped first radio is selected
      expect(tabbables.map((el) => el.id)).toEqual(["in1"]);
    });
  });

  describe("Scenario: Boundary element lookup with getFirstTabbableElement and getLastTabbableElement", () => {
    it("Given a container with multiple tabbable elements, When querying boundaries, Then returns the first and last elements", async () => {
      // Given
      const containerEl = await renderContainer(`
        <button id="first">First</button>
        <button id="middle">Middle</button>
        <button id="last">Last</button>
      `);

      // When & Then
      expect(getFirstTabbableElement(containerEl)?.id).toBe("first");
      expect(getLastTabbableElement(containerEl)?.id).toBe("last");
    });

    it("Given a container without any tabbable elements, When querying boundaries, Then returns null", async () => {
      // Given
      const containerEl = await renderContainer(`<div>Plain text with no tabbables</div>`);

      // When & Then
      expect(getFirstTabbableElement(containerEl)).toBeNull();
      expect(getLastTabbableElement(containerEl)).toBeNull();
    });
  });

  describe("Scenario: State predicates isElementTabbable and isElementFocusable", () => {
    it("Given normal, negative tabindex, and disabled elements, When checking predicates, Then correctly differentiates focusable vs tabbable", async () => {
      // Given
      const containerEl = await renderContainer(`
        <button id="btn-normal">Normal</button>
        <button id="btn-neg" tabindex="-1">Neg Tabindex</button>
        <button id="btn-disabled" disabled>Disabled</button>
      `);

      const normalEl = containerEl.querySelector("#btn-normal") as HTMLElement;
      const negEl = containerEl.querySelector("#btn-neg") as HTMLElement;
      const disabledEl = containerEl.querySelector("#btn-disabled") as HTMLElement;

      // When & Then
      expect(isElementFocusable(normalEl)).toBe(true);
      expect(isElementTabbable(normalEl)).toBe(true);

      expect(isElementFocusable(negEl)).toBe(true);
      expect(isElementTabbable(negEl)).toBe(false);

      expect(isElementFocusable(disabledEl)).toBe(false);
      expect(isElementTabbable(disabledEl)).toBe(false);
    });
  });
});
