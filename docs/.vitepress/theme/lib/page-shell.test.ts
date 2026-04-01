import { describe, expect, it } from "vite-plus/test";
import {
  LANDING_PAGE_PATH,
  normalizeDocsChrome,
  resolveDocsPageShell,
  resolveDocsSectionKey,
  resolveDocsTemplate,
} from "./page-shell";

describe("docs page shell", () => {
  it("defaults the root page to the landing template", () => {
    expect(resolveDocsTemplate(LANDING_PAGE_PATH, undefined)).toBe("landing");
    expect(resolveDocsPageShell(LANDING_PAGE_PATH, undefined)).toEqual({
      template: "landing",
      chrome: {
        topbar: false,
        sidebarCard: false,
        pageHeader: false,
        asideCard: false,
      },
    });
  });

  it("defaults guide and api pages to the docs template", () => {
    expect(resolveDocsTemplate("guide/index.md", undefined)).toBe("docs");
    expect(resolveDocsPageShell("api/use-floating.md", undefined).chrome).toEqual({
      topbar: true,
      sidebarCard: true,
      pageHeader: true,
      asideCard: true,
    });
  });

  it("respects explicit template and chrome overrides", () => {
    expect(
      resolveDocsPageShell("guide/index.md", {
        docsTemplate: "landing",
        docsChrome: {
          topbar: true,
          pageHeader: true,
        },
      }),
    ).toEqual({
      template: "landing",
      chrome: {
        topbar: true,
        sidebarCard: false,
        pageHeader: true,
        asideCard: false,
      },
    });
  });

  it("ignores invalid chrome overrides", () => {
    expect(
      normalizeDocsChrome("docs", {
        topbar: "yes",
        pageHeader: false,
      }),
    ).toEqual({
      topbar: true,
      sidebarCard: true,
      pageHeader: false,
      asideCard: true,
    });
  });

  it("resolves docs sections from the route prefix", () => {
    expect(resolveDocsSectionKey("api/offset.md")).toBe("api");
    expect(resolveDocsSectionKey("guide/interactions.md")).toBe("guide");
  });
});
