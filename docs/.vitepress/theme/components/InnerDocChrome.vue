<script setup lang="ts">
import { useData } from "vitepress";
import { computed } from "vue";

type ChromeVariant = "topbar" | "sidebar" | "page" | "aside";

const props = withDefaults(
  defineProps<{
    variant?: ChromeVariant;
  }>(),
  {
    variant: "page",
  },
);

const repoUrl = "https://github.com/sherif414/VFloat";

const { frontmatter, page } = useData();

const sectionKey = computed(() => (page.value.relativePath.startsWith("api/") ? "api" : "guide"));

const sectionLabel = computed(() =>
  sectionKey.value === "api" ? "API_REFERENCE" : "GUIDE_SYSTEM",
);

const sectionTitle = computed(() => (sectionKey.value === "api" ? "API Reference" : "Guide"));

const sectionDescription = computed(() =>
  sectionKey.value === "api"
    ? "Exact signatures, defaults, and return contracts for the public VFloat surface."
    : "Concepts, recipes, and implementation patterns for anchored interfaces in Vue.",
);

const pageDescription = computed(() => {
  const currentPage = page.value as { description?: string };
  const descriptionValue =
    frontmatter.value.description ??
    (typeof currentPage.description === "string" ? currentPage.description : "");

  if (typeof descriptionValue === "string" && descriptionValue.trim().length > 0) {
    return descriptionValue.trim();
  }

  return sectionDescription.value;
});

const pagePathLabel = computed(() =>
  page.value.relativePath
    .replace(/\.md$/, "")
    .split("/")
    .map((segment) => segment.replace(/-/g, "_").toUpperCase())
    .join(" / "),
);

const headingCount = computed(() => page.value.headers?.length ?? 0);

const sourceHref = computed(() => `${repoUrl}/blob/main/docs/${page.value.relativePath}`);
const editHref = computed(() => `${repoUrl}/edit/main/docs/${page.value.relativePath}`);
</script>

<template>
  <div v-if="props.variant === 'topbar'" class="vf-docs-topbar">
    <div class="vf-docs-topbar__inner">
      <div class="vf-docs-topbar__path">
        <span>{{ sectionLabel }}</span>
        <span>{{ pagePathLabel }}</span>
      </div>
      <div class="vf-docs-topbar__meta">
        <span>{{ sectionTitle.toUpperCase() }}</span>
        <span>{{ headingCount.toString().padStart(2, "0") }} HEADINGS</span>
      </div>
    </div>
  </div>

  <div v-else-if="props.variant === 'sidebar'" class="vf-docs-rail-card">
    <p class="vf-docs-rail-card__eyebrow">{{ sectionLabel }}</p>
    <h2>{{ sectionTitle }}</h2>
    <p>{{ sectionDescription }}</p>
  </div>

  <div v-else-if="props.variant === 'aside'" class="vf-docs-aside-card">
    <p class="vf-docs-aside-card__eyebrow">OUTLINE_GRID</p>
    <p class="vf-docs-aside-card__value">{{ headingCount.toString().padStart(2, "0") }}</p>
    <p class="vf-docs-aside-card__copy">Tracked headings in this article.</p>
  </div>

  <header v-else class="vf-docs-page-head">
    <div class="vf-docs-page-head__grid">
      <div class="vf-docs-page-head__copy">
        <p class="vf-docs-page-head__eyebrow">{{ sectionLabel }}</p>
        <h1>{{ page.title }}</h1>
        <p class="vf-docs-page-head__description">{{ pageDescription }}</p>
      </div>

      <div class="vf-docs-page-head__meta">
        <div class="vf-docs-page-head__stat">
          <span>PATH</span>
          <span>{{ pagePathLabel }}</span>
        </div>
        <div class="vf-docs-page-head__stat">
          <span>HEADINGS</span>
          <span>{{ headingCount.toString().padStart(2, "0") }}</span>
        </div>
        <div class="vf-docs-page-head__actions">
          <a :href="sourceHref" target="_blank" rel="noreferrer">View Source</a>
          <a :href="editHref" target="_blank" rel="noreferrer">Edit Page</a>
        </div>
      </div>
    </div>
  </header>
</template>
