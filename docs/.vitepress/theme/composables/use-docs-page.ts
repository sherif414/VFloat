import { useData } from "vitepress";
import { computed } from "vue";
import { docsShellConfig } from "../config/docs-shell";
import {
  type DocsPageFrontmatter,
  resolveDocsPageShell,
  resolveDocsSectionKey,
} from "../lib/page-shell";

/** Trim non-empty strings and collapse empty values to `undefined`. */
const normalizeString = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;

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

  const pagePathLabel = computed(() =>
    page.value.relativePath
      .replace(/\.md$/, "")
      .split("/")
      .map((segment) => segment.replace(/-/g, "_").toUpperCase())
      .join(" / "),
  );

  return {
    pageShell,
    section,
    pageDescription,
    pagePathLabel,
  };
};
