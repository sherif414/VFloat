import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSSRApp, defineComponent, effectScope, h, nextTick, ref } from "vue";
import { renderToString } from "vue/server-renderer";
import { getDocument } from "@/shared/env";
import { useRtl } from "./rtl";

vi.mock("@/shared/env", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared/env")>();
  return {
    ...actual,
    getDocument: vi.fn(actual.getDocument),
  };
});

describe("useRtl", () => {
  const trackedElements: HTMLElement[] = [];
  let scope: ReturnType<typeof effectScope>;

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
    document.documentElement.removeAttribute("dir");
    document.body.removeAttribute("dir");
  }

  beforeEach(() => {
    scope = effectScope();
    document.documentElement.removeAttribute("dir");
    document.body.removeAttribute("dir");
  });

  afterEach(() => {
    scope?.stop();
    clearTrackedElements();
    vi.restoreAllMocks();
  });

  it("defaults to false (LTR) when no dir attributes are present", () => {
    scope.run(() => {
      const el = trackElement(document.createElement("div"));
      document.body.appendChild(el);

      const isRtl = useRtl(el);
      expect(isRtl.value).toBe(false);
    });
  });

  it("detects RTL from documentElement dir attribute", () => {
    scope.run(() => {
      document.documentElement.setAttribute("dir", "rtl");
      const el = trackElement(document.createElement("div"));
      document.body.appendChild(el);

      const isRtl = useRtl(el);
      expect(isRtl.value).toBe(true);
    });
  });

  it("detects RTL from local element dir attribute overriding LTR document", () => {
    scope.run(() => {
      document.documentElement.setAttribute("dir", "ltr");
      const el = trackElement(document.createElement("div"));
      el.setAttribute("dir", "rtl");
      document.body.appendChild(el);

      const isRtl = useRtl(el);
      expect(isRtl.value).toBe(true);
    });
  });

  it("detects LTR from local element dir attribute overriding RTL document", () => {
    scope.run(() => {
      document.documentElement.setAttribute("dir", "rtl");
      const el = trackElement(document.createElement("div"));
      el.setAttribute("dir", "ltr");
      document.body.appendChild(el);

      const isRtl = useRtl(el);
      expect(isRtl.value).toBe(false);
    });
  });

  it("resolves nested direction overrides correctly", () => {
    scope.run(() => {
      const outer = trackElement(document.createElement("div"));
      outer.setAttribute("dir", "rtl");

      const middle = trackElement(document.createElement("div"));
      middle.setAttribute("dir", "ltr");

      const inner = trackElement(document.createElement("div"));
      inner.setAttribute("dir", "rtl");

      const target = trackElement(document.createElement("div"));

      inner.appendChild(target);
      middle.appendChild(inner);
      outer.appendChild(middle);
      document.body.appendChild(outer);

      const isRtl = useRtl(target);
      expect(isRtl.value).toBe(true);
    });
  });

  it("updates reactively when dir attribute is mutated at runtime", async () => {
    await scope.run(async () => {
      const el = trackElement(document.createElement("div"));
      document.body.appendChild(el);

      const isRtl = useRtl(el);
      expect(isRtl.value).toBe(false);

      // Mutate document root dir attribute
      document.documentElement.setAttribute("dir", "rtl");
      await nextTick();
      // Allow MutationObserver microtask to fire
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(isRtl.value).toBe(true);

      // Mutate local element to ltr override
      el.setAttribute("dir", "ltr");
      await nextTick();
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(isRtl.value).toBe(false);
    });
  });

  it("handles dynamic target element ref changes", async () => {
    await scope.run(async () => {
      const targetRef = ref<HTMLElement | null>(null);
      const isRtl = useRtl(targetRef);

      expect(isRtl.value).toBe(false);

      const rtlEl = trackElement(document.createElement("div"));
      rtlEl.setAttribute("dir", "rtl");
      document.body.appendChild(rtlEl);

      targetRef.value = rtlEl;
      await nextTick();

      expect(isRtl.value).toBe(true);
    });
  });

  it("supports target as a getter function", () => {
    scope.run(() => {
      const rtlEl = trackElement(document.createElement("div"));
      rtlEl.setAttribute("dir", "rtl");
      document.body.appendChild(rtlEl);

      const isRtl = useRtl(() => rtlEl);
      expect(isRtl.value).toBe(true);
    });
  });

  it("honors explicit rtl option over DOM inspection", () => {
    scope.run(() => {
      document.documentElement.setAttribute("dir", "rtl");
      const el = trackElement(document.createElement("div"));
      document.body.appendChild(el);

      const isRtlOverride = useRtl(el, { rtl: false });
      expect(isRtlOverride.value).toBe(false);
    });
  });

  it("supports reactive rtl option getter", async () => {
    await scope.run(async () => {
      const dynamicRtl = ref(false);
      const isRtl = useRtl(null, { rtl: dynamicRtl });

      expect(isRtl.value).toBe(false);

      dynamicRtl.value = true;
      await nextTick();

      expect(isRtl.value).toBe(true);
    });
  });

  it("falls back to false when document is unavailable in SSR", async () => {
    vi.mocked(getDocument).mockReturnValue(null);

    const Component = defineComponent({
      setup() {
        const isRtl = useRtl(null);
        return () => h("div", { "data-rtl": String(isRtl.value) }, "SSR Content");
      },
    });

    const html = await renderToString(createSSRApp(Component));
    expect(html).toContain('data-rtl="false"');
    expect(html).toContain("SSR Content");
  });
});
