import { describe, expect, it } from "vite-plus/test";
import { docsShellConfig } from "../config/docs-shell";
import {
  normalizeDocsFrame,
  resolveDocsPageShell,
  resolveDocsSectionKey,
  resolveDocsTemplate,
} from "./page-shell";

describe("docs page shell", () => {
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
