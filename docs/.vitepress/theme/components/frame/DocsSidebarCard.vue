<script setup lang="ts">
import { useDocsPage } from "../../composables/use-docs-page";
import { docsShellConfig } from "../../config/docs-shell";

const { section } = useDocsPage();
</script>

<template>
  <div class="vf-docs-rail-card">
    <div class="vf-docs-rail-card__system">
      <p>ARCHITECTURE</p>
      <span>SYSTEM_VER_01</span>
    </div>
    <p class="vf-docs-rail-card__eyebrow">{{ section.label }}</p>
    <h2>{{ section.title }}</h2>
    <p>{{ section.description }}</p>
    <a
      :href="docsShellConfig.repoUrl"
      class="vf-docs-rail-card__link"
      target="_blank"
      rel="noreferrer"
    >
      Repository
    </a>
  </div>
</template>
