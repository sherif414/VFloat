export type DocsSectionKey = "api" | "guide";

export interface DocsFrameVisibility {
  topbar: boolean;
  sidebarCard: boolean;
  pageHeader: boolean;
  asideCard: boolean;
}

export interface DocsSectionMeta {
  label: string;
  title: string;
  description: string;
}

export interface DocsShellConfig {
  repoUrl: string;
  version: string;
  defaultFrame: DocsFrameVisibility;
  sections: Record<DocsSectionKey, DocsSectionMeta>;
}

export const docsShellConfig = {
  repoUrl: "https://github.com/sherif414/VFloat",
  version: "v0.11.0",
  defaultFrame: {
    topbar: true,
    sidebarCard: true,
    pageHeader: true,
    asideCard: true,
  },
  sections: {
    api: {
      label: "API_REFERENCE",
      title: "API Reference",
      description:
        "Exact signatures, defaults, and return contracts for the public VFloat surface.",
    },
    guide: {
      label: "GUIDE_SYSTEM",
      title: "Guide",
      description: "Concepts, recipes, and implementation patterns for anchored interfaces in Vue.",
    },
  },
} satisfies DocsShellConfig;
