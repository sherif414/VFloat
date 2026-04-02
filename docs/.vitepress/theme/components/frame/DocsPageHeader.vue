<script setup lang="ts">
import { useData } from "vitepress";
import { useDocsPage } from "../../composables/use-docs-page";

const { page } = useData();
const { editHref, headingCount, pageDescription, pageEyebrow, pagePathLabel, section, sourceHref } =
  useDocsPage();
</script>

<template>
  <header class="vf-docs-page-head">
    <div class="vf-docs-page-head__grid">
      <div class="vf-docs-page-head__copy">
        <div class="vf-docs-page-head__badge-row">
          <p class="vf-docs-page-head__eyebrow">{{ pageEyebrow }}</p>
          <span class="vf-docs-page-head__rule" />
        </div>
        <p class="vf-docs-page-head__path">{{ pagePathLabel }}</p>
        <h1>{{ page.title }}</h1>
        <p class="vf-docs-page-head__description">{{ pageDescription }}</p>
      </div>

      <div class="vf-docs-page-head__meta">
        <div class="vf-docs-page-head__stat">
          <span>SECTION</span>
          <span>{{ section.title }}</span>
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
