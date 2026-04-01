import {
  docsShellConfig,
  type DocsFrameVisibility,
  type DocsSectionKey,
} from "../config/docs-shell";

export type DocsTemplate = "docs" | "landing";

export interface DocsPageFrontmatter {
  docsTemplate?: DocsTemplate;
  docsFrame?: Partial<Record<keyof DocsFrameVisibility, unknown>>;
  docsEyebrow?: string;
  description?: string;
}

export interface ResolvedDocsPageShell {
  template: DocsTemplate;
  frame: DocsFrameVisibility;
}

export const LANDING_PAGE_PATH = "index.md";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const resolveDocsSectionKey = (relativePath: string): DocsSectionKey =>
  relativePath.startsWith("api/") ? "api" : "guide";

export const resolveDocsTemplate = (
  relativePath: string,
  frontmatter: DocsPageFrontmatter | undefined,
): DocsTemplate => {
  if (frontmatter?.docsTemplate === "landing" || frontmatter?.docsTemplate === "docs") {
    return frontmatter.docsTemplate;
  }

  return relativePath === LANDING_PAGE_PATH ? "landing" : "docs";
};

export const normalizeDocsFrame = (
  template: DocsTemplate,
  docsFrame: DocsPageFrontmatter["docsFrame"],
): DocsFrameVisibility => {
  const defaults =
    template === "landing"
      ? {
          topbar: false,
          sidebarCard: false,
          pageHeader: false,
          asideCard: false,
        }
      : docsShellConfig.defaultFrame;

  if (!isRecord(docsFrame)) {
    return { ...defaults };
  }

  const frame = { ...defaults };

  for (const key of Object.keys(defaults) as Array<keyof DocsFrameVisibility>) {
    const override = docsFrame[key];

    if (typeof override === "boolean") {
      frame[key] = override;
    }
  }

  return frame;
};

export const resolveDocsPageShell = (
  relativePath: string,
  frontmatter: DocsPageFrontmatter | undefined,
): ResolvedDocsPageShell => {
  const template = resolveDocsTemplate(relativePath, frontmatter);

  return {
    template,
    frame: normalizeDocsFrame(template, frontmatter?.docsFrame),
  };
};
