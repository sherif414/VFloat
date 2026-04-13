import { useData } from "vitepress";
import { computed } from "vue";

/** The available docs page templates. */
export type DocsTemplate = "docs" | "landing";

/** The docs sections rendered by the shell. */
export type DocsSectionKey = "api" | "guide";

/** Visibility flags for the docs page frame. */
export interface DocsFrameVisibility {
  pageHeader: boolean;
}

/** Section copy and metadata used across the docs shell. */
export interface DocsSectionMeta {
  label: string;
  title: string;
}

/** Shared docs shell metadata for frame visibility and repo links. */
export interface DocsShellConfig {
  repoUrl: string;
  defaultFrame: DocsFrameVisibility;
  sections: Record<DocsSectionKey, DocsSectionMeta>;
}

/** Frontmatter values that affect docs shell behavior. */
export interface DocsPageFrontmatter {
  docsTemplate?: DocsTemplate;
  docsFrame?: Partial<Record<keyof DocsFrameVisibility, unknown>>;
  description?: string;
}

/** The resolved docs shell template and frame visibility. */
export interface ResolvedDocsPageShell {
  template: DocsTemplate;
  frame: DocsFrameVisibility;
}

/** Shared docs shell metadata for frame visibility and repo links. */
export const docsShellConfig = {
  repoUrl: "https://github.com/sherif414/VFloat",
  defaultFrame: {
    pageHeader: true,
  },
  sections: {
    api: {
      label: "API Reference",
      title: "API Reference",
    },
    guide: {
      label: "Guides",
      title: "Guides",
    },
  },
} satisfies DocsShellConfig;

/** Narrow unknown values to plain records. */
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

/** Trim non-empty strings and collapse empty values to `undefined`. */
const normalizeString = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;

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

/** Derive docs page metadata from frontmatter and page path state. */
export const useDocsPage = () => {
  const { frontmatter, page } = useData();

  const pageShell = computed(() =>
    resolveDocsPageShell(frontmatter.value as DocsPageFrontmatter | undefined),
  );
  const section = computed(
    () => docsShellConfig.sections[resolveDocsSectionKey(page.value.relativePath)],
  );
  const pageDescription = computed(() =>
    normalizeString((frontmatter.value as DocsPageFrontmatter | undefined)?.description),
  );

  return {
    pageShell,
    section,
    pageDescription,
  };
};
