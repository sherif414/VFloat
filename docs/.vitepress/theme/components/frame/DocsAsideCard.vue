<script setup lang="ts">
import { useDocsPage } from "../../composables/use-docs-page";

const { headingCount, section } = useDocsPage();
</script>

<template>
  <div class="vf-docs-aside-card">
    <p class="vf-docs-aside-card__eyebrow">TECHNICAL SPECS</p>
    <div class="vf-docs-aside-card__metrics">
      <div>
        <span>Section</span>
        <strong>{{ section.title }}</strong>
      </div>
      <div>
        <span>Headings</span>
        <strong>{{ headingCount.toString().padStart(2, "0") }}</strong>
      </div>
    </div>
    <p class="vf-docs-aside-card__copy">
      Use the outline rail to jump between sections without losing your place.
    </p>
  </div>
</template>
