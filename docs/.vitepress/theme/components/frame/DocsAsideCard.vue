<script setup lang="ts">
import { useDocsPage } from "../../composables/use-docs-page";

const { headingCount } = useDocsPage();
</script>

<template>
  <div class="vf-docs-aside-card">
    <p class="vf-docs-aside-card__eyebrow">OUTLINE_GRID</p>
    <p class="vf-docs-aside-card__value">{{ headingCount.toString().padStart(2, "0") }}</p>
    <p class="vf-docs-aside-card__copy">Tracked headings in this article.</p>
  </div>
</template>
