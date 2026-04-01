<script setup lang="ts">
import { useDocsPage } from "../../composables/use-docs-page";

const { headingCount, pagePathLabel, section } = useDocsPage();
</script>

<template>
  <div class="vf-docs-topbar">
    <div class="vf-docs-topbar__inner">
      <div class="vf-docs-topbar__path">
        <span>{{ section.label }}</span>
        <span>{{ pagePathLabel }}</span>
      </div>
      <div class="vf-docs-topbar__meta">
        <span>{{ section.title.toUpperCase() }}</span>
        <span>{{ headingCount.toString().padStart(2, "0") }} HEADINGS</span>
      </div>
    </div>
  </div>
</template>
