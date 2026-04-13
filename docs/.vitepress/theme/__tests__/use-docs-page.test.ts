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

  it("respects explicit landing template and page header overrides", () => {
    expect(
      resolveDocsPageShell({
        docsTemplate: "landing",
        docsFrame: {
          pageHeader: true,
        },
      }),
    ).toEqual({
      template: "landing",
      frame: {
        pageHeader: true,
      },
    });
  });

  it("ignores invalid frame overrides", () => {
    expect(
      normalizeDocsFrame("docs", {
        pageHeader: "yes",
      }),
    ).toEqual({
      pageHeader: true,
    });
  });

  it("resolves docs sections from the route prefix", () => {
    expect(resolveDocsSectionKey("api/offset.md")).toBe("api");
    expect(resolveDocsSectionKey("guide/interactions.md")).toBe("guide");
  });
});
