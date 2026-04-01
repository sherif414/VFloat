import {
  docsShellConfig,
  type DocsChromeVisibility,
  type DocsSectionKey,
} from "../config/docs-shell";

export type DocsTemplate = "docs" | "landing";

export interface DocsPageFrontmatter {
  docsTemplate?: DocsTemplate;
  docsChrome?: Partial<Record<keyof DocsChromeVisibility, unknown>>;
  docsEyebrow?: string;
  description?: string;
}

export interface ResolvedDocsPageShell {
  template: DocsTemplate;
  chrome: DocsChromeVisibility;
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

export const normalizeDocsChrome = (
  template: DocsTemplate,
  docsChrome: DocsPageFrontmatter["docsChrome"],
): DocsChromeVisibility => {
  const defaults =
    template === "landing"
      ? {
          topbar: false,
          sidebarCard: false,
          pageHeader: false,
          asideCard: false,
        }
      : docsShellConfig.defaultChrome;

  if (!isRecord(docsChrome)) {
    return { ...defaults };
  }

  const chrome = { ...defaults };

  for (const key of Object.keys(defaults) as Array<keyof DocsChromeVisibility>) {
    const override = docsChrome[key];

    if (typeof override === "boolean") {
      chrome[key] = override;
    }
  }

  return chrome;
};

export const resolveDocsPageShell = (
  relativePath: string,
  frontmatter: DocsPageFrontmatter | undefined,
): ResolvedDocsPageShell => {
  const template = resolveDocsTemplate(relativePath, frontmatter);

  return {
    template,
    chrome: normalizeDocsChrome(template, frontmatter?.docsChrome),
  };
};
