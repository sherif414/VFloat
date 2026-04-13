<script setup lang="ts">
import { docsShellConfig, useDocsPage } from "../composables/use-docs-page";

const { section } = useDocsPage();
</script>

<template>
  <div class="vf-docs-rail-card">
    <p class="vf-docs-rail-card__eyebrow">Documentation</p>
    <div class="vf-docs-rail-card__system">
      <p>{{ section.label }}</p>
      <span>{{ docsShellConfig.version }}</span>
    </div>
    <h2>{{ section.title }}</h2>
    <p>{{ section.description }}</p>
    <a
      :href="docsShellConfig.repoUrl"
      class="vf-docs-rail-card__link"
      target="_blank"
      rel="noreferrer"
    >
      View repository
    </a>
  </div>
</template>
