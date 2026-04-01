import { useData } from "vitepress";
import { computed } from "vue";
import { docsShellConfig } from "../config/docs-shell";
import {
  resolveDocsPageShell,
  resolveDocsSectionKey,
  type DocsPageFrontmatter,
} from "../lib/page-shell";

const normalizeString = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;

export const useDocsPage = () => {
  const { frontmatter, page } = useData();

  const pageFrontmatter = computed(() => frontmatter.value as DocsPageFrontmatter | undefined);
  const pageShell = computed(() =>
    resolveDocsPageShell(page.value.relativePath, pageFrontmatter.value),
  );
  const sectionKey = computed(() => resolveDocsSectionKey(page.value.relativePath));
  const section = computed(() => docsShellConfig.sections[sectionKey.value]);

  const pageDescription = computed(() => {
    const frontmatterDescription = normalizeString(pageFrontmatter.value?.description);
    const currentPage = page.value as { description?: string };
    const pageMetaDescription = normalizeString(currentPage.description);

    return frontmatterDescription ?? pageMetaDescription ?? section.value.description;
  });

  const pageEyebrow = computed(
    () => normalizeString(pageFrontmatter.value?.docsEyebrow) ?? section.value.label,
  );

  const pagePathLabel = computed(() =>
    page.value.relativePath
      .replace(/\.md$/, "")
      .split("/")
      .map((segment) => segment.replace(/-/g, "_").toUpperCase())
      .join(" / "),
  );

  const headingCount = computed(() => page.value.headers?.length ?? 0);

  const sourceHref = computed(
    () => `${docsShellConfig.repoUrl}/blob/main/docs/${page.value.relativePath}`,
  );
  const editHref = computed(
    () => `${docsShellConfig.repoUrl}/edit/main/docs/${page.value.relativePath}`,
  );

  return {
    pageFrontmatter,
    pageShell,
    sectionKey,
    section,
    pageDescription,
    pageEyebrow,
    pagePathLabel,
    headingCount,
    sourceHref,
    editHref,
  };
};
