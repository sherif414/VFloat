import { useData, useRoute } from "vitepress";
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { docsShellConfig } from "../config/docs-shell";
import {
  type DocsPageFrontmatter,
  resolveDocsPageShell,
  resolveDocsSectionKey,
} from "../lib/page-shell";

const normalizeString = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;

export const useDocsPage = () => {
  const { frontmatter, page } = useData();
  const route = useRoute();
  const contentLead = ref("");
  const renderedHeadingCount = ref(0);

  const syncRenderedContentMetrics = () => {
    if (typeof document === "undefined") {
      return;
    }

    const firstParagraph = document.querySelector<HTMLElement>(".vp-doc > div > p, .vp-doc > p");
    const headings = document.querySelectorAll(".vp-doc h2, .vp-doc h3, .vp-doc h4");

    contentLead.value = firstParagraph?.innerText.trim() ?? "";
    renderedHeadingCount.value = headings.length;
  };

  const scheduleRenderedContentSync = async () => {
    await nextTick();

    if (typeof window === "undefined") {
      return;
    }

    window.requestAnimationFrame(() => {
      syncRenderedContentMetrics();
    });
  };

  onMounted(() => {
    syncRenderedContentMetrics();
  });

  watch(
    () => route.path,
    async () => {
      await scheduleRenderedContentSync();
    },
    {
      immediate: true,
    },
  );

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
    const renderedLead = normalizeString(contentLead.value);

    return (
      frontmatterDescription ?? pageMetaDescription ?? renderedLead ?? section.value.description
    );
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

  const headingCount = computed(() => {
    const staticHeadingCount = page.value.headers?.length ?? 0;

    return staticHeadingCount > 0 ? staticHeadingCount : renderedHeadingCount.value;
  });

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
