import { describe, expect, it, vi } from "vite-plus/test";

vi.mock("vitepress", () => ({
  useData: () => ({
    frontmatter: { value: undefined },
    page: { value: { relativePath: "guide/index.md", title: "Guide" } },
  }),
}));

import {
  docsShellConfig,
  normalizeDocsFrame,
  resolveDocsPageShell,
  resolveDocsSectionKey,
  resolveDocsTemplate,
} from "../composables/use-docs-page";

describe("use-docs-page", () => {
  it("defaults to the docs template unless frontmatter opts into landing", () => {
    expect(resolveDocsTemplate(undefined)).toBe("docs");
    expect(resolveDocsTemplate({ docsTemplate: "docs" })).toBe("docs");
    expect(resolveDocsTemplate({ docsTemplate: "landing" })).toBe("landing");
    expect(resolveDocsPageShell(undefined)).toEqual({
      template: "docs",
      frame: docsShellConfig.defaultFrame,
    });
  });

  it("respects explicit landing template and frame overrides", () => {
    expect(
      resolveDocsPageShell({
        docsTemplate: "landing",
        docsFrame: {
          topbar: true,
          pageHeader: true,
        },
      }),
    ).toEqual({
      template: "landing",
      frame: {
        topbar: true,
        sidebarCard: false,
        pageHeader: true,
      },
    });
  });

  it("ignores invalid frame overrides", () => {
    expect(
      normalizeDocsFrame("docs", {
        topbar: "yes",
        pageHeader: false,
      }),
    ).toEqual({
      ...docsShellConfig.defaultFrame,
      pageHeader: false,
    });
  });

  it("resolves docs sections from the route prefix", () => {
    expect(resolveDocsSectionKey("api/offset.md")).toBe("api");
    expect(resolveDocsSectionKey("guide/interactions.md")).toBe("guide");
  });
});
