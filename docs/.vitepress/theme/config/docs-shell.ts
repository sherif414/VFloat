export type DocsSectionKey = "api" | "guide";

export interface DocsFrameVisibility {
  topbar: boolean;
  sidebarCard: boolean;
  pageHeader: boolean;
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

/** Shared docs shell metadata for frame visibility and repo links. */
export const docsShellConfig = {
  repoUrl: "https://github.com/sherif414/VFloat",
  version: "v0.11.0",
  defaultFrame: {
    topbar: false,
    sidebarCard: false,
    pageHeader: true,
  },
  sections: {
    api: {
      label: "API Reference",
      title: "API Reference",
      description:
        "Exact signatures, defaults, and return contracts for the public VFloat surface.",
    },
    guide: {
      label: "Guides",
      title: "Guides",
      description: "Concepts, recipes, and implementation patterns for anchored interfaces in Vue.",
    },
  },
} satisfies DocsShellConfig;
