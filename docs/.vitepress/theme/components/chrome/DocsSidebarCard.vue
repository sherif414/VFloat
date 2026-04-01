<script setup lang="ts">
import { useDocsPage } from "../../composables/use-docs-page";

const { section } = useDocsPage();
</script>

<template>
  <div class="vf-docs-rail-card">
    <p class="vf-docs-rail-card__eyebrow">{{ section.label }}</p>
    <h2>{{ section.title }}</h2>
    <p>{{ section.description }}</p>
  </div>
</template>
