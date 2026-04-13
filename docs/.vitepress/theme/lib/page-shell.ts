import {
  docsShellConfig,
  type DocsFrameVisibility,
  type DocsSectionKey,
} from "../config/docs-shell";

export type DocsTemplate = "docs" | "landing";

export interface DocsPageFrontmatter {
  docsTemplate?: DocsTemplate;
  docsFrame?: Partial<Record<keyof DocsFrameVisibility, unknown>>;
  description?: string;
}

export interface ResolvedDocsPageShell {
  template: DocsTemplate;
  frame: DocsFrameVisibility;
}

/** Narrow unknown values to plain records. */
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

/** Resolve the docs section from the current page path. */
export const resolveDocsSectionKey = (relativePath: string): DocsSectionKey =>
  relativePath.startsWith("api/") ? "api" : "guide";

/** Resolve the page template from frontmatter. */
export const resolveDocsTemplate = (frontmatter: DocsPageFrontmatter | undefined): DocsTemplate =>
  frontmatter?.docsTemplate === "landing" ? "landing" : "docs";

/** Normalize the docs frame visibility for the chosen template. */
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

/** Resolve the page shell template and frame visibility together. */
export const resolveDocsPageShell = (
  frontmatter: DocsPageFrontmatter | undefined,
): ResolvedDocsPageShell => {
  const template = resolveDocsTemplate(frontmatter);

  return {
    template,
    frame: normalizeDocsFrame(template, frontmatter?.docsFrame),
  };
};
